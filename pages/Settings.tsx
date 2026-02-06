import React, { useState } from "react";
import { Sparkles, Save, ShieldCheck, Database, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { getSettings, saveSettings, AppSettings, FirebaseConfig } from "../services/settingsService";
import { initializeApp, deleteApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { syncLocalDataToFirebase } from "../services/dataService";

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [savedStatus, setSavedStatus] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>(settings.firebaseConfig || {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  });

  const handleToggleAI = () => {
    const newSettings = { ...settings, aiEnabled: !settings.aiEnabled };
    setSettings(newSettings);
    saveSettings(newSettings);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleFbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFbConfig({
      ...fbConfig,
      [e.target.name]: e.target.value
    });
  };

  const saveFirebaseConfig = async () => {
    if (!fbConfig.apiKey || !fbConfig.projectId) {
      alert("Please provide at least an API Key and Project ID.");
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Temporary initialization to perform migration
      // Check if there's an existing temporary app and clean up
      const existingTemp = getApps().find(a => a.name === "temp-migration");
      if (existingTemp) await deleteApp(existingTemp);

      const tempApp = initializeApp(fbConfig, "temp-migration");
      const tempDb = getFirestore(tempApp);

      // 2. Perform the one-way sync from local to the new Firebase
      await syncLocalDataToFirebase(tempDb);

      // 3. Save settings and reload
      const newSettings = { ...settings, firebaseConfig: fbConfig };
      setSettings(newSettings);
      saveSettings(newSettings);
      
      // Give it a moment for the user to see success before reloading
      setSavedStatus(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Failed to sync to Firebase:", err);
      alert("Failed to connect to Firebase. Please check your configuration values.");
    } finally {
      setIsSyncing(false);
    }
  };

  const clearFirebaseConfig = () => {
    if (window.confirm("Disconnect from Firebase? Your data will remain on this device but will no longer sync to the cloud.")) {
      const newSettings = { ...settings, firebaseConfig: undefined };
      setSettings(newSettings);
      saveSettings(newSettings);
      window.location.reload();
    }
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

          {/* Firebase Configuration Section */}
          <div className="border-t border-gray-100 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Database (Firebase)</h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Connect your own Firebase project to sync tasks across all your devices. 
              <strong> When you first connect, your local tasks will be uploaded to the cloud.</strong>
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">API Key</label>
                <input
                  type="password"
                  name="apiKey"
                  value={fbConfig.apiKey}
                  onChange={handleFbChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="AIzaSy..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Project ID</label>
                  <input
                    type="text"
                    name="projectId"
                    value={fbConfig.projectId}
                    onChange={handleFbChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="my-house-123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Auth Domain</label>
                  <input
                    type="text"
                    name="authDomain"
                    value={fbConfig.authDomain}
                    onChange={handleFbChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="my-house-123.firebaseapp.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">App ID</label>
                  <input
                    type="text"
                    name="appId"
                    value={fbConfig.appId}
                    onChange={handleFbChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="1:12345678:web:abcdef..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Messaging Sender ID</label>
                  <input
                    type="text"
                    name="messagingSenderId"
                    value={fbConfig.messagingSenderId}
                    onChange={handleFbChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="123456789"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSyncing}
                onClick={saveFirebaseConfig}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isSyncing ? "Syncing Data..." : "Save and Connect"}
              </button>
              {settings.firebaseConfig && (
                <button
                  type="button"
                  onClick={clearFirebaseConfig}
                  className="bg-white text-red-600 border border-red-200 px-6 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  Disconnect & Reset
                </button>
              )}
            </div>
            
            <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                Syncing will upload your local tasks and people to the cloud. This ensures you can access your data from any device once connected.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
             <ShieldCheck className="w-5 h-5 flex-shrink-0" />
             <p className="text-xs">Your configurations and task backups are stored in your browser's local storage for offline use.</p>
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