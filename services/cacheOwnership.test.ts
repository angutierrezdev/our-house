import { describe, it, expect } from 'vitest';
import { decideCacheAction, CacheState } from './cacheOwnership';

// The decision table from #24: what to do with this device's local
// chores/people cache once the signed-in household (or its absence) is known.

const state = (s: Partial<CacheState>): CacheState => ({
  owner: null,
  versioned: true,
  hasData: true,
  householdId: null,
  createdHere: null,
  ...s,
});

describe('decideCacheAction', () => {
  describe('signed in to household h1', () => {
    it('merges a cache owned by h1', () => {
      expect(decideCacheAction(state({ householdId: 'h1', owner: 'h1' }))).toBe('merge');
    });

    it("discards a cache owned by another household (the #24 leak)", () => {
      expect(decideCacheAction(state({ householdId: 'h1', owner: 'h2' }))).toBe('discard');
    });

    it('adopts a cache written before the update, whoever wrote it', () => {
      expect(decideCacheAction(state({ householdId: 'h1', versioned: false }))).toBe('adopt');
      expect(
        decideCacheAction(state({ householdId: 'h1', versioned: false, owner: 'h2' })),
      ).toBe('adopt');
    });

    it('adopts signed-out data silently when h1 was created on this device', () => {
      expect(decideCacheAction(state({ householdId: 'h1', createdHere: 'h1' }))).toBe('adopt');
    });

    it('asks before adding signed-out data to a household that was joined', () => {
      expect(decideCacheAction(state({ householdId: 'h1' }))).toBe('ask');
      expect(decideCacheAction(state({ householdId: 'h1', createdHere: 'h2' }))).toBe('ask');
    });

    it('adopts an empty signed-out cache without asking', () => {
      expect(decideCacheAction(state({ householdId: 'h1', hasData: false }))).toBe('adopt');
    });
  });

  describe('signed out, or signed in without a household', () => {
    it("clears a household's cache so it is never shown as local data", () => {
      expect(decideCacheAction(state({ owner: 'h1' }))).toBe('clear');
    });

    it('keeps signed-out data', () => {
      expect(decideCacheAction(state({}))).toBe('keep');
    });

    it('keeps a cache written before the update as signed-out data', () => {
      expect(decideCacheAction(state({ versioned: false }))).toBe('keep');
    });
  });
});
