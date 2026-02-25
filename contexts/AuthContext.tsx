import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { User } from "firebase/auth";
import {
  subscribeToAuthState,
  getUserProfile,
  UserProfile,
} from "../services/authService";
import { setHouseholdId, syncLocalDataToFirebase } from "../services/dataService";
import { db } from "../firebase";

// ─── Context Types ────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  householdId: string | null;
  authLoading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  householdId: null,
  authLoading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [householdId, setHouseholdIdState] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Ensure we only sync local data to Firebase once per session
  const didSync = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const p = await getUserProfile(firebaseUser.uid);
          setProfile(p);

          const hid = p?.householdId ?? null;
          setHouseholdIdState(hid);

          // Tell dataService which household path to use
          setHouseholdId(hid);

          // One-time sync: push localStorage data into Firebase when
          // a household is available for the first time in this session.
          if (hid && !didSync.current && db) {
            didSync.current = true;
            try {
              await syncLocalDataToFirebase(db);
              console.log("✅ localStorage synced to household Firestore");
            } catch (err) {
              console.warn("⚠️ Sync failed:", err);
            }
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setProfile(null);
          setHouseholdIdState(null);
          setHouseholdId(null);
        }
      } else {
        // Signed out — clear everything and unscope dataService
        setProfile(null);
        setHouseholdIdState(null);
        setHouseholdId(null);
        didSync.current = false;
      }

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, householdId, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthState => useContext(AuthContext);
