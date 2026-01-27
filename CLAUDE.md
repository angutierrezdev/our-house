# Our House - PWA Version Management & Update System

## Overview

This document describes the PWA (Progressive Web App) versioning and automatic update system for the Our House application. The system automatically detects when a new version is available and notifies users with an option to reload or auto-updates during initial page loads.

## Version Management

### Single Source of Truth: `metadata.json`

All versioning is controlled through `/metadata.json`. The version number defined here is:
- Read by the service worker during installation
- Displayed in the Settings page
- Used to differentiate cache names (prevents stale cache conflicts)

**Location:** `/metadata.json`
```json
{
  "name": "Our House",
  "version": "2.1.2",
  "description": "...",
  "requestFramePermissions": []
}
```

### How to Version Bump

1. **Update `/metadata.json` with new version:**
   ```json
   {
     "version": "2.1.3"
   }
   ```

2. **Commit and deploy** the updated `metadata.json`

3. **The system will automatically:**
   - Detect the new version when users refresh/reload
   - Show an update notification banner if the app is running
   - Auto-update without notification if it's the first page load
   - Clear old service worker caches

**Note:** Increment version using semantic versioning (MAJOR.MINOR.PATCH)

## System Components

### 1. Service Worker (`/public/sw.js`)

**Responsibilities:**
- Fetches version from `metadata.json` on startup
- Creates cache with version-based naming (e.g., `our-house-v2.1.2`)
- Implements cache-first fetch strategy
- Cleans up old caches when version changes
- Communicates version to client via `MessageChannel`

**Key Features:**
- Does NOT auto-call `skipWaiting()` to allow user notification
- Responds to `GET_VERSION` messages from client
- Responds to `SKIP_WAITING` messages to activate new worker

### 2. PWA Update Component (`/components/PWAUpdate.tsx`)

**Responsibilities:**
- Registers the service worker
- Detects when an update is available
- Shows version information in notification
- Implements initial load detection

**Update Detection Logic:**
- **Initial Load (<2 seconds):** Auto-updates silently without notification
- **App Running (>2 seconds):** Shows non-blocking notification banner

**Notification Display:**
- Shows current version → new version (e.g., "2.1.1 → 2.1.2")
- Provides "Update Now" button (optional)
- Provides dismiss button (X)
- Auto-reloads page after user clicks "Update Now"

**How It Works:**
1. Registers service worker on component mount
2. Checks if `registration.waiting` exists (update already queued)
3. Listens for `updatefound` event (new update being installed)
4. Detects initial load using `performance.timing.navigationStart`
5. On initial load: silently calls `skipWaiting()`
6. On running app: shows notification and waits for user action
7. Listens for `controllerchange` event and reloads page

### 3. Settings Page (`/pages/Settings.tsx`)

**Version Display:**
- Shows current App version (from `metadata.json`)
- Shows current Service Worker version (from active SW)
- Located at bottom of settings page under "App Version & Cache"

**Useful for:**
- Debugging version mismatches
- Confirming service worker updates
- User transparency

## User Experience

### For First-Time Visitors
1. User loads app for first time
2. Service worker installs in background
3. No notification shown (detected as initial load)
4. Service worker silently activated
5. User sees app without interruption

### For Returning Users (App is Running)
1. User is already using the app
2. New version deployed (version in `metadata.json` changed)
3. Browser detects new service worker
4. **Non-blocking notification appears at bottom:**
   - Shows "Update Available" with version info
   - User can dismiss with X button
   - User can click "Update Now" to reload
5. If dismissed: notification stays hidden until next reload
6. If "Update Now" clicked: service worker activated and page reloads

### For Returning Users (App Closed, Returning Later)
1. User hasn't had the app open in a while
2. Opens app to find new version available
3. Service worker detects update is already waiting
4. Update is applied automatically (initial load detection)
5. User sees app without notification

## Message Protocol

### Service Worker ↔ Client Communication

**Message: `GET_VERSION`**
```javascript
const channel = new MessageChannel();
channel.port1.onmessage = (event) => {
  console.log('SW version:', event.data.version);
};
worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
```

**Message: `SKIP_WAITING`**
```javascript
worker.postMessage({ type: 'SKIP_WAITING' });
```

## Troubleshooting

### Version Mismatch

**Symptom:** Settings shows different app and SW versions, or app is not updating

**Solution:**
1. Go to Settings page
2. Scroll to "Troubleshooting" section
3. Click "Deregister Service Worker"
4. App will automatically reload and fetch latest version

### Manual Cache Clear

**Command in browser console:**
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
}).then(() => window.location.reload());
```

## Implementation Notes for Agents

### When Modifying Service Worker
- Keep version fetching at startup (lines 6-18 in sw.js)
- Maintain `CACHE_NAME = 'our-house-v${VERSION}'` format
- Do NOT auto-call `skipWaiting()` - let client decide
- Maintain `GET_VERSION` and `SKIP_WAITING` message handlers

### When Modifying PWAUpdate Component
- Keep initial load detection threshold at 2 seconds
- Preserve `checkIsInitialLoad()` function
- Maintain non-blocking notification positioning
- Keep auto-reload on `controllerchange` event

### When Modifying Settings
- Keep version display in sync with app/SW versions
- Fetch from both `metadata.json` and service worker
- Deregister button should force user to reload

### Deployment Checklist
- [ ] Update version in `/metadata.json`
- [ ] Test locally: Check Settings shows updated version
- [ ] Test update notification: Open app, deploy new version, refresh in another tab
- [ ] Test initial load: Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
- [ ] Monitor for any version mismatches in Settings page

## Files to Know

| File | Purpose |
|------|---------|
| `/metadata.json` | Single source of truth for version |
| `/public/sw.js` | Service worker implementation |
| `/components/PWAUpdate.tsx` | Update detection & notification UI |
| `/pages/Settings.tsx` | Version display & troubleshooting |
| `/public/manifest.json` | PWA manifest (icons, display mode) |
| `/index.tsx` | PWAUpdate component mounted here |

## Performance Impact

- **Startup:** ~10-50ms to fetch `metadata.json` in service worker
- **Cache Overhead:** One cache per version (old caches auto-deleted on activate)
- **Message Communication:** Negligible (<1ms)
- **Update Detection:** Automatic and asynchronous, does not block rendering
