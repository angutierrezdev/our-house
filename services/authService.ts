import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { getLocalPeople, getLocalChores } from "./localStorage";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  householdId: string | null;
  role: "admin" | "member";
  migratedAt?: number;
}

export interface HouseholdInfo {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateInviteCode = (): string => {
  const length = 6;
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // Prefer cryptographically strong random values when available
  const cryptoObj = typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const randomValues = new Uint32Array(length);
    cryptoObj.getRandomValues(randomValues);
    let code = "";
    for (let i = 0; i < length; i++) {
      const index = randomValues[i] % charset.length;
      code += charset.charAt(index);
    }
    return code;
  }

  // Fallback to Math.random() if crypto is not available
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signUp = async (email: string, password: string): Promise<User> => {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // Create empty user profile
  if (db) {
    // Create empty user profile using a batch to ensure the write is atomic on Firestore
    const batch = writeBatch(db!);
    const userRef = doc(db!, "users", user.uid);
    batch.set(userRef, {
      uid: user.uid,
      email,
      householdId: null,
      role: "member",
    });
    await batch.commit();
  }

  return user;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const logOut = async (): Promise<void> => {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  await signOut(auth);
};

export const signInWithGoogle = async (): Promise<User> => {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const provider = new GoogleAuthProvider();
  const { user } = await signInWithPopup(auth, provider);

  // Create user profile doc on first Google sign-in (upsert — safe to call every time)
  if (db) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email ?? "",
        householdId: null,
        role: "member",
      });
    }
  }

  return user;
};

export const subscribeToAuthState = (
  callback: (user: User | null) => void
): (() => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

export const subscribeToUserProfile = (
  uid: string,
  callback: (profile: UserProfile | null) => void
): (() => void) => {
  if (!db) {
    callback(null);
    return () => {};
  }
  return onSnapshot(doc(db, "users", uid), (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null);
  });
};

// ─── Migration ───────────────────────────────────────────────────────────────
// One-time migration: copies flat /people and /chores docs into the
// new household-scoped subcollections. Safe to call multiple times — it
// is guarded by the `migratedAt` timestamp written to the user profile.

const migrateExistingDataToHousehold = async (
  uid: string,
  householdId: string
): Promise<void> => {
  if (!db) return;

  // Guard: skip if already migrated
  const userSnap = await getDoc(doc(db, "users", uid));
  if (userSnap.data()?.migratedAt) return;

  // Only run for users who have pre-existing local data. New users will have
  // nothing in localStorage and should skip migration entirely.
  const localPeople = getLocalPeople();
  const localChores = getLocalChores();

  if (localPeople.length === 0 && localChores.length === 0) {
    // No pre-existing data — mark done and skip
    await setDoc(doc(db, "users", uid), { migratedAt: Date.now() }, { merge: true });
    return;
  }

  // Batch in chunks of 500 (Firestore limit)
  const BATCH_SIZE = 400;
  const ops: Array<{ path: string; id: string; data: Record<string, unknown> }> = [];

  localPeople.forEach((p) =>
    ops.push({ path: `households/${householdId}/people`, id: p.id, data: p as unknown as Record<string, unknown> })
  );
  localChores.forEach((c) =>
    ops.push({ path: `households/${householdId}/chores`, id: c.id, data: c as unknown as Record<string, unknown> })
  );

  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_SIZE).forEach((op) => {
      batch.set(doc(collection(db!, op.path), op.id), op.data, { merge: true });
    });
    await batch.commit();
  }

  // Mark migration complete
  await setDoc(doc(db, "users", uid), { migratedAt: Date.now() }, { merge: true });
  console.log(
    `✅ Migrated ${localPeople.length} people + ${localChores.length} chores → households/${householdId}`
  );
};

// ─── Household ────────────────────────────────────────────────────────────────

export const createHousehold = async (
  uid: string,
  name: string
): Promise<HouseholdInfo> => {
  if (!db) throw new Error("Firebase is not configured.");

  const householdId = crypto.randomUUID();
  const inviteCode = generateInviteCode();
  const now = Date.now();

  const household: HouseholdInfo = {
    id: householdId,
    name,
    inviteCode,
    createdBy: uid,
    createdAt: now,
  };

  // Write household doc
  await setDoc(doc(db, "households", householdId), household);

  // Link user → household (merge so it works even if the doc was never created)
  await setDoc(doc(db, "users", uid), {
    uid,
    householdId,
    role: "admin",
  }, { merge: true });

  // Run migration (existing flat Firestore data → scoped subcollections)
  await migrateExistingDataToHousehold(uid, householdId);

  return household;
};

export const joinHousehold = async (
  uid: string,
  inviteCode: string
): Promise<HouseholdInfo> => {
  if (!db) throw new Error("Firebase is not configured.");

  // Find household by invite code
  const q = query(
    collection(db, "households"),
    where("inviteCode", "==", inviteCode.toUpperCase())
  );
  const householdsSnap = await getDocs(q);
  const match = householdsSnap.docs[0];

  if (!match) throw new Error("Invalid invite code. Please check and try again.");

  const household = { id: match.id, ...match.data() } as HouseholdInfo;

  // Link user → household (merge so it works even if the doc was never created)
  await setDoc(doc(db, "users", uid), {
    uid,
    householdId: household.id,
    role: "member",
  }, { merge: true });

  // Run migration for existing user data now that they have joined a household
  await migrateExistingDataToHousehold(uid, household.id);
  return household;
};

export const getHouseholdInfo = async (
  householdId: string
): Promise<HouseholdInfo | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, "households", householdId));
  return snap.exists()
    ? ({ id: snap.id, ...snap.data() } as HouseholdInfo)
    : null;
};
