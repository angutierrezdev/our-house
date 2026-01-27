import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getSettings } from "./services/settingsService";

// Load configuration from local settings
const settings = getSettings();
const firebaseConfig = settings.firebaseConfig || {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Check if config is valid (at minimum needs an API key)
const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey);

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;

export { isFirebaseConfigured };