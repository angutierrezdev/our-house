import React, { useState, useEffect } from "react";
import { Sparkles, Save, ShieldCheck, Database, RefreshCw } from "lucide-react";
import { getSettings, saveSettings, AppSettings } from "../services/settingsService";

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [savedStatus, setSavedStatus] = useState(false);

  const handleToggleAI = () => {
    const newSettings = { ...settings, aiEnabled: !settings.aiEnabled };
    setSettings(newSettings);
    saveSettings(newSettings);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleFirebaseChange = (key: string, value: string) => {
    const newSettings = {
      ...settings,
      firebaseConfig: {
        ...(settings.firebaseConfig || {
          apiKey: "",
          authDomain: "",
          projectId: "",
          storageBucket: "",
          messagingSenderId: "",
          appId: ""
        }),
        [key]: value
      }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          Application Settings
        </h2>

        <div className="space-y-6">
          {/* AI Toggle Section */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex gap-4 items-start">
              <div className={`p-3 rounded-full flex-shrink-0 ${settings.aiEnabled ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'}`}>
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Capabilities</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Enable AI-powered chore suggestions and assistance. This feature uses Google Gemini to help you manage your household.
                </p>
              </div>
            </div>
            <div className="ml-4">
              <button
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

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-400" />
              Database Configuration
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter your Firebase project details to use your own cloud database. Leave these empty to use local browser storage.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">API Key</label>
                <input
                  type="text"
                  value={settings.firebaseConfig?.apiKey || ""}
                  onChange={(e) => handleFirebaseChange("apiKey", e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Auth Domain</label>
                <input
                  type="text"
                  value={settings.firebaseConfig?.authDomain || ""}
                  onChange={(e) => handleFirebaseChange("authDomain", e.target.value)}
                  placeholder="your-app.firebaseapp.com"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Project ID</label>
                <input
                  type="text"
                  value={settings.firebaseConfig?.projectId || ""}
                  onChange={(e) => handleFirebaseChange("projectId", e.target.value)}
                  placeholder="your-project-id"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Storage Bucket</label>
                <input
                  type="text"
                  value={settings.firebaseConfig?.storageBucket || ""}
                  onChange={(e) => handleFirebaseChange("storageBucket", e.target.value)}
                  placeholder="your-app.appspot.com"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Messaging Sender ID</label>
                <input
                  type="text"
                  value={settings.firebaseConfig?.messagingSenderId || ""}
                  onChange={(e) => handleFirebaseChange("messagingSenderId", e.target.value)}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">App ID</label>
                <input
                  type="text"
                  value={settings.firebaseConfig?.appId || ""}
                  onChange={(e) => handleFirebaseChange("appId", e.target.value)}
                  placeholder="1:1234567890:web:abcdef..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-100">
               <RefreshCw className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <div className="space-y-1">
                 <p className="text-sm font-semibold">Reload Required</p>
                 <p className="text-xs">Database changes will only take effect after you reload the application.</p>
                 <button 
                  onClick={reloadPage}
                  className="mt-2 px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 transition-colors"
                 >
                   Reload Now
                 </button>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
             <ShieldCheck className="w-5 h-5 flex-shrink-0" />
             <p className="text-xs">Your settings are saved locally in your browser.</p>
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
        <p className="text-xs text-gray-400">ChoreMaster Version 2.0.0-mobile-optimized</p>
      </div>
    </div>
  );
};

export default Settings;