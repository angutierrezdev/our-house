// Which household the local chores/people cache belongs to, and what to do
// with it once the signed-in household is known (#24). our-house shares its
// origin (and so localStorage and the Firebase session) with smart-grocery,
// so an account switch can happen without our-house's logOut ever running.

export interface CacheState {
  /** Household that wrote the cache; null for signed-out data. */
  owner: string | null;
  /** False for a cache written before ownership tracking existed. */
  versioned: boolean;
  hasData: boolean;
  /** Household created on this device and not yet settled, if any. */
  createdHere: string | null;
  /** Signed-in household; null when signed out or not in a household. */
  householdId: string | null;
}

export type CacheAction =
  | "merge" // the cache is this household's: sync as usual
  | "adopt" // take it as this household's, then sync
  | "ask" // signed-out data meets a joined household: the user decides
  | "discard" // another household's cache: drop it, use the server's data
  | "clear" // a household's cache while signed out: drop it
  | "keep"; // signed-out data while signed out

export const decideCacheAction = (s: CacheState): CacheAction => {
  if (!s.householdId) return s.owner ? "clear" : "keep";
  // Pre-update caches belong to whoever was signed in when they were written,
  // which was almost always this household.
  if (!s.versioned) return "adopt";
  if (s.owner === s.householdId) return "merge";
  if (s.owner) return "discard";
  if (!s.hasData || s.createdHere === s.householdId) return "adopt";
  return "ask";
};
