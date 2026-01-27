import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { getLocalChores, saveLocalChores, getLocalPeople, saveLocalPeople } from "./localStorage";
import { Chore, Person, ChoreFrequency, ChoreStatus, ChorePriority, ChoreDifficulty } from "../types";
import { addWeeks, addMonths, addDays, addYears } from "date-fns";
import { PRIORITY_WEIGHTS } from "../constants";

// Listeners type
type Unsubscribe = () => void;

// --- Helper Functions ---

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const sortChores = (chores: Chore[]): Chore[] => {
  return chores.sort((a, b) => {
    // 1. Sort by Priority
    const weightA = PRIORITY_WEIGHTS[a.priority] ?? 99;
    const weightB = PRIORITY_WEIGHTS[b.priority] ?? 99;
    
    if (weightA !== weightB) {
      return weightA - weightB;
    }

    // 2. Sort by Due Date (Earliest first)
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
    callback(getLocalPeople());
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
  
  const { id, ...choreData } = chore;
  await updateChore(id, {
    ...choreData,
    status: ChoreStatus.COMPLETED,
    completedAt: now
  });

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

    const newChore: Omit<Chore, "id"> = {
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
    
    await addChore(newChore);
  }
};