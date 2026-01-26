import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { getLocalChores, saveLocalChores, getLocalPeople, saveLocalPeople, generateId } from "./localStorage";
import { Chore, Person, ChoreFrequency, ChoreStatus, ChorePriority, ChoreDifficulty } from "../types";
import { addWeeks, addMonths, addDays, addYears } from "date-fns";
import { PRIORITY_WEIGHTS } from "../constants";

// Listeners type
type Unsubscribe = () => void;

// --- Helper Functions ---

const sortChores = (chores: Chore[]): Chore[] => {
  return chores.sort((a, b) => {
    // 1. Sort by Priority
    const weightA = PRIORITY_WEIGHTS[a.priority] ?? 99;
    const weightB = PRIORITY_WEIGHTS[b.priority] ?? 99;
    
    if (weightA !== weightB) {
      return weightA - weightB;
    }

    // 2. Sort by Due Date (Earliest first)
    // Items with due dates come before items without due dates if priorities are equal
    if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
    if (a.dueDate) return -1; 
    if (b.dueDate) return 1;
    
    return 0;
  });
};

// --- People Operations ---

export const subscribeToPeople = (callback: (people: Person[]) => void): Unsubscribe => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, "people"), orderBy("name"));
    return onSnapshot(q, (snapshot) => {
      const people = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
      callback(people);
    });
  } else {
    // Local Storage Fallback
    callback(getLocalPeople());
    // Mock subscription for local storage (simple polling or event dispatch could be better, but valid for this scope)
    const interval = setInterval(() => callback(getLocalPeople()), 1000);
    return () => clearInterval(interval);
  }
};

export const addPerson = async (person: Omit<Person, "id">) => {
  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, "people"), person);
  } else {
    const people = getLocalPeople();
    const newPerson = { ...person, id: generateId() };
    saveLocalPeople([...people, newPerson]);
  }
};

export const deletePerson = async (id: string) => {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, "people", id));
  } else {
    const people = getLocalPeople();
    saveLocalPeople(people.filter(p => p.id !== id));
  }
};

// --- Chore Operations ---

export const subscribeToChores = (callback: (chores: Chore[]) => void): Unsubscribe => {
  if (isFirebaseConfigured && db) {
    // Note: Removed orderBy("dueDate") to ensure docs without dueDate are not filtered out by Firestore.
    // Sorting will happen client-side.
    const q = query(collection(db, "chores"));
    return onSnapshot(q, (snapshot) => {
      const chores = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Handle migration for old chores that might not have priority or difficulty
          priority: data.priority || ChorePriority.SOON,
          difficulty: data.difficulty || ChoreDifficulty.MEDIUM
        } as Chore;
      });
      
      callback(sortChores(chores));
    });
  } else {
    const getAndSort = () => {
      const chores = getLocalChores();
      return sortChores(chores.map(c => ({
        ...c,
        priority: c.priority || ChorePriority.SOON,
        difficulty: c.difficulty || ChoreDifficulty.MEDIUM
      })));
    };

    callback(getAndSort());
    const interval = setInterval(() => callback(getAndSort()), 1000);
    return () => clearInterval(interval);
  }
};

export const addChore = async (chore: Omit<Chore, "id">) => {
  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, "chores"), chore);
  } else {
    const chores = getLocalChores();
    const newChore = { ...chore, id: generateId() };
    saveLocalChores([...chores, newChore]);
  }
};

export const updateChore = async (id: string, updates: Partial<Chore>) => {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, "chores", id), updates);
  } else {
    const chores = getLocalChores();
    const updated = chores.map(c => c.id === id ? { ...c, ...updates } : c);
    saveLocalChores(updated);
  }
};

export const deleteChore = async (id: string) => {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, "chores", id));
  } else {
    const chores = getLocalChores();
    saveLocalChores(chores.filter(c => c.id !== id));
  }
};

export const completeChore = async (chore: Chore) => {
  const now = Date.now();
  
  // 1. Mark current as completed
  await updateChore(chore.id, {
    status: ChoreStatus.COMPLETED,
    completedAt: now
  });

  // 2. Handle Recurring Logic
  if (chore.frequency !== ChoreFrequency.ONE_TIME) {
    // If due date exists, use it as base. If not, use 'now'.
    const baseDate = chore.dueDate ? new Date(chore.dueDate) : new Date(now);
    let nextDueDate: number | undefined = undefined;
    
    // Calculate next due date based on frequency
    if (chore.frequency === ChoreFrequency.DAILY) {
      nextDueDate = addDays(baseDate, 1).getTime();
    } else if (chore.frequency === ChoreFrequency.WEEKLY) {
      nextDueDate = addWeeks(baseDate, 1).getTime();
    } else if (chore.frequency === ChoreFrequency.MONTHLY) {
      nextDueDate = addMonths(baseDate, 1).getTime();
    } else if (chore.frequency === ChoreFrequency.YEARLY) {
      nextDueDate = addYears(baseDate, 1).getTime();
    }

    // Create new instance
    const newChore: Omit<Chore, "id"> = {
      title: chore.title,
      description: chore.description,
      frequency: chore.frequency,
      priority: chore.priority || ChorePriority.SOON,
      difficulty: chore.difficulty || ChoreDifficulty.MEDIUM,
      assigneeId: chore.assigneeId,
      status: ChoreStatus.PENDING,
      createdAt: now,
      // Only set dueDate if calculated
      ...(nextDueDate ? { dueDate: nextDueDate } : {})
    };
    
    await addChore(newChore);
  }
};