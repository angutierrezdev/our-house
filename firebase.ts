import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getSettings } from "./services/settingsService";

const settings = getSettings();

// If these values are empty, the app will fall back to LocalStorage automatically.
const firebaseConfig = settings.firebaseConfig || {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Check if config is valid
const isFirebaseConfigured = !!firebaseConfig.apiKey;

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;

export { isFirebaseConfigured };