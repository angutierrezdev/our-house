import { vi, describe, it, expect } from 'vitest';

// A profile snapshot only counts as confirmed when it came from the server:
// a pending write (create/join) or a cache read can name a household the
// rules don't yet see the user as a member of.

type Snap = { exists: () => boolean; data: () => unknown; metadata: object };
const { h } = vi.hoisted(() => ({ h: { emit: null as ((s: Snap) => void) | null } }));

vi.mock('firebase/auth', () => ({}));
vi.mock('../firebase', () => ({ auth: {}, db: {} }));
vi.mock('./localStorage', () => ({}));
vi.mock('firebase/firestore', () => ({
  doc: () => 'ref',
  onSnapshot: (_ref: unknown, _opts: unknown, cb: (s: Snap) => void) => {
    h.emit = cb;
    return () => {};
  },
}));

import { subscribeToUserProfile } from './authService';

const confirmedFor = (metadata: { hasPendingWrites: boolean; fromCache: boolean }) => {
  const seen: boolean[] = [];
  subscribeToUserProfile('u1', (_p, confirmed) => seen.push(confirmed));
  h.emit!({ exists: () => true, data: () => ({ householdId: 'h1' }), metadata });
  return seen[0];
};

describe('subscribeToUserProfile', () => {
  it('confirms only server snapshots', () => {
    expect(confirmedFor({ hasPendingWrites: false, fromCache: false })).toBe(true);
    expect(confirmedFor({ hasPendingWrites: true, fromCache: false })).toBe(false);
    expect(confirmedFor({ hasPendingWrites: false, fromCache: true })).toBe(false);
  });
});
