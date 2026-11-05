// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  reconcileCache,
  setCacheOwner,
  saveLocalChores,
  saveLocalPeople,
  getLocalChores,
  getLocalPeople,
  recordDeletedChore,
  getDeletedChoreIds,
  markHouseholdCreatedHere,
  getPendingImport,
  acceptPendingImport,
  discardPendingImport,
  clearAllLocalData,
} from './localStorage';
import { Chore, Person } from '../types';

const chore = (id: string, title = id) => ({ id, title, createdAt: 1 }) as Chore;
const person = (id: string, name = id) => ({ id, name, color: 'red' }) as Person;

// Write a cache the way the app would while `owner` is signed in (null = signed out).
const seed = (owner: string | null, chores: Chore[], people: Person[] = []) => {
  setCacheOwner(owner);
  saveLocalChores(chores);
  saveLocalPeople(people);
};

describe('reconcileCache', () => {
  beforeEach(() => {
    localStorage.clear();
    setCacheOwner(null);
  });

  it("drops another household's cache, including its pending deletions (the #24 leak)", () => {
    seed('prueba', [chore('c1', 'Tarea de prueba')], [person('p1', 'Tester Uno')]);
    recordDeletedChore('gone', 5);

    expect(reconcileCache('hidalgo')).toBe('discard');
    expect(getLocalChores()).toEqual([]);
    expect(getLocalPeople()).toEqual([]);
    expect(getDeletedChoreIds().size).toBe(0);
  });

  it('keeps and re-tags the cache of the same household', () => {
    seed('h1', [chore('c1')]);
    expect(reconcileCache('h1')).toBe('merge');
    expect(getLocalChores()).toHaveLength(1);
  });

  it('adopts a pre-update cache into the signed-in household', () => {
    localStorage.setItem('choremaster_chores', JSON.stringify([chore('c1')]));
    expect(reconcileCache('h1')).toBe('adopt');
    // From now on it is h1's: another household would discard it.
    expect(reconcileCache('h2')).toBe('discard');
  });

  it('clears a household cache when signed out, so it is never shown as local data', () => {
    seed('h1', [chore('c1')]);
    expect(reconcileCache(null)).toBe('clear');
    expect(getLocalChores()).toEqual([]);
  });

  it('keeps signed-out data while signed out, and writes stay unowned', () => {
    seed(null, [chore('c1')]);
    expect(reconcileCache(null)).toBe('keep');
    saveLocalChores([chore('c1'), chore('c2')]);
    expect(reconcileCache('h1')).toBe('ask');
  });

  it('adopts signed-out data silently into a household created on this device', () => {
    seed(null, [chore('c1')]);
    markHouseholdCreatedHere('h1');
    expect(reconcileCache('h1')).toBe('adopt');
    expect(getLocalChores()).toHaveLength(1);
    expect(getPendingImport()).toBeNull();
  });

  describe('when signed-out data meets a joined household', () => {
    beforeEach(() => {
      seed(null, [chore('c1', 'Mine')], [person('p1', 'Me')]);
      expect(reconcileCache('h1')).toBe('ask');
    });

    it('sets the data aside instead of mixing it into the household cache', () => {
      expect(getLocalChores()).toEqual([]);
      expect(getPendingImport()).toEqual({
        chores: [chore('c1', 'Mine')],
        people: [person('p1', 'Me')],
      });
    });

    it('still asks after a reload', () => {
      setCacheOwner(null); // a fresh page load
      expect(reconcileCache('h1')).toBe('merge');
      expect(getPendingImport()).not.toBeNull();
    });

    it('Add moves it into the household cache for the next sync', () => {
      saveLocalChores([chore('remote')]); // the household's data arrived meanwhile
      acceptPendingImport();
      expect(getLocalChores().map((c) => c.id).sort()).toEqual(['c1', 'remote']);
      expect(getLocalPeople().map((p) => p.id)).toEqual(['p1']);
      expect(getPendingImport()).toBeNull();
    });

    it('Discard drops it', () => {
      discardPendingImport();
      expect(getPendingImport()).toBeNull();
      expect(getLocalChores()).toEqual([]);
    });
  });

  it('signing out clears the ownership state too', () => {
    seed('h1', [chore('c1')]);
    clearAllLocalData();
    setCacheOwner(null);
    expect(reconcileCache(null)).toBe('keep');
  });
});
