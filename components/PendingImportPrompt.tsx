import React, { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useAuth, useHouseholdInfo } from '../contexts/AuthContext';
import { getPendingImport, PendingImport } from '../services/localStorage';
import { importPendingData, discardPendingData } from '../services/dataService';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * After joining a household, data this device made while signed out is set
 * aside instead of being merged (#24). This asks once whether to add it.
 */
const PendingImportPrompt: React.FC = () => {
  const { householdId } = useAuth();
  const [pending, setPending] = useState<PendingImport | null>(null);
  const householdName = useHouseholdInfo()?.name;

  useEffect(() => {
    setPending(householdId ? getPendingImport() : null);
  }, [householdId]);

  if (!householdId || !pending) return null;

  const add = () => {
    setPending(null);
    importPendingData().catch((err) => console.warn('⚠️ Import failed:', err));
  };
  const discard = () => {
    setPending(null);
    discardPendingData();
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-blue-600 rounded-full shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <p className="text-sm">
            You have {count(pending.chores.length, 'task', 'tasks')} and{' '}
            {count(pending.people.length, 'person', 'people')} on this device. Add them to{' '}
            {householdName ?? 'your household'}?
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={discard}
            className="px-4 py-2 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
          >
            Discard
          </button>
          <button
            onClick={add}
            className="px-4 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingImportPrompt;
