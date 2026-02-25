import React, { useState, useEffect } from "react";
import { Sparkles, Save, ShieldCheck, Cloud, Home, Copy, CheckCheck, LogOut } from "lucide-react";
import { getSettings, saveSettings, AppSettings } from "../services/settingsService";
import { useAuth } from "../contexts/AuthContext";
import { logOut, getHouseholdInfo, HouseholdInfo } from "../services/authService";
import AuthPanel from "../components/AuthPanel";
import HouseholdSetupSheet from "../components/HouseholdSetupSheet";

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [savedStatus, setSavedStatus] = useState(false);

  const { user, profile, householdId } = useAuth();
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (householdId) {
      getHouseholdInfo(householdId).then(setHousehold).catch(() => setHousehold(null));
    } else {
      setHousehold(null);
    }
  }, [householdId]);

  const handleCopyInvite = () => {
    if (household?.inviteCode) {
      navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const handleToggleAI = () => {
    const newSettings = { ...settings, aiEnabled: !settings.aiEnabled };
    setSettings(newSettings);
    saveSettings(newSettings);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          Application Settings
        </h2>

        <div className="space-y-8">
          {/* AI Toggle Section */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex gap-4 items-start">
              <div className={`p-3 rounded-full flex-shrink-0 ${settings.aiEnabled ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'}`}>
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Capabilities</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Enable AI-powered chore suggestions and assistance. This feature uses Google Gemini.
                </p>
              </div>
            </div>
            <div className="ml-4">
              <button
                type="button"
                onClick={handleToggleAI}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.aiEnabled ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.aiEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sync & Account Section */}
          <div className="border-t border-gray-100 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Cloud className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Sync &amp; Account</h3>
            </div>

            {/* State 1 — not signed in */}
            {!user && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Sign in to sync your data across devices and share with household members.
                </p>
                <AuthPanel />
              </div>
            )}

            {/* State 2 — signed in, no household */}
            {user && !householdId && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <p className="text-sm text-green-800">Signed in as <strong>{user.email}</strong></p>
                </div>
                <p className="text-sm text-gray-500">
                  Create or join a household to start syncing and sharing tasks.
                </p>
                <HouseholdSetupSheet />
              </div>
            )}

            {/* State 3 — fully set up */}
            {user && householdId && household && (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-green-700" />
                    <span className="font-semibold text-green-900">{household.name}</span>
                    {profile?.role === "admin" && (
                      <span className="ml-auto text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Admin</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Signed in as <strong>{user.email}</strong></p>
                  </div>
                  {profile?.role === "admin" && (
                    <div className="flex items-center gap-2 p-2 bg-white border border-green-200 rounded-lg">
                      <span className="text-xs text-gray-500 flex-1">Invite code: <strong className="font-mono tracking-widest text-gray-800">{household.inviteCode}</strong></span>
                      <button
                        onClick={handleCopyInvite}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
             <ShieldCheck className="w-5 h-5 flex-shrink-0" />
             <p className="text-xs">Your data is stored locally on this device and synced to your household in the cloud when signed in.</p>
          </div>

          {savedStatus && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-pulse">
               <Save className="w-4 h-4" />
               Settings updated successfully!
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-xl text-center">
        <p className="text-xs text-gray-400">Our House v2.2.0 • Cloud Sync Enabled</p>
      </div>
    </div>
  );
};

export default Settings;