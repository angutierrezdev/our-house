import { Chore, Person } from "../types";

const CHORES_KEY = "choremaster_chores";
const PEOPLE_KEY = "choremaster_people";
const DELETED_CHORES_KEY = "choremaster_deleted_chores";
const DELETED_PEOPLE_KEY = "choremaster_deleted_people";

export const getLocalChores = (): Chore[] => {
  const stored = localStorage.getItem(CHORES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLocalChores = (chores: Chore[]) => {
  localStorage.setItem(CHORES_KEY, JSON.stringify(chores));
};

export const getLocalPeople = (): Person[] => {
  const stored = localStorage.getItem(PEOPLE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLocalPeople = (people: Person[]) => {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
};

// --- Deletion Tombstone Helpers ---
// Track IDs that were deleted locally so we can propagate them to Firestore
// during the next sync instead of resurrecting the remote copy.

const readDeletedMap = (key: string): Map<string, number> => {
  const stored = localStorage.getItem(key);
  if (!stored) return new Map();
  try {
    return new Map(Object.entries(JSON.parse(stored)) as [string, number][]);
  } catch {
    return new Map();
  }
};

const writeDeletedMap = (key: string, map: Map<string, number>) => {
  localStorage.setItem(key, JSON.stringify(Object.fromEntries(map)));
};

export const getDeletedChoreIds = (): Map<string, number> => readDeletedMap(DELETED_CHORES_KEY);

export const recordDeletedChore = (id: string, deletedAt: number) => {
  const map = getDeletedChoreIds();
  map.set(id, deletedAt);
  writeDeletedMap(DELETED_CHORES_KEY, map);
};

export const clearDeletedChore = (id: string) => {
  const map = getDeletedChoreIds();
  map.delete(id);
  writeDeletedMap(DELETED_CHORES_KEY, map);
};

export const getDeletedPeopleIds = (): Map<string, number> => readDeletedMap(DELETED_PEOPLE_KEY);

export const recordDeletedPerson = (id: string, deletedAt: number) => {
  const map = getDeletedPeopleIds();
  map.set(id, deletedAt);
  writeDeletedMap(DELETED_PEOPLE_KEY, map);
};

export const clearDeletedPerson = (id: string) => {
  const map = getDeletedPeopleIds();
  map.delete(id);
  writeDeletedMap(DELETED_PEOPLE_KEY, map);
};