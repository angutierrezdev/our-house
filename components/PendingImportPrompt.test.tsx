// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import React from 'react';

const { h } = vi.hoisted(() => ({
  h: { householdId: 'h1' as string | null, pending: null as unknown },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ householdId: h.householdId }),
  useHouseholdInfo: () => (h.householdId ? { name: 'Hidalgo' } : null),
}));
vi.mock('../services/localStorage', () => ({
  getPendingImport: () => h.pending,
}));
vi.mock('../services/dataService', () => ({
  importPendingData: vi.fn(async () => {}),
  discardPendingData: vi.fn(),
}));

import PendingImportPrompt from './PendingImportPrompt';
import { importPendingData, discardPendingData } from '../services/dataService';

const pending = {
  chores: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
  people: [{ id: 'p1' }],
};

describe('PendingImportPrompt', () => {
  beforeEach(() => {
    h.householdId = 'h1';
    h.pending = pending;
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('asks whether to add the device data to the household', async () => {
    render(<PendingImportPrompt />);
    expect(
      await screen.findByText('You have 3 tasks and 1 person on this device. Add them to Hidalgo?'),
    ).toBeTruthy();
  });

  it('Add imports the data and closes', async () => {
    render(<PendingImportPrompt />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
    expect(importPendingData).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Add' })).toBeNull());
  });

  it('Discard drops the data and closes', async () => {
    render(<PendingImportPrompt />);
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(discardPendingData).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
  });

  it('shows nothing without pending data or a household', () => {
    h.pending = null;
    const { container } = render(<PendingImportPrompt />);
    expect(container.innerHTML).toBe('');
    cleanup();
    h.pending = pending;
    h.householdId = null;
    expect(render(<PendingImportPrompt />).container.innerHTML).toBe('');
  });
});
