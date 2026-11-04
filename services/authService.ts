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
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { clearAllLocalData } from "./localStorage";

// ─── Types ───────────────────────────────────────────────────────────────────

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

  return user;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const logOut = async (clearLocal = true): Promise<void> => {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  await signOut(auth);

  if (clearLocal) {
    try {
      if (typeof localStorage !== "undefined") {
        clearAllLocalData();
      }
    } catch (err) {
      // Non-fatal — don't block logout if clearing localStorage fails.
      // Keep a console warning for diagnostics.
      // eslint-disable-next-line no-console
      console.warn("Failed to clear localStorage during logout:", err);
    }
  }
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

  // Write household doc and link user → household atomically so that the
  // user is never left in an inconsistent admin state if either write fails.
  const batch = writeBatch(db);
  batch.set(doc(db, "households", householdId), household);
  batch.set(doc(db, "users", uid), { uid, householdId, role: "admin" }, { merge: true });
  await batch.commit();

  // Separate write: the invite rule checks membership, which only holds
  // once the batch above has committed.
  await publishInvite(householdId);

  return household;
};

export const joinHousehold = async (
  uid: string,
  inviteCode: string
): Promise<HouseholdInfo> => {
  if (!db) throw new Error("Firebase is not configured.");

  // Resolve the code through invites/{CODE}: households are not readable
  // before joining, so querying them by inviteCode is denied by rules.
  const normalized = inviteCode.trim().toUpperCase();
  const inviteSnap = await getDoc(doc(db, "invites", normalized));
  const householdId = inviteSnap.data()?.householdId;

  if (typeof householdId !== "string") {
    throw new Error("Invalid invite code. Please check and try again.");
  }

  // Link user → household (merge so it works even if the doc was never created).
  // The code travels as joinCode so the rules can check it against the household.
  await setDoc(doc(db, "users", uid), {
    uid,
    householdId,
    role: "member",
    joinCode: normalized,
  }, { merge: true });

  const household = await getHouseholdInfo(householdId);
  if (!household) throw new Error("Household not found.");
  return household;
};

/**
 * Publishes the invites/{CODE} → { householdId } lookup that joining users
 * resolve. Best-effort, like the backfill in our-menu and smart-grocery: a
 * failure only postpones it to the next sign-in.
 */
export const publishInvite = async (householdId: string): Promise<void> => {
  if (!db) return;
  try {
    const household = await getHouseholdInfo(householdId);
    if (!household?.inviteCode) return;
    await setDoc(doc(db, "invites", household.inviteCode), { householdId });
  } catch (error) {
    console.warn("⚠️ Invite publish failed:", error);
  }
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
