import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

const PWAUpdate: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // Detect if this is initial app load (within first 2 seconds)
  const checkIsInitialLoad = () => {
    const pageLoadTime = performance.timing?.navigationStart || 0;
    const currentTime = Date.now();
    const timeSinceLoad = currentTime - pageLoadTime;
    return timeSinceLoad < 2000; // Consider initial load if less than 2 seconds
  };

  useEffect(() => {
    const init = async () => {
      setIsInitialLoad(checkIsInitialLoad());
      const version = await fetchCurrentVersion();
      setCurrentVersion(version);

      if ('serviceWorker' in navigator) {
        // Register the service worker
        navigator.serviceWorker.register('/our-house/sw.js').then((registration) => {
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
              setNewVersion(version); // Use current metadata version as new version
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
        });

        // Handle controller change (reloads the page when the new worker takes over)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      }
    };

    init();
  }, []);

  const reloadToUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowNotification(false);
  };

  if (!showNotification) return null;

  const versionText = newVersion && currentVersion
    ? `${currentVersion} → ${newVersion}`
    : 'latest version';

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
              {newVersion ? `New version available: ${versionText}` : 'Restart for the latest version'}
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
            className="px-4 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 transition-colors"
          >
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdate;
