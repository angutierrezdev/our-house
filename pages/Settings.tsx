import React, { useState, useEffect } from "react";
import { Sparkles, Save, ShieldCheck, Database, RefreshCw, Share2, QrCode, Clipboard, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Camera, Trash2, RotateCcw } from "lucide-react";
import { getSettings, saveSettings, AppSettings } from "../services/settingsService";
import { QRCodeCanvas } from "qrcode.react";
import QRScanner from "../components/QRScanner";

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [savedStatus, setSavedStatus] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<AppSettings["firebaseConfig"] | null>(null);
  const [copyStatus, setCopyStatus] = useState(false);
  const [isDeregistered, setIsDeregistered] = useState(false);

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

  const handleScan = (data: string) => {
    try {
      const config = JSON.parse(data);
      if (config.apiKey && config.projectId) {
        setPendingConfig(config);
        setIsScannerOpen(false);
      } else {
        alert("Invalid QR code format. Please scan a valid configuration.");
      }
    } catch (e) {
      alert("Error reading QR code. Please make sure it's a valid JSON configuration.");
    }
  };

  const confirmImport = () => {
    if (pendingConfig) {
      const newSettings = { ...settings, firebaseConfig: pendingConfig };
      setSettings(newSettings);
      saveSettings(newSettings);
      setPendingConfig(null);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  };

  const copyConfigToClipboard = () => {
    if (settings.firebaseConfig) {
      navigator.clipboard.writeText(JSON.stringify(settings.firebaseConfig));
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    }
  };

  const isConfigured = !!settings.firebaseConfig?.apiKey;

  const handleDeregisterSW = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
        setIsDeregistered(true);
        setTimeout(() => {
          setIsDeregistered(false);
          window.location.reload();
        }, 1500);
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
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
                <span className="font-semibold text-gray-900 block">AI Capabilities</span>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Enable AI-powered chore suggestions and assistance. This feature uses Google Gemini.
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

          {/* Database Info Section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-400" />
              Database Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { label: "API Key", key: "apiKey", placeholder: "AIza..." },
                { label: "Auth Domain", key: "authDomain", placeholder: "your-app.firebaseapp.com" },
                { label: "Project ID", key: "projectId", placeholder: "your-project-id" },
                { label: "Storage Bucket", key: "storageBucket", placeholder: "your-app.appspot.com" },
                { label: "Messaging Sender ID", key: "messagingSenderId", placeholder: "1234567890" },
                { label: "App ID", key: "appId", placeholder: "1:1234567890:web:abcdef..." },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{field.label}</label>
                  <input
                    type="text"
                    value={(settings.firebaseConfig as any)?.[field.key] || ""}
                    onChange={(e) => handleFirebaseChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Share/Import UI */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
               <button 
                onClick={() => setIsShareOpen(!isShareOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
               >
                <div className="flex items-center gap-3 text-left">
                  <Share2 className="w-5 h-5 text-purple-600" />
                  <div>
                    <span className="font-semibold text-gray-900 block">Share / Import</span>
                    <p className="text-xs text-gray-500">Connect other devices via QR code</p>
                  </div>
                </div>
                {isShareOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
               </button>

               {isShareOpen && (
                 <div className="p-6 bg-white border-t border-gray-200">
                    {isConfigured ? (
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-white border-2 border-purple-50 rounded-2xl shadow-sm">
                          <QRCodeCanvas 
                            value={JSON.stringify(settings.firebaseConfig)} 
                            size={180}
                            level="M"
                            includeMargin={true}
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 max-w-xs mx-auto">
                            Scan this to sync with another device instantly.
                          </p>
                        </div>
                        <button 
                          onClick={copyConfigToClipboard}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          {copyStatus ? <CheckCircle className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                          {copyStatus ? "Copied!" : "Copy Raw Config"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center space-y-4 py-2">
                        <div className="p-4 bg-gray-50 rounded-full">
                          <QrCode className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500">No database configured yet. Import one?</p>
                        <button 
                          onClick={() => setIsScannerOpen(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold shadow-md hover:bg-purple-700 transition-all active:scale-95"
                        >
                          <Camera className="w-5 h-5" />
                          Scan QR Code
                        </button>
                      </div>
                    )}
                 </div>
               )}
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-100">
               <RefreshCw className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <div className="space-y-1">
                 <p className="text-sm font-semibold">Reload Required</p>
                 <p className="text-xs text-amber-700">Changes will take effect after reload.</p>
                 <button 
                  onClick={reloadPage}
                  className="mt-2 px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
                 >
                   Reload Now
                 </button>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 opacity-60">
             <ShieldCheck className="w-5 h-5 flex-shrink-0" />
             <p className="text-xs">Your settings are saved locally in your browser.</p>
          </div>

          {/* Troubleshooting Section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-gray-400" />
              Troubleshooting
            </h3>
            <div className="p-4 bg-red-50 rounded-xl border border-red-100 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-red-900">Force Clear Cache</h4>
                <p className="text-xs text-red-700 mt-1">
                  If you're experiencing issues or the app is not updating, you can deregister the service worker. 
                  This will force the app to reload and fetch the latest version.
                </p>
              </div>
              <button 
                onClick={handleDeregisterSW}
                disabled={isDeregistered}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDeregistered 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-md active:scale-95'
                }`}
              >
                {isDeregistered ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Deregistered! Reloading...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Deregister Service Worker
                  </>
                )}
              </button>
            </div>
          </div>

          {savedStatus && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-bounce justify-center py-2">
               <CheckCircle className="w-4 h-4" />
               Settings Saved!
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-xl text-center">
        <p className="text-xs text-gray-400 font-mono">ChoreMaster v2.1.0-qr-sync</p>
      </div>

      {/* Overlays */}
      {isScannerOpen && (
        <QRScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />
      )}

      {pendingConfig && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Import Configuration?</h3>
              <p className="text-sm text-gray-500 mt-2">Detected project: <span className="font-bold text-blue-600">{pendingConfig.projectId}</span></p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPendingConfig(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-medium">Cancel</button>
              <button onClick={confirmImport} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;