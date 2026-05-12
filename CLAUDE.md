# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build → dist/
npm run preview  # Serve production build locally
```

No test framework is configured.

## Architecture Overview

**Our House** is an offline-first PWA for household chore/task management. It uses React 19 + TypeScript + Vite, with Firebase Firestore as an optional cloud backend and localStorage as the primary/fallback store.

### Data Flow

All data access goes through `services/dataService.ts`, which implements a hybrid strategy:
- **With `householdId`:** Read/write Firestore subcollections at `households/{householdId}/chores` and `.../people`, with localStorage as a cache.
- **Without `householdId`:** localStorage only.

Offline changes are queued locally and synced via `syncLocalDataToFirebase()` on reconnect. Conflict resolution is last-write-wins based on `updatedAt` timestamps. Deletions are tracked as tombstones in localStorage (`choremaster_deleted_chores`, `choremaster_deleted_people`) and replayed to Firestore on sync.

### Auth & Household Setup

`AuthContext` (`contexts/AuthContext.tsx`) holds `user`, `profile`, and `householdId`. The app gates routing behind two conditions: a Firebase user must exist AND a `householdId` must be set. `App.tsx` renders `AuthPanel` or `HouseholdSetupSheet` before showing main nav when either condition is unmet.

Firebase is initialized with graceful degradation in `firebase.ts` — if env vars are missing, all Firestore/Auth calls become no-ops and the app runs in offline-only mode.

### Routing

Hash-based routing (`HashRouter`) for PWA/GitHub Pages compatibility. Routes are defined in `constants.ts` and wired in `App.tsx`: `/` (Dashboard), `/kanban`, `/people`, `/settings`.

### Subscription Pattern

Pages subscribe to real-time data using `subscribeToChores(callback)` / `subscribeToPeople(callback)` from `dataService`. **Always guard subscriptions with a `householdId` check** before subscribing — pages use a guard clause pattern:

```typescript
useEffect(() => {
  if (!householdId) return;
  const unsub = subscribeToChores(setChores);
  return () => unsub();
}, [householdId]);
```

### Environment Variables

Loaded via Vite (`import.meta.env`). Firebase and Gemini AI credentials must be prefixed with `VITE_`. See `vite.config.ts` for the full list. The app deploys to a subpath — Vite's `base` is set to `/our-house/`.

---

## PWA Version Management & Update System

All versioning is controlled through `/metadata.json` (single source of truth). The version is:
- Read by the service worker during installation
- Displayed in the Settings page
- Used to name caches (`our-house-v{VERSION}`) to prevent stale cache conflicts

### How to Version Bump

1. Update `version` in `/metadata.json`
2. Commit and deploy

The system automatically detects the change, shows an update notification to active users, and silently updates on first page load.

### System Components

**Service Worker (`/public/sw.js`)**
- Fetches version from `metadata.json` on startup
- Cache-first fetch strategy; cleans old caches on activate
- Does NOT auto-call `skipWaiting()` — waits for client signal
- Responds to `GET_VERSION` and `SKIP_WAITING` messages via `MessageChannel`

**PWAUpdate Component (`/components/PWAUpdate.tsx`)**
- Registers the service worker and listens for `updatefound` / `controllerchange`
- **Initial Load (<2 seconds):** silently calls `skipWaiting()`
- **App Running (>2 seconds):** shows non-blocking bottom banner with "Update Now" / dismiss
- On "Update Now": sends `SKIP_WAITING` → page reloads on `controllerchange`

**Settings Page (`/pages/Settings.tsx`)**
- Shows both App version (from `metadata.json`) and active Service Worker version
- "Deregister Service Worker" button for troubleshooting version mismatches

### Implementation Notes

**When modifying `sw.js`:**
- Keep version fetching at startup (lines 6–18)
- Maintain `CACHE_NAME = 'our-house-v${VERSION}'` format
- Do NOT auto-call `skipWaiting()` — let the client decide
- Keep `GET_VERSION` and `SKIP_WAITING` message handlers

**When modifying `PWAUpdate.tsx`:**
- Keep initial load detection threshold at 2 seconds
- Preserve `checkIsInitialLoad()` function
- Keep auto-reload on `controllerchange` event

### Troubleshooting Version Mismatches

Settings → "Troubleshooting" → "Deregister Service Worker" → app reloads.

Or via browser console:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).then(() => location.reload());
```

### Deployment Checklist
- [ ] Update version in `/metadata.json`
- [ ] Check Settings shows updated version locally
- [ ] Test update notification: open app, deploy, refresh in another tab
- [ ] Test initial load: hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
