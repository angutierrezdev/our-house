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
 * Migrates local data to Firebase. Used when first connecting.
 */
export const syncLocalDataToFirebase = async (targetDb: any) => {
  if (!targetDb) return;

  const localPeople = getLocalPeople();
  const localChores = getLocalChores();

  const batch = writeBatch(targetDb);

  // Sync People
  localPeople.forEach(person => {
    const personRef = doc(targetDb, "people", person.id);
    batch.set(personRef, person);
  });

  // Sync Chores
  localChores.forEach(chore => {
    const choreRef = doc(targetDb, "chores", chore.id);
    batch.set(choreRef, chore);
  });

  await batch.commit();
};

// --- People Operations ---

export const subscribeToPeople = (callback: (people: Person[]) => void): Unsubscribe => {
  // Always start with local data for instant load
  const initialData = getLocalPeople();
  callback(initialData);

  if (isFirebaseConfigured && db) {
    const q = query(collection(db, "people"));
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
    await setDoc(doc(db, "people", id), newPerson);
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
    await deleteDoc(doc(db, "people", id));
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
    const q = query(collection(db, "chores"));
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
    await setDoc(doc(db, "chores", id), newChore);
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
    // Remove undefined values to prevent Firebase errors
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    await updateDoc(doc(db, "chores", id), cleanedUpdates);
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
    await deleteDoc(doc(db, "chores", id));
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