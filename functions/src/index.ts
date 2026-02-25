import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INVITE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateInviteCode = (): string => {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_CHARSET.charAt(Math.floor(Math.random() * INVITE_CHARSET.length));
  }
  return code;
};

// ─── createHousehold ─────────────────────────────────────────────────────────
// Creates a new household and sets the caller as admin.
// Writing role="admin" and householdId from the server prevents clients from
// self-elevating privileges via direct Firestore writes.

export const createHousehold = functions.https.onCall(
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }

    const { name } = request.data as { name: string };
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new functions.https.HttpsError("invalid-argument", "Household name is required.");
    }

    const uid = request.auth.uid;
    const householdId = db.collection("households").doc().id;
    const inviteCode = generateInviteCode();
    const now = Date.now();

    const household = {
      id: householdId,
      name: name.trim(),
      inviteCode,
      createdBy: uid,
      createdAt: now,
    };

    // Use a batch so both writes succeed or both fail atomically.
    const batch = db.batch();
    batch.set(db.collection("households").doc(householdId), household);
    batch.set(
      db.collection("users").doc(uid),
      { uid, householdId, role: "admin" },
      { merge: true }
    );
    await batch.commit();

    return household;
  }
);

// ─── joinHousehold ────────────────────────────────────────────────────────────
// Joins an existing household via invite code and sets the caller as member.
// Writing role="member" and householdId from the server ensures clients cannot
// choose an arbitrary householdId or self-assign a different role.

export const joinHousehold = functions.https.onCall(
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }

    const { inviteCode } = request.data as { inviteCode: string };
    if (!inviteCode || typeof inviteCode !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Invite code is required.");
    }

    const uid = request.auth.uid;

    // Look up the household by invite code.
    const snap = await db
      .collection("households")
      .where("inviteCode", "==", inviteCode.trim().toUpperCase())
      .limit(1)
      .get();

    if (snap.empty) {
      throw new functions.https.HttpsError("not-found", "Invalid invite code. Please check and try again.");
    }

    const householdDoc = snap.docs[0];
    const household = { id: householdDoc.id, ...householdDoc.data() } as {
      id: string;
      name: string;
      inviteCode: string;
      createdBy: string;
      createdAt: number;
    };

    // Link user → household as member.
    await db
      .collection("users")
      .doc(uid)
      .set({ uid, householdId: household.id, role: "member" }, { merge: true });

    return household;
  }
);
