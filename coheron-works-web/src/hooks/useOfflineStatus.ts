import { useState, useEffect } from 'react';
import { syncManager } from '../services/syncManager.js';

interface OfflineStatus {
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncTime: Date | null;
  syncing: boolean;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncManager.subscribe((status) => {
      setSyncing(status.syncing);
      setPendingSyncCount(status.pendingCount);
      setLastSyncTime(status.lastSync);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  return { isOnline, pendingSyncCount, lastSyncTime, syncing };
}
