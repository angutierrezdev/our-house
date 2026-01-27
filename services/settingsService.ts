const SETTINGS_KEY = "choremaster_settings";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface AppSettings {
  aiEnabled: boolean;
  firebaseConfig?: FirebaseConfig;
}

const defaultSettings: AppSettings = {
  aiEnabled: true,
};

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch (e) {
    return defaultSettings;
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  // Dispatch a custom event to notify components of changes
  window.dispatchEvent(new Event("settingsChanged"));
};