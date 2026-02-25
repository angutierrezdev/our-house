import React, { useState } from "react";
import { Home, Users, Loader2, AlertCircle } from "lucide-react";
import { createHousehold, joinHousehold } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { setHouseholdId, syncLocalDataToFirebase } from "../services/dataService";
import { db } from "../firebase";

const HouseholdSetupSheet: React.FC = () => {
  const { user } = useAuth();
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoadingCreate(true);
    try {
      const household = await createHousehold(user.uid, householdName.trim());
      // Update dataService so subscriptions switch to scoped paths immediately
      setHouseholdId(household.id);
      if (db) await syncLocalDataToFirebase(db);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create household.");
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoadingJoin(true);
    try {
      const household = await joinHousehold(user.uid, inviteCode.trim());
      setHouseholdId(household.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join household.");
    } finally {
      setLoadingJoin(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 text-red-600 text-xs p-3 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Create */}
      <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <Home className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900 text-sm">Create a Household</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Start a new household. Your existing tasks and people will be migrated automatically.
        </p>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="e.g. The Smith House"
            required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={loadingCreate || !householdName.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingCreate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create
          </button>
        </form>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <div className="flex-1 border-t border-gray-200" />
        or
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Join */}
      <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-gray-900 text-sm">Join a Household</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Enter the 6-character invite code from an existing household admin.
        </p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            required
            maxLength={6}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-green-500 outline-none tracking-wider"
          />
          <button
            type="submit"
            disabled={loadingJoin || inviteCode.length !== 6}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingJoin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Join
          </button>
        </form>
      </div>
    </div>
  );
};

export default HouseholdSetupSheet;
