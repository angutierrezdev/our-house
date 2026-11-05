// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';

// Drive AuthContext with hand-fed auth and profile snapshots. The profile
// callback's second argument says whether the server has confirmed the doc
// (false = the client's own pending write, e.g. right after create/join).

type ProfileCb = (profile: unknown, confirmed: boolean) => void;
const { h } = vi.hoisted(() => ({
  h: {
    authCb: null as ((u: unknown) => void) | null,
    profileCb: null as ProfileCb | null,
  },
}));

vi.mock('../firebase', () => ({ db: {}, isFirebaseConfigured: true }));
vi.mock('../services/authService', () => ({
  subscribeToAuthState: (cb: (u: unknown) => void) => {
    h.authCb = cb;
    return () => {};
  },
  subscribeToUserProfile: (_uid: string, cb: ProfileCb) => {
    h.profileCb = cb;
    return () => {};
  },
  publishInvite: vi.fn(async () => {}),
}));
vi.mock('../services/dataService', () => ({
  setHouseholdId: vi.fn(),
  syncLocalDataToFirebase: vi.fn(async () => {}),
}));

import { AuthProvider } from './AuthContext';
import { publishInvite } from '../services/authService';
import { syncLocalDataToFirebase } from '../services/dataService';

const profile = { uid: 'u1', email: 'u1@test.dev', householdId: 'h1', role: 'member' };

const signIn = async () => {
  render(<AuthProvider><div /></AuthProvider>);
  await act(async () => h.authCb!({ uid: 'u1' }));
};
const snapshot = async (confirmed: boolean) => {
  await act(async () => h.profileCb!(profile, confirmed));
};

describe('household side effects wait for the server', () => {
  beforeEach(() => {
    vi.mocked(syncLocalDataToFirebase).mockReset().mockResolvedValue(undefined);
    vi.mocked(publishInvite).mockClear();
  });
  afterEach(() => cleanup());

  it('does not sync or publish the invite on a pending-write snapshot', async () => {
    await signIn();
    await snapshot(false);
    expect(syncLocalDataToFirebase).not.toHaveBeenCalled();
    expect(publishInvite).not.toHaveBeenCalled();
  });

  it('runs both once the household is confirmed', async () => {
    await signIn();
    await snapshot(false);
    await snapshot(true);
    await snapshot(true);
    expect(syncLocalDataToFirebase).toHaveBeenCalledTimes(1);
    expect(publishInvite).toHaveBeenCalledTimes(1);
    expect(publishInvite).toHaveBeenCalledWith('h1');
  });

  it('retries the sync on a later snapshot after a failure', async () => {
    vi.mocked(syncLocalDataToFirebase).mockRejectedValueOnce(new Error('denied'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await signIn();
    await snapshot(true);
    await snapshot(true);
    expect(syncLocalDataToFirebase).toHaveBeenCalledTimes(2);
  });
});
