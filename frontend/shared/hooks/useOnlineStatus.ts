import { useEffect, useState } from 'react';

/**
 * Shared online/offline status (Z5). Tracks `navigator.onLine` plus the
 * browser `online` / `offline` events so every app surfaces connectivity
 * the same way. Initial value is read synchronously so a first render
 * while offline already shows the notice.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    // Re-sync in case the state changed between render and effect.
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
