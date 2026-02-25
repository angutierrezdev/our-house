# Auth + Multi-Tenancy Implementation TODO

## Overview

**Auth is optional and additive — the app always works offline-first via localStorage.**

The user can open and use the app without ever signing in. Authentication is an opt-in upgrade that unlocks cloud sync across devices and household sharing. When the user signs in and sets up (or joins) a household, the existing `syncLocalDataToFirebase` mechanism uploads local data, and data subscriptions switch from localStorage to Firestore.

```
No auth          → localStorage only (existing behaviour, unchanged)
Auth + household → localStorage as cache + Firestore as source of truth
```

**New data model (only active when authenticated):**
```
/users/{uid}                          ← stores which household the user belongs to
/households/{householdId}             ← household metadata + invite code
/households/{householdId}/people/...  ← was /people/...
/households/{householdId}/chores/...  ← was /chores/...
```

**Auth flow (non-blocking):**
```
App loads → show app immediately (localStorage)
              └─ (user can view/edit tasks offline without signing in)
              ├─ user taps Settings → sees "Sign in to sync" AuthPanel
              │     └─ signs in / creates account
              │           └─ no household yet? → HouseholdSetup sheet appears
              │                 └─ creates or joins household
              │                       └─ householdId resolved
              │                             └─ syncLocalDataToFirebase()
              │                                   └─ local tasks (from localStorage) uploaded to Firestore
              │                                         └─ subscriptions restart, scoped to /households/{hid}
              │
              └─ (alternative) already authenticated with household on return
                    └─ subscriptions auto-scope to Firestore paths
                          └─ offline edits synced when online
```

**Key constraint:** Households can only be created or joined by an authenticated user. Offline users can accumulate tasks in localStorage; once they sign in, the sync mechanism uploads those tasks to the household.


---

## 1. Firebase Console

- [ ] Enable **Authentication** in the Firebase Console
  - Enable **Email/Password** provider (minimum)
  - Optionally enable **Google** sign-in provider
- [ ] Deploy updated Firestore Security Rules (see Section 7)

---

## 2. Install Dependencies

```bash
# Firebase Auth and Functions are already included in the firebase package — no new installs needed
# Optionally add a hook library for convenience:
npm install react-firebase-hooks

# Install Cloud Functions dependencies (in the functions/ subdirectory):
cd functions && npm install
```

---

## 3. `firebase.ts` — Export `auth` and `functions`

**File:** [`firebase.ts`](firebase.ts)

Add Auth and Functions exports alongside the existing `db` export:

```ts
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

export const auth = app ? getAuth(app) : null;
export const functions = app ? getFunctions(app) : null;
```

---

## 4. `services/settingsService.ts` — Remove `householdId` from local settings

**File:** [`services/settingsService.ts`](services/settingsService.ts)

`householdId` will now live in Firestore at `/users/{uid}` instead of `localStorage`.  
No schema changes needed here — `AppSettings` stays as-is.  
Remove any future `householdId` field if it was temporarily added.

---

## 5. New File: `services/authService.ts`

Create [`services/authService.ts`](services/authService.ts) to centralize all auth + household logic:

```ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../firebase";

export interface UserProfile {
  uid: string;
  email: string;
  householdId: string | null;
  role: "admin" | "member";
}

export interface HouseholdInfo {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: number;
}

/** Sign up a new user (does NOT create a household yet) */
export const signUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth!, email, password);

/** Sign in existing user */
export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth!, email, password);

/** Sign out */
export const logOut = () => signOut(auth!);

/** Fetch user profile from Firestore */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db!, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

/** Create a brand new household; sets the caller as admin */
const generateInviteCode = (length: number = 16): string => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
};

export const createHousehold = async (uid: string, email: string, householdName: string) => {
  const householdId = crypto.randomUUID();
  const inviteCode = generateInviteCode(16);

  await setDoc(doc(db!, "households", householdId), {
    name: householdName,
    createdBy: uid,
    inviteCode,
    createdAt: Date.now()
  });

  await setDoc(doc(db!, "users", uid), {
    uid,
    email,
    householdId,
    role: "admin"
  });

  return householdId;
};

/**
 * Join an existing household via invite code.
 *
 * Delegates to the `joinHousehold` Cloud Function so that `role` and
 * `householdId` are written by trusted server-side code (Admin SDK).
 */
export const joinHousehold = async (inviteCode: string): Promise<HouseholdInfo> => {
  const fn = httpsCallable<{ inviteCode: string }, HouseholdInfo>(functions!, "joinHousehold");
  const result = await fn({ inviteCode });
  return result.data;
};

/** Subscribe to auth state changes */
export const subscribeToAuthState = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth!, callback);
```

---

## 5a. New File: `functions/src/index.ts` — Cloud Functions for Household Management

> **Why Cloud Functions?** The Firestore security rules block client writes to `role`
> and `householdId` on `/users/{uid}`. Household creation and joining must therefore
> happen on the server, where the Firebase Admin SDK bypasses those rules and the caller
> identity (`request.auth.uid`) can be trusted absolutely.

Create [`functions/src/index.ts`](../functions/src/index.ts):

```ts
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

/** Creates a household and sets the caller as admin. */
export const createHousehold = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }
  const { name } = request.data as { name: string };
  const uid = request.auth.uid;
  const householdId = db.collection("households").doc().id;
  const inviteCode = /* generate 6-char alphanumeric code */ "...";

  const household = { id: householdId, name, inviteCode, createdBy: uid, createdAt: Date.now() };

  const batch = db.batch();
  batch.set(db.collection("households").doc(householdId), household);
  // Admin SDK write — bypasses Firestore rules, so role/householdId can be set safely.
  batch.set(db.collection("users").doc(uid), { uid, householdId, role: "admin" }, { merge: true });
  await batch.commit();

  return household;
});

/** Joins a household by invite code and sets the caller as member. */
export const joinHousehold = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }
  const { inviteCode } = request.data as { inviteCode: string };
  const uid = request.auth.uid;

  const snap = await db.collection("households")
    .where("inviteCode", "==", inviteCode.trim().toUpperCase())
    .limit(1)
    .get();

  if (snap.empty) {
    throw new functions.https.HttpsError("not-found", "Invalid invite code.");
  }

  const householdDoc = snap.docs[0];
  const household = { id: householdDoc.id, ...householdDoc.data() };

  // Admin SDK write — role is always "member" regardless of what the client sends.
  await db.collection("users").doc(uid)
    .set({ uid, householdId: household.id, role: "member" }, { merge: true });

  return household;
});
```

Deploy with:

```bash
cd functions && npm install
firebase deploy --only functions
```

---

## 6. New File: `contexts/AuthContext.tsx`

Create [`contexts/AuthContext.tsx`](contexts/AuthContext.tsx) to provide auth state app-wide.

**Key difference from the previous plan:** `loading` never blocks the app from rendering. The app always shows immediately; auth state resolves in the background.

```tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { User } from "firebase/auth";
import { subscribeToAuthState, getUserProfile, UserProfile } from "../services/authService";
import { isFirebaseConfigured, db } from "../firebase";
import { setHouseholdId, syncLocalDataToFirebase } from "../services/dataService";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  householdId: string | null;
  authLoading: boolean; // true only while the initial Firebase auth check is in flight
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  householdId: null,
  authLoading: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const didSync = useRef(false); // guard: only sync once per session

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    return subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const p = await getUserProfile(firebaseUser.uid);
        setProfile(p);

        // When a household becomes available for the first time this session,
        // sync local data up and switch subscriptions to Firestore.
        if (p?.householdId && !didSync.current) {
          didSync.current = true;
          setHouseholdId(p.householdId);           // tells dataService which path to use
          await syncLocalDataToFirebase(db!);       // reuses existing sync logic
          // Data subscriptions in Dashboard/PeopleManager will restart automatically
          // because householdId is now non-null (see Section 9g).
        }
      } else {
        setProfile(null);
        didSync.current = false;
      }
      setAuthLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      householdId: profile?.householdId ?? null,
      authLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

---

## 7. New Components: `AuthPanel.tsx` and `HouseholdSetupSheet.tsx`

Because auth is now optional and the app is always accessible, these are **UI panels shown inside Settings**, not full-screen route guards.

### `components/AuthPanel.tsx`
- Rendered inside `Settings.tsx` when `user === null`
- Email + password sign-in form with toggle to "Create Account"
- Compact design — fits in the settings card
- On success: `AuthContext` updates, panel is replaced by household info

### `components/HouseholdSetupSheet.tsx`
- Rendered inside `Settings.tsx` when `user !== null && householdId === null`
- Two options:
  - **Create Household**: input for household name → calls `createHousehold()` → triggers sync
  - **Join Household**: input for invite code → calls `joinHousehold()` → triggers sync
- On success: `AuthContext` updates, panel is replaced by household info
- Optionally: can also be a bottom-sheet modal triggered from a banner in the app header

**Important constraint:** This sheet only appears **after** the user has authenticated. Household creation/joining requires Firestore access, which necessitates a signed-in user. Any tasks created offline will be synced to the user's household once they sign in and set one up (or join an existing one).

---

## 8. `App.tsx` — Wrap with `AuthProvider` (no route guards)

**File:** [`App.tsx`](App.tsx)

The only change here is wrapping with `AuthProvider`. No auth guards, no redirects — the app always renders regardless of auth state.

```tsx
import { AuthProvider } from "./contexts/AuthContext";

// App is unchanged structurally — just add the provider wrapper
const App: React.FC = () => (
  <AuthProvider>
    <SplashScreen ... />
    <PWAUpdate />
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path={ROUTES.KANBAN} element={<KanbanBoard />} />
          <Route path={ROUTES.PEOPLE} element={<PeopleManager />} />
          <Route path={ROUTES.SETTINGS} element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </AuthProvider>
);
```

### Optional: sync nudge banner in `Layout.tsx`

If Firebase is configured but the user is not signed in, show a small dismissible banner in the header:

```tsx
// Inside Layout.tsx, read auth state:
const { user, householdId } = useAuth();

// Show banner if Firebase is configured, user is offline-only:
{isFirebaseConfigured && !user && (
  <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-700 flex justify-between">
    <span>☁ Sign in to sync across devices</span>
    <button onClick={() => navigate(ROUTES.SETTINGS)} className="font-semibold underline">Settings →</button>
  </div>
)}
```

---

## 9. `services/dataService.ts` — Scope All Collection Paths

**File:** [`services/dataService.ts`](services/dataService.ts)

This is the most mechanical change. Every `collection()` and `doc()` call needs the household prefix.

### 9a. Add a helper at the top of the file

```ts
import { getAuth } from "firebase/auth";
import { getDoc, doc as fsDoc } from "firebase/firestore";

let _householdId: string | null = null;

/** Call this once after auth resolves, before any data operations */
export const setHouseholdId = (id: string) => {
  _householdId = id;
};

const getHouseholdId = (): string => {
  if (!_householdId) throw new Error("householdId not set — user not authenticated");
  return _householdId;
};
```

### 9b. Update `syncLocalDataToFirebase`

```ts
// Before
const docRef = doc(targetDb, op.collection, op.id);

// After
const docRef = doc(targetDb, `households/${householdId}/${op.collection}`, op.id);
// Pass householdId as a parameter to this function
```

### 9c. Update `subscribeToPeople`

```ts
// Before
const q = query(collection(db, "people"));

// After
const q = query(collection(db, `households/${getHouseholdId()}/people`));
```

### 9d. Update `addPerson` / `deletePerson`

```ts
// Before
await setDoc(doc(db, "people", id), newPerson);
await deleteDoc(doc(db, "people", id));

// After
const hid = getHouseholdId();
await setDoc(doc(db, `households/${hid}/people`, id), newPerson);
await deleteDoc(doc(db, `households/${hid}/people`, id));
```

### 9e. Update `subscribeToChores`

```ts
// Before
const q = query(collection(db, "chores"));

// After
const q = query(collection(db, `households/${getHouseholdId()}/chores`));
```

### 9f. Update `addChore`, `updateChore`, `deleteChore`

```ts
// Before
await setDoc(doc(db, "chores", id), newChore);
await updateDoc(doc(db, "chores", id), cleanedUpdates);
await deleteDoc(doc(db, "chores", id));

// After
const hid = getHouseholdId();
await setDoc(doc(db, `households/${hid}/chores`, id), newChore);
await updateDoc(doc(db, `households/${hid}/chores`, id), cleanedUpdates);
await deleteDoc(doc(db, `households/${hid}/chores`, id));
```

### 9g. Wire up `setHouseholdId` + restart subscriptions

`setHouseholdId` is already called from `AuthContext` (see Section 6). On the **component side**, subscriptions need to restart when `householdId` transitions from `null` to a value.

In each component that subscribes (`Dashboard.tsx`, `PeopleManager.tsx`, `KanbanBoard.tsx`), add `householdId` to the `useEffect` dependency array:

```ts
const { householdId } = useAuth();

useEffect(() => {
  // This now re-runs when householdId first becomes available.
  // The subscribe functions will use getHouseholdId() internally.
  const unsubChores = subscribeToChores(setChores);
  const unsubPeople = subscribeToPeople(setPeople);
  return () => { unsubChores(); unsubPeople(); };
}, [householdId]); // ← key change
```

When `householdId` changes from `null` → `"abc-123"`:
1. React tears down the old localStorage-based subscriptions
2. Re-runs the effect — now `getHouseholdId()` returns the real id
3. New `onSnapshot` listeners attach to `/households/abc-123/chores` etc.
4. `syncLocalDataToFirebase` (called in `AuthContext`) has already uploaded local data by this point

### 9h. Graceful fallback when `householdId` is null

Change `getHouseholdId()` to return `null` instead of throwing, and have the subscribe functions fall back to localStorage when it's null:

```ts
const getHouseholdId = (): string | null => _householdId;

// In subscribeToPeople / subscribeToChores:
const hid = getHouseholdId();
if (isFirebaseConfigured && db && hid) {
  // Firestore scoped subscription
} else {
  // localStorage subscription (existing behaviour)
}
```

---

## 10. `pages/Settings.tsx` — Add auth section (keep existing Firebase config)

**File:** [`pages/Settings.tsx`](pages/Settings.tsx)

The existing Firebase config form (`apiKey`, `projectId`, etc.) **stays unchanged** — users still enter their own Firebase project credentials to enable the feature. Auth is layered on top of that.

- [ ] Add a new **"Sync & Account"** section, placed above the existing Firebase config block
- [ ] **When `user === null`**: render `<AuthPanel />` — inline sign-in/sign-up form
- [ ] **When `user !== null && householdId === null`**: render `<HouseholdSetupSheet />` — create or join a household
- [ ] **When `user !== null && householdId !== null`**: show household info card:
  - Household name
  - Invite code with **Copy** button (admin only)
  - Signed-in email + role badge
  - **Sign Out** button using `logOut()` from `authService.ts`
- [ ] The existing Firebase config form remains for entering/changing the Firebase project — no need to remove it

**Important:** `HouseholdSetupSheet` only appears after `user !== null`. An offline user cannot create or join a household until they authenticate, but they can continue viewing/editing their local tasks without interruption.

---

## 11. Firestore Security Rules

> **Security note:** The `/users/{uid}` rules deliberately block client writes to `role`
> and `householdId`. Those fields are managed exclusively by the `createHousehold` and
> `joinHousehold` Cloud Functions (Admin SDK), which bypass Firestore rules entirely.
> This prevents a malicious client from self-elevating to `admin` or pointing their
> `householdId` at an arbitrary household.

The rules below live in [`firestore.rules`](../firestore.rules) and are deployed via
`firebase deploy --only firestore:rules` (or automatically when you run `firebase deploy`).

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /{document=**} {
      allow read, write: if false;
    }

    match /users/{uid} {
      // Users can read their own profile.
      allow read: if request.auth != null && request.auth.uid == uid;

      // Initial profile creation (sign-up / Google sign-in):
      // only allowed with role='member' and householdId=null.
      allow create: if request.auth != null
                    && request.auth.uid == uid
                    && request.resource.data.role == 'member'
                    && request.resource.data.householdId == null;

      // Client-side updates may not touch role or householdId.
      // Household assignment and role changes go through Cloud Functions only.
      allow update: if request.auth != null
                    && request.auth.uid == uid
                    && !request.resource.data.diff(resource.data)
                        .affectedKeys().hasAny(['role', 'householdId']);
    }

    match /households/{householdId} {
      allow read: if isMember(householdId);
      allow create: if request.auth != null
                    && request.resource.data.createdBy == request.auth.uid;
      allow update, delete: if isAdmin(householdId);
    }

    match /households/{householdId}/people/{personId} {
      allow read: if isMember(householdId);
      allow create: if isMember(householdId) && isValidPerson(request.resource.data);
      allow update: if isMember(householdId)
                    && isValidPerson(request.resource.data)
                    && request.resource.data.id == resource.data.id;
      allow delete: if isMember(householdId);
    }

    match /households/{householdId}/chores/{choreId} {
      allow read: if isMember(householdId);
      allow create: if isMember(householdId) && isValidChore(request.resource.data);
      allow update: if isMember(householdId)
                    && isValidChore(request.resource.data)
                    && request.resource.data.id == resource.data.id;
      allow delete: if isMember(householdId);
    }

    function isMember(householdId) {
      return request.auth != null
          && get(/databases/$(database)/documents/users/$(request.auth.uid))
               .data.householdId == householdId;
    }

    function isAdmin(householdId) {
      return isMember(householdId)
          && get(/databases/$(database)/documents/users/$(request.auth.uid))
               .data.role == 'admin';
    }

    function isValidPerson(data) {
      return data.keys().hasAll(['id', 'name'])
          && data.id is string
          && data.name is string;
    }

    function isValidChore(data) {
      return data.keys().hasAll(['id', 'title'])
          && data.id is string
          && data.title is string;
    }
  }
}
```

---

## 12. Data Migration (Existing Data)

If there is already live data in the flat `/people` and `/chores` collections:

- [ ] Write a one-time migration script (Node.js) that:
  1. Reads all documents from `/people` and `/chores`
  2. Writes them to `/households/{householdId}/people` and `/households/{householdId}/chores`
  3. Deletes the old flat documents
- [ ] Run the script before deploying the new app version
- [ ] Alternatively, handle this in `syncLocalDataToFirebase` during the first login

---

## 13. Testing Checklist

### Offline-first (must always work)
- [ ] App loads and is fully usable with no Firebase config at all
- [ ] App loads and is fully usable when Firebase is configured but user is **not** signed in
- [ ] Adding, editing, completing, and deleting chores works offline (localStorage only)
- [ ] Refreshing the page retains all data when offline

### Auth flow
- [ ] "Sign in to sync" banner appears in the header when Firebase is configured + user is not signed in
- [ ] Tapping the banner navigates to Settings
- [ ] New user can create an account from the Settings auth panel
- [ ] Existing user can sign in from the Settings auth panel
- [ ] Sign-in error message appears for wrong credentials
- [ ] After sign-in, if no household: `HouseholdSetupSheet` appears in Settings
- [ ] User can create a household (admin role)
- [ ] Second user can join via invite code (member role)

### Sync on auth
- [ ] After household is set up, **local tasks are uploaded** to Firestore (`syncLocalDataToFirebase` runs)
- [ ] After sync, Dashboard shows the same chores that were in localStorage
- [ ] No duplicate chores after sync (merge strategy works)
- [ ] Data subscriptions switch to Firestore paths automatically (no page reload needed)

### Multi-device / multi-user
- [ ] User A (admin) and User B (member) see the same chores in real-time
- [ ] User A adding a chore appears for User B without refresh
- [ ] Completing a chore on one device reflects on the other

### Security
- [ ] Unauthenticated Firestore requests are rejected by security rules
- [ ] A user cannot read another household's data
- [ ] Invite code from household A cannot grant access to household B's data

### Sign out
- [ ] Sign out returns to the "not signed in" state in Settings
- [ ] App continues to work with localStorage after sign-out
- [ ] `syncLocalDataToFirebase` is **not** called again until next sign-in

### Offline → Auth → Household (key constraint validation)
- [ ] User creates chores while offline (localStorage only)
- [ ] User goes to Settings and signs in (AuthPanel)
- [ ] After sign-in, `HouseholdSetupSheet` appears (because `householdId` is null)
- [ ] User creates a household (or joins one via invite code)
- [ ] **`syncLocalDataToFirebase` is called automatically** — all offline chores appear in Firestore under the household
- [ ] Dashboard shows the same chores (now sourced from Firestore, not localStorage)
- [ ] No chores are lost or duplicated in the process
- [ ] Cannot see `HouseholdSetupSheet` while offline (it only appears after auth succeeds)

---

## File Change Summary

| File | Type | Change |
|------|------|--------|
| [`firebase.ts`](../firebase.ts) | Edit | Export `auth` and `functions` |
| [`services/authService.ts`](../services/authService.ts) | **New** | All auth + household CRUD; `createHousehold`/`joinHousehold` delegate to Cloud Functions |
| [`functions/src/index.ts`](../functions/src/index.ts) | **New** | `createHousehold` and `joinHousehold` Cloud Functions (Admin SDK writes for role/householdId) |
| [`functions/package.json`](../functions/package.json) | **New** | Cloud Functions dependencies (`firebase-admin`, `firebase-functions`) |
| [`functions/tsconfig.json`](../functions/tsconfig.json) | **New** | TypeScript config for Cloud Functions |
| [`firestore.rules`](../firestore.rules) | **New** | Tightened rules: `/users/{uid}` blocks client writes to `role` and `householdId` |
| [`firebase.json`](../firebase.json) | **New** | Firebase project config pointing to `functions/` and `firestore.rules` |
| [`contexts/AuthContext.tsx`](../contexts/AuthContext.tsx) | **New** | Auth state provider + `useAuth()` hook; triggers sync on household resolve |
| [`components/AuthPanel.tsx`](../components/AuthPanel.tsx) | **New** | Inline sign-in/sign-up form (used inside Settings) |
| [`components/HouseholdSetupSheet.tsx`](../components/HouseholdSetupSheet.tsx) | **New** | Create or join a household (used inside Settings) |
| [`services/dataService.ts`](../services/dataService.ts) | Edit | Add `setHouseholdId`, scope 6 collection paths, fallback to localStorage when `householdId` is null |
| [`App.tsx`](../App.tsx) | Edit | Wrap with `AuthProvider` only — no route guards |
| [`components/Layout.tsx`](../components/Layout.tsx) | Edit | Add optional "Sign in to sync" banner when not authenticated |
| [`pages/Settings.tsx`](../pages/Settings.tsx) | Edit | Add Sync & Account section with `AuthPanel` / `HouseholdSetupSheet` / household info; keep existing Firebase config form |
| [`pages/Dashboard.tsx`](../pages/Dashboard.tsx) | Edit | Add `householdId` to `useEffect` deps to restart subscriptions on auth |
| [`pages/KanbanBoard.tsx`](../pages/KanbanBoard.tsx) | Edit | Add `householdId` to `useEffect` deps |
| [`pages/PeopleManager.tsx`](../pages/PeopleManager.tsx) | Edit | Add `householdId` to `useEffect` deps |
| Firebase Console | Config | Enable Auth (Email/Password), deploy new Security Rules |
| Migration script | **New** | One-time flat → scoped collection migration (only needed if existing Firestore data exists) |
