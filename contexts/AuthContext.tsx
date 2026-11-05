import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { User } from "firebase/auth";
import {
  publishInvite,
  subscribeToAuthState,
  subscribeToUserProfile,
  UserProfile,
} from "../services/authService";
import { setHouseholdId, syncLocalDataToFirebase } from "../services/dataService";
import { db, isFirebaseConfigured } from "../firebase";

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
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);

  // Ensure we only sync local data to Firebase once per session
  const didSync = useRef(false);
  // Households whose invite lookup was already published this session
  const publishedInvites = useRef(new Set<string>());

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = subscribeToAuthState((firebaseUser) => {
      // Clean up any previous profile subscription when auth state changes
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        // Subscribe to the user profile document in real-time so AuthContext
        // automatically detects household creation/joining without re-login.
        profileUnsub = subscribeToUserProfile(firebaseUser.uid, (p, confirmed) => {
          setProfile(p);

          const hid = p?.householdId ?? null;
          setHouseholdIdState(hid);

          // Tell dataService which household path to use
          setHouseholdId(hid);

          // One-time sync: push localStorage data into Firebase when
          // a household is available for the first time in this session.
          // Waits for a server-confirmed profile: until the create/join write
          // commits, the rules don't treat the user as a member yet.
          if (hid && confirmed && !didSync.current && db) {
            didSync.current = true;
            syncLocalDataToFirebase(db)
              .then(() => console.log("✅ localStorage synced to household Firestore"))
              .catch((err) => {
                didSync.current = false; // retry on the next snapshot
                console.warn("⚠️ Sync failed:", err);
              });
          }

          // Backfill invites/{CODE} so households created before it existed
          // can be joined from any app.
          if (hid && confirmed && !publishedInvites.current.has(hid)) {
            publishedInvites.current.add(hid);
            void publishInvite(hid);
          }

          setAuthLoading(false);
        });
      } else {
        // Signed out — clear everything and unscope dataService
        setProfile(null);
        setHouseholdIdState(null);
        setHouseholdId(null);
        didSync.current = false;
        publishedInvites.current.clear();
        setAuthLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, householdId, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthState => useContext(AuthContext);
