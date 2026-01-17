import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PWAContext = createContext();

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updateWorker, setUpdateWorker] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check if app is already installed
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => mediaQuery.removeEventListener('change', checkInstalled);
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker and handle updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Import the registerSW from virtual module
      import('virtual:pwa-register').then(({ registerSW }) => {
        const updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            // Auto-update: immediately apply the update
            console.log('New content available, updating...');
            updateSW(true);
          },
          onOfflineReady() {
            console.log('App ready to work offline');
          },
          onRegisteredSW(swUrl, registration) {
            console.log('Service Worker registered:', swUrl);
            setUpdateWorker(registration);
            
            // Check for updates every 30 seconds for faster updates
            setInterval(() => {
              console.log('Checking for SW updates...');
              registration?.update();
            }, 30 * 1000);

            // Also check immediately on visibility change (when user returns to app)
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                registration?.update();
              }
            });
          },
          onRegisterError(error) {
            console.error('Service Worker registration error:', error);
          }
        });

        // Store the update function
        window.__updateSW = updateSW;
      }).catch(err => {
        console.log('PWA registration not available:', err);
      });
    }
  }, []);

  // Install the PWA
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('No installation prompt available');
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error installing app:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Update the app immediately
  const updateApp = useCallback(() => {
    if (window.__updateSW) {
      window.__updateSW(true);
    } else {
      // Fallback: reload the page
      window.location.reload();
    }
    setNeedsUpdate(false);
  }, []);

  // Skip waiting and activate new service worker
  const skipWaiting = useCallback(() => {
    if (updateWorker?.waiting) {
      updateWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    updateApp();
  }, [updateWorker, updateApp]);

  const value = {
    isInstallable,
    isInstalled,
    isOnline,
    needsUpdate,
    installApp,
    updateApp,
    skipWaiting
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};

export default PWAProvider;
