import React from 'react';
import { WifiOff, RefreshCw, Clock } from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus.js';
import { syncManager } from '../services/syncManager.js';

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingSyncCount, lastSyncTime, syncing } = useOfflineStatus();

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: isOnline ? '#1a3a2a' : '#3a1a1a',
      borderBottom: `1px solid ${isOnline ? '#00C971' : '#ef4444'}`,
      padding: '8px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 13, color: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isOnline && <WifiOff size={14} style={{ color: '#ef4444' }} />}
        <span>
          {!isOnline
            ? 'You are offline. Changes will sync when connection is restored.'
            : `${pendingSyncCount} change(s) pending sync.`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {lastSyncTime && (
          <span style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} /> Last sync: {lastSyncTime.toLocaleTimeString()}
          </span>
        )}
        {isOnline && pendingSyncCount > 0 && (
          <button
            onClick={() => syncManager.sync()}
            disabled={syncing}
            style={{
              background: '#00C971', color: '#000', border: 'none', borderRadius: 6,
              padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;
