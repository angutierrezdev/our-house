import { Chore, Person } from "../types";
import { CacheAction, decideCacheAction } from "./cacheOwnership";

const CHORES_KEY = "choremaster_chores";
const PEOPLE_KEY = "choremaster_people";
const DELETED_CHORES_KEY = "choremaster_deleted_chores";
const DELETED_PEOPLE_KEY = "choremaster_deleted_people";
// Ownership of the cache above (#24). See services/cacheOwnership.ts.
const OWNER_KEY = "choremaster_owner";
const VERSION_KEY = "choremaster_cache_v";
const CACHE_VERSION = "1";
const CREATED_HERE_KEY = "choremaster_created_household";
// Signed-out data waiting for the user to add it to a joined household.
const PENDING_IMPORT_KEY = "choremaster_pending_import";

// Household that writes to the cache in this session; null while signed out.
let _cacheOwner: string | null = null;

export const setCacheOwner = (householdId: string | null): void => {
  _cacheOwner = householdId;
};

// Every write records who wrote it, so a later session can tell whose it is.
const stampOwner = () => {
  localStorage.setItem(VERSION_KEY, CACHE_VERSION);
  if (_cacheOwner) localStorage.setItem(OWNER_KEY, _cacheOwner);
  else localStorage.removeItem(OWNER_KEY);
};

export const getLocalChores = (): Chore[] => {
  const stored = localStorage.getItem(CHORES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLocalChores = (chores: Chore[]) => {
  localStorage.setItem(CHORES_KEY, JSON.stringify(chores));
  stampOwner();
};

export const getLocalPeople = (): Person[] => {
  const stored = localStorage.getItem(PEOPLE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLocalPeople = (people: Person[]) => {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
  stampOwner();
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

/**
 * Session/user-specific keys cleared on logout.
 * Device-level preferences (e.g. choremaster_settings) are intentionally
 * excluded so that they persist across sessions.
 */
const SESSION_KEYS = [
  CHORES_KEY, PEOPLE_KEY, DELETED_CHORES_KEY, DELETED_PEOPLE_KEY,
  OWNER_KEY, VERSION_KEY, CREATED_HERE_KEY, PENDING_IMPORT_KEY,
];

export const clearAllLocalData = (): void => {
  SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
};

const CACHE_DATA_KEYS = [CHORES_KEY, PEOPLE_KEY, DELETED_CHORES_KEY, DELETED_PEOPLE_KEY];

/** Lets the first reconcile after createHousehold adopt signed-out data silently. */
export const markHouseholdCreatedHere = (householdId: string): void => {
  localStorage.setItem(CREATED_HERE_KEY, householdId);
};

/**
 * Settles whose cache this is once the signed-in household (or its absence)
 * is known, and makes later writes belong to that household. Must run before
 * anything reads or syncs the cache for that household.
 */
export const reconcileCache = (householdId: string | null): CacheAction => {
  const chores = getLocalChores();
  const people = getLocalPeople();
  const action = decideCacheAction({
    owner: localStorage.getItem(OWNER_KEY),
    versioned: localStorage.getItem(VERSION_KEY) === CACHE_VERSION,
    hasData: chores.length > 0 || people.length > 0,
    createdHere: localStorage.getItem(CREATED_HERE_KEY),
    householdId,
  });

  if (action === "ask") {
    localStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify({ chores, people }));
  }
  if (action === "ask" || action === "discard" || action === "clear") {
    CACHE_DATA_KEYS.forEach((k) => localStorage.removeItem(k));
  }
  // The flag only matters for the first reconcile after a create.
  if (householdId) localStorage.removeItem(CREATED_HERE_KEY);

  setCacheOwner(householdId);
  stampOwner();
  return action;
};

export const cacheBelongsTo = (householdId: string): boolean =>
  localStorage.getItem(OWNER_KEY) === householdId;

export interface PendingImport {
  chores: Chore[];
  people: Person[];
}

export const getPendingImport = (): PendingImport | null => {
  const stored = localStorage.getItem(PENDING_IMPORT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as PendingImport;
  } catch {
    return null;
  }
};

/** Add: merge the set-aside data into the household cache; the next sync uploads it. */
export const acceptPendingImport = (): void => {
  const pending = getPendingImport();
  if (pending) {
    const addMissing = <T extends { id: string }>(current: T[], extra: T[]) => {
      const ids = new Set(current.map((x) => x.id));
      return [...current, ...extra.filter((x) => !ids.has(x.id))];
    };
    saveLocalChores(addMissing(getLocalChores(), pending.chores));
    saveLocalPeople(addMissing(getLocalPeople(), pending.people));
  }
  localStorage.removeItem(PENDING_IMPORT_KEY);
};

export const discardPendingImport = (): void => {
  localStorage.removeItem(PENDING_IMPORT_KEY);
};