import { 
  collection, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  getDocs,
  writeBatch
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { getLocalChores, saveLocalChores, getLocalPeople, saveLocalPeople } from "./localStorage";
import { Chore, Person, ChoreFrequency, ChoreStatus, ChorePriority, ChoreDifficulty } from "../types";
import { addWeeks, addMonths, addDays, addYears } from "date-fns";
import { PRIORITY_WEIGHTS } from "../constants";

// Listeners type
type Unsubscribe = () => void;

// --- Household Scoping ---
// Set by AuthContext once a user is authenticated and has a household.
// When null, all reads/writes fall back to localStorage only.
let _householdId: string | null = null;

export const setHouseholdId = (id: string | null): void => {
  _householdId = id;
};

export const getHouseholdId = (): string | null => _householdId;

/** Returns 'households/{hid}/{name}' and disallows flat collections when no household is set */
const colPath = (name: "people" | "chores"): string => {
  if (!_householdId) {
    throw new Error("Household ID is required for Firestore operations.");
  }
  return `households/${_householdId}/${name}`;
};

// --- Local Change Notification System ---
// Simple pub-sub to notify subscribers when localStorage changes occur

type LocalChangeCallback = () => void;

const choreListeners = new Set<LocalChangeCallback>();
const peopleListeners = new Set<LocalChangeCallback>();

const notifyChoreListeners = () => {
  choreListeners.forEach(callback => callback());
};

const notifyPeopleListeners = () => {
  peopleListeners.forEach(callback => callback());
};

// --- Offline/Online Detection and Sync ---
let isOnline = navigator.onLine;
let pendingSync = false;

const checkAndSync = async () => {
  if (isFirebaseConfigured && db && isOnline && !pendingSync) {
    pendingSync = true;
    try {
      await syncLocalDataToFirebase(db);
      console.log('✅ Successfully synced local data to Firebase');
    } catch (error) {
      console.error('❌ Failed to sync local data to Firebase:', error);
    } finally {
      pendingSync = false;
    }
  }
};

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log('🟢 Network connection restored');
  isOnline = true;
  checkAndSync();
});

window.addEventListener('offline', () => {
  console.log('🔴 Network connection lost');
  isOnline = false;
});

// --- Helper Functions ---

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const sortChores = (chores: Chore[]): Chore[] => {
  return chores.sort((a, b) => {
    const weightA = PRIORITY_WEIGHTS[a.priority] ?? 99;
    const weightB = PRIORITY_WEIGHTS[b.priority] ?? 99;
    
    if (weightA !== weightB) {
      return weightA - weightB;
    }

    if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
    if (a.dueDate) return -1; 
    if (b.dueDate) return 1;
    
    return 0;
  });
};

/**
 * Migrates local data to Firebase. Used when first connecting or syncing after offline.
 */
export const syncLocalDataToFirebase = async (targetDb: any) => {
  if (!targetDb) return;

  const localPeople = getLocalPeople();
  const localChores = getLocalChores();

  // Use batch writes for efficiency (max 500 operations per batch)
  const BATCH_SIZE = 500;
  const allOperations = [
    ...localPeople.map(person => ({ collection: colPath('people'), id: person.id, data: person })),
    ...localChores.map(chore => ({ collection: colPath('chores'), id: chore.id, data: chore }))
  ];

  for (let i = 0; i < allOperations.length; i += BATCH_SIZE) {
    const batch = writeBatch(targetDb);
    const batchOps = allOperations.slice(i, i + BATCH_SIZE);
    
    batchOps.forEach(op => {
      const docRef = doc(targetDb, op.collection, op.id);
      batch.set(docRef, op.data, { merge: true }); // Use merge to avoid overwriting server changes
    });

    await batch.commit();
  }
};

// Initialize sync check when the module loads
if (isFirebaseConfigured && db && isOnline) {
  // Use setTimeout to avoid blocking initial page load
  setTimeout(() => checkAndSync(), 1000);
}

// --- People Operations ---

export const subscribeToPeople = (callback: (people: Person[]) => void): Unsubscribe => {
  // Always start with local data for instant load
  const initialData = getLocalPeople();
  callback(initialData);

  if (isFirebaseConfigured && db) {
    const q = query(collection(db, colPath("people")));
    return onSnapshot(q, (snapshot) => {
      const people = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
      // Sort alphabetically for consistency
      const sortedPeople = people.sort((a, b) => a.name.localeCompare(b.name));
      // Update local cache
      saveLocalPeople(sortedPeople);
      callback(sortedPeople);
    });
  } else {
    // Set up local change listener when Firebase is not configured
    const localListener = () => {
      const people = getLocalPeople();
      callback(people);
    };
    peopleListeners.add(localListener);

    // Return cleanup function to remove listener
    return () => {
      peopleListeners.delete(localListener);
    };
  }
};

export const addPerson = async (person: Omit<Person, "id">) => {
  const id = generateId();
  const newPerson = { ...person, id };

  // 1. Update Local
  const people = getLocalPeople();
  saveLocalPeople([...people, newPerson]);

  // 2. Update Firebase
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, colPath("people"), id), newPerson);
    } catch (error) {
      console.warn('⚠️ Failed to sync person to Firebase (offline?), will retry when online:', error);
      // Data is already in localStorage, will sync when online
    }
  } else {
    // Notify local listeners when not using Firebase
    notifyPeopleListeners();
  }
};

export const deletePerson = async (id: string) => {
  // 1. Update Local
  const people = getLocalPeople();
  saveLocalPeople(people.filter(p => p.id !== id));

  // 2. Update Firebase
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, colPath("people"), id));
    } catch (error) {
      console.warn('⚠️ Failed to sync person deletion to Firebase (offline?), will retry when online:', error);
      // Data is already removed from localStorage, will sync when online
    }
  } else {
    // Notify local listeners when not using Firebase
    notifyPeopleListeners();
  }
};

// --- Chore Operations ---

export const subscribeToChores = (callback: (chores: Chore[]) => void): Unsubscribe => {
  // Instant load from cache
  const initialData = getLocalChores();
  callback(sortChores(initialData));

  if (isFirebaseConfigured && db) {
    const q = query(collection(db, colPath("chores")));
    return onSnapshot(q, (snapshot) => {
      const chores = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          priority: data.priority || ChorePriority.SOON,
          difficulty: data.difficulty || ChoreDifficulty.MEDIUM
        } as Chore;
      });
      const sorted = sortChores(chores);
      // Update local cache
      saveLocalChores(sorted);
      callback(sorted);
    });
  } else {
    // Set up local change listener when Firebase is not configured
    const localListener = () => {
      const chores = getLocalChores();
      callback(sortChores(chores));
    };
    choreListeners.add(localListener);

    // Return cleanup function to remove listener
    return () => {
      choreListeners.delete(localListener);
    };
  }
};

export const addChore = async (chore: Omit<Chore, "id">) => {
  const id = generateId();
  const newChore = { ...chore, id } as Chore;

  // 1. Update Local
  const chores = getLocalChores();
  saveLocalChores(sortChores([...chores, newChore]));

  // 2. Update Firebase
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, colPath("chores"), id), newChore);
    } catch (error) {
      console.warn('⚠️ Failed to sync chore to Firebase (offline?), will retry when online:', error);
      // Data is already in localStorage, will sync when online
    }
  } else {
    // Notify local listeners when not using Firebase
    notifyChoreListeners();
  }
};

export const updateChore = async (id: string, updates: Partial<Chore>) => {
  // 1. Update Local
  const chores = getLocalChores();
  const updated = chores.map(c => c.id === id ? { ...c, ...updates } : c);
  saveLocalChores(sortChores(updated));

  // 2. Update Firebase
  if (isFirebaseConfigured && db) {
    try {
      // Remove undefined values to prevent Firebase errors
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      await updateDoc(doc(db, colPath("chores"), id), cleanedUpdates);
    } catch (error) {
      console.warn('⚠️ Failed to sync chore update to Firebase (offline?), will retry when online:', error);
      // Data is already in localStorage, will sync when online
    }
  } else {
    // Notify local listeners when not using Firebase
    notifyChoreListeners();
  }
};

export const deleteChore = async (id: string) => {
  // 1. Update Local
  const chores = getLocalChores();
  saveLocalChores(chores.filter(c => c.id !== id));

  // 2. Update Firebase
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, colPath("chores"), id));
    } catch (error) {
      console.warn('⚠️ Failed to sync chore deletion to Firebase (offline?), will retry when online:', error);
      // Data is already removed from localStorage, will sync when online
    }
  } else {
    // Notify local listeners when not using Firebase
    notifyChoreListeners();
  }
};

export const completeChore = async (chore: Chore) => {
  const now = Date.now();
  
  // 1. Mark current as completed
  const { id, ...choreData } = chore;
  await updateChore(id, {
    ...choreData,
    status: ChoreStatus.COMPLETED,
    completedAt: now
  });

  // 2. Handle Recurring Logic
  if (chore.frequency !== ChoreFrequency.ONE_TIME) {
    const baseDate = chore.dueDate ? new Date(chore.dueDate) : new Date(now);
    let nextDueDate: number | undefined = undefined;
    
    if (chore.frequency === ChoreFrequency.DAILY) {
      nextDueDate = addDays(baseDate, 1).getTime();
    } else if (chore.frequency === ChoreFrequency.WEEKLY) {
      nextDueDate = addWeeks(baseDate, 1).getTime();
    } else if (chore.frequency === ChoreFrequency.MONTHLY) {
      nextDueDate = addMonths(baseDate, 1).getTime();
    } else if (chore.frequency === ChoreFrequency.YEARLY) {
      nextDueDate = addYears(baseDate, 1).getTime();
    }

    const nextChore: Omit<Chore, "id"> = {
      title: chore.title,
      description: chore.description,
      frequency: chore.frequency,
      priority: chore.priority || ChorePriority.SOON,
      difficulty: chore.difficulty || ChoreDifficulty.MEDIUM,
      assigneeId: chore.assigneeId,
      status: ChoreStatus.PENDING,
      createdAt: now,
      checklist: chore.checklist ? chore.checklist.map(item => ({ ...item, id: generateId(), completed: false })) : undefined,
      ...(nextDueDate ? { dueDate: nextDueDate } : {})
    };
    
    await addChore(nextChore);
  }
};