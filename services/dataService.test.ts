// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

// The #24 reproduction at the data layer: a cache written by one household
// must never be uploaded into another. Firestore is mocked; every batch write
// lands in `uploaded` as '<collection path>/<id>'.

const { uploaded } = vi.hoisted(() => ({ uploaded: [] as string[] }));

vi.mock('../firebase', () => ({ db: {}, isFirebaseConfigured: false }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, path: string) => path,
  query: (c: string) => c,
  doc: (_db: unknown, col: string, id: string) => `${col}/${id}`,
  getDocs: async () => ({ docs: [] }),
  writeBatch: () => ({
    set: (ref: string) => uploaded.push(ref),
    delete: vi.fn(),
    commit: async () => {},
  }),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

import {
  setHouseholdId,
  syncLocalDataToFirebase,
  importPendingData,
} from './dataService';
import { setCacheOwner, saveLocalChores, saveLocalPeople } from './localStorage';
import { Chore, Person } from '../types';

const db = {};
const chore = (id: string) => ({ id, title: id, createdAt: 1 }) as Chore;
const person = (id: string) => ({ id, name: id, color: 'red' }) as Person;

describe('household-scoped sync', () => {
  beforeEach(() => {
    uploaded.length = 0;
    localStorage.clear();
    setHouseholdId(null);
  });

  it("does not upload another household's cache after an account switch", async () => {
    // Signed in to Prueba: its data is cached.
    setHouseholdId('prueba');
    saveLocalChores([chore('tarea-de-prueba')]);
    saveLocalPeople([person('tester-uno')]);

    // The account switches elsewhere (smart-grocery) without our logOut running.
    setHouseholdId('hidalgo');
    await syncLocalDataToFirebase(db);

    expect(uploaded).toEqual([]);
  });

  it("uploads the household's own offline changes", async () => {
    setHouseholdId('hidalgo');
    saveLocalChores([chore('offline-edit')]);
    await syncLocalDataToFirebase(db);
    expect(uploaded).toEqual(['households/hidalgo/chores/offline-edit']);
  });

  it('holds signed-out data on join until the user adds it', async () => {
    setCacheOwner(null);
    saveLocalChores([chore('mine')]);

    setHouseholdId('hidalgo');
    await syncLocalDataToFirebase(db);
    expect(uploaded).toEqual([]);

    await importPendingData();
    expect(uploaded).toEqual(['households/hidalgo/chores/mine']);
  });
});
