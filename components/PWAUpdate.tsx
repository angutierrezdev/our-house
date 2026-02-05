import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

type Platform = 'web' | 'ios' | 'android';

const PWAUpdate: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [platform, setPlatform] = useState<Platform>('web');

  // Detect platform (iOS, Android, or Web)
  const detectPlatform = (): Platform => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);

    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'web';
  };

  // Fetch current version from metadata.json
  const fetchCurrentVersion = async () => {
    try {
      const response = await fetch('/our-house/metadata.json');
      const data = await response.json();
      return data.version || null;
    } catch (error) {
      console.error('Failed to fetch version from metadata.json:', error);
      return null;
    }
  };

  // Store version in localStorage (for iOS fallback)
  const storeVersionInStorage = (version: string) => {
    try {
      localStorage.setItem('our-house-app-version', version);
    } catch (error) {
      console.warn('Failed to store version in localStorage:', error);
    }
  };

  // Get stored version from localStorage
  const getStoredVersion = (): string | null => {
    try {
      return localStorage.getItem('our-house-app-version');
    } catch (error) {
      console.warn('Failed to retrieve stored version:', error);
      return null;
    }
  };

  // Detect if this is initial app load (within first 2 seconds)
  const checkIsInitialLoad = () => {
    const pageLoadTime = performance.timing?.navigationStart || 0;
    const currentTime = Date.now();
    const timeSinceLoad = currentTime - pageLoadTime;
    return timeSinceLoad < 2000; // Consider initial load if less than 2 seconds
  };

  // Handle iOS version checking via localStorage
  const initializeIOSVersionCheck = async (fetchedVersion: string | null) => {
    if (!fetchedVersion) return;

    const storedVersion = getStoredVersion();
    
    if (storedVersion && storedVersion !== fetchedVersion) {
      // Version mismatch detected - update is available
      setNewVersion(fetchedVersion);
      const isInitialLoad = checkIsInitialLoad();
      
      if (isInitialLoad) {
        // Silently update on initial load
        storeVersionInStorage(fetchedVersion);
        window.location.reload();
      } else {
        // Show notification for running app
        setShowNotification(true);
      }
    } else if (!storedVersion) {
      // First time - store the version
      storeVersionInStorage(fetchedVersion);
    }
  };

  useEffect(() => {
    const init = async () => {
      const detectedPlatform = detectPlatform();
      setPlatform(detectedPlatform);
      setIsInitialLoad(checkIsInitialLoad());
      
      const version = await fetchCurrentVersion();
      setCurrentVersion(version);

      // Platform-specific initialization
      if (detectedPlatform === 'ios') {
        // iOS: Use localStorage for version tracking (service workers have limited support)
        if (version) {
          await initializeIOSVersionCheck(version);
        }
      } else if ('serviceWorker' in navigator) {
        // Web & Android: Use service workers (full support)
        try {
          const registration = await navigator.serviceWorker.register('/our-house/sw.js');
          
          // Check if there is already a waiting worker
          if (registration.waiting) {
            const shouldAutoUpdate = checkIsInitialLoad();
            if (shouldAutoUpdate) {
              // Auto-update on initial load without notification
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
              // Show notification when app is running
              setWaitingWorker(registration.waiting);
              setShowNotification(true);
              setNewVersion(version);
            }
          }

          // Listen for new workers being installed
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version found and installed!
                  const isInitialLoad = checkIsInitialLoad();
                  if (isInitialLoad) {
                    // Auto-update on initial load
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    // Show notification when app is running
                    setWaitingWorker(newWorker);
                    setShowNotification(true);
                    setNewVersion(version);
                  }
                }
              });
            }
          });

          // Handle controller change (reloads the page when the new worker takes over)
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true;
              window.location.reload();
            }
          });
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    init();
  }, []);

  const reloadToUpdate = () => {
    if (platform === 'ios') {
      // iOS: Force a reload to get the new version from cache/storage
      storeVersionInStorage(newVersion || currentVersion || '');
      window.location.reload();
    } else if (waitingWorker) {
      // Web/Android: Use service worker to activate new version
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowNotification(false);
  };

  if (!showNotification) return null;

  const versionText = newVersion && currentVersion
    ? `${currentVersion} → ${newVersion}`
    : 'latest version';

  const getPlatformMessage = () => {
    switch (platform) {
      case 'ios':
        return 'Quit and reopen the app to install the latest version';
      case 'android':
        return 'New version available for your Android app';
      default:
        return 'New version available for your web app';
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-2xl border border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-full animate-spin-slow">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Update Available</p>
            <p className="text-xs text-gray-400">
              {newVersion ? `New version: ${versionText}` : getPlatformMessage()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowNotification(false)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <button 
            onClick={reloadToUpdate}
            className="px-4 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            {platform === 'ios' ? 'Restart App' : 'Update Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdate;
