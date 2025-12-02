import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration
// If these values are empty, the app will fall back to LocalStorage automatically.
const firebaseConfig = {
  apiKey: "", // e.g., "AIzaSy..."
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