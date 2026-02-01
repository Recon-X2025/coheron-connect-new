import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { CloudOff, RefreshCw, AlertTriangle, Clock, Wifi, WifiOff, Download } from 'lucide-react';

const API = '/api/pos/offline-sync';

const sCard: React.CSSProperties = { background: '#141414', borderRadius: 12, border: '1px solid #222', padding: 24 };
const sBtn: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const sBtnSm: React.CSSProperties = { ...sBtn, padding: '6px 14px', fontSize: 13 };
const sBadge = (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: color + '22', color });

export const OfflineSyncManager: FC = () => {
  const [storeStatus, setStoreStatus] = useState<any>(null);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [storeId, _setStoreId] = useState('default');
  const [terminalId, _setTerminalId] = useState('terminal-1');
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = () => fetch(`${API}/sync-status/${storeId}`).then(r => r.json()).then(setStoreStatus).catch(() => {});
  const fetchPending = () => fetch(`${API}/pending/${terminalId}`).then(r => r.json()).then(setPendingItems).catch(() => {});

  useEffect(() => { fetchStatus(); fetchPending(); }, [storeId, terminalId]);

  const triggerSync = async () => {
    setSyncing(true);
    const operations = pendingItems.map(item => ({
      store_id: item.store_id,
      terminal_id: item.terminal_id,
      operation_type: item.operation_type,
      payload: item.payload,
      created_offline_at: item.created_offline_at,
    }));
    if (operations.length > 0) {
      await fetch(`${API}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operations }) });
    }
    setSyncing(false);
    fetchStatus(); fetchPending();
  };

  const resolveConflict = async (id: string, resolution: string) => {
    await fetch(`${API}/resolve-conflict/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolution }) });
    fetchPending(); fetchStatus();
  };

  const downloadSnapshot = async () => {
    const data = await fetch(`${API}/snapshot`, { method: 'POST' }).then(r => r.json());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `offline-snapshot-${Date.now()}.json`; a.click();
  };

  const statusColor = (s: string) => ({ pending: '#f59e0b', conflict: '#ef4444', failed: '#ef4444', syncing: '#3b82f6', synced: '#00C971' }[s] || '#888');

  const conflicts = pendingItems.filter(i => i.status === 'conflict');

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}><CloudOff size={28} style={{ marginRight: 10, verticalAlign: 'middle', color: '#00C971' }} />Offline Sync Manager</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...sBtn, background: '#3b82f6' }} onClick={downloadSnapshot}><Download size={16} style={{ marginRight: 6 }} />Download Snapshot</button>
          <button style={sBtn} onClick={triggerSync} disabled={syncing}>
            <RefreshCw size={16} style={{ marginRight: 6, animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ ...sCard, textAlign: 'center' }}>
          <Clock size={24} color="#f59e0b" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 28, fontWeight: 700 }}>{storeStatus?.pending || 0}</div>
          <div style={{ fontSize: 13, color: '#888' }}>Pending</div>
        </div>
        <div style={{ ...sCard, textAlign: 'center' }}>
          <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 28, fontWeight: 700 }}>{storeStatus?.conflicts || 0}</div>
          <div style={{ fontSize: 13, color: '#888' }}>Conflicts</div>
        </div>
        <div style={{ ...sCard, textAlign: 'center' }}>
          <WifiOff size={24} color="#ef4444" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 28, fontWeight: 700 }}>{storeStatus?.failed || 0}</div>
          <div style={{ fontSize: 13, color: '#888' }}>Failed</div>
        </div>
        <div style={{ ...sCard, textAlign: 'center' }}>
          <Wifi size={24} color="#00C971" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>{storeStatus?.last_synced ? new Date(storeStatus.last_synced).toLocaleString() : 'Never'}</div>
          <div style={{ fontSize: 13, color: '#888' }}>Last Synced</div>
        </div>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div style={{ ...sCard, marginBottom: 24, borderColor: '#ef4444' }}>
          <h3 style={{ margin: '0 0 16px', color: '#ef4444' }}><AlertTriangle size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Conflicts ({conflicts.length})</h3>
          {conflicts.map((item: any) => (
            <div key={item.id || item._id} style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.operation_type}</span>
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>Terminal: {item.terminal_id}</span>
                </div>
                <span style={{ fontSize: 12, color: '#888' }}>{new Date(item.created_offline_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={sBtnSm} onClick={() => resolveConflict(item.id || item._id, 'keep_local')}>Keep Local</button>
                <button style={{ ...sBtnSm, background: '#3b82f6' }} onClick={() => resolveConflict(item.id || item._id, 'keep_server')}>Keep Server</button>
                <button style={{ ...sBtnSm, background: '#f59e0b', color: '#000' }} onClick={() => resolveConflict(item.id || item._id, 'merge')}>Merge</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending & Failed Queue */}
      <div style={sCard}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Sync Queue ({pendingItems.length} items)</h3>
        {pendingItems.length === 0 ? <p style={{ color: '#888' }}>All synced. No pending operations.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', color: '#888', fontSize: 13 }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Operation</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Terminal</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Status</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Created Offline</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Retries</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.map((item: any) => (
                <tr key={item.id || item._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: 8, textTransform: 'capitalize' }}>{item.operation_type}</td>
                  <td style={{ padding: 8, color: '#888' }}>{item.terminal_id}</td>
                  <td style={{ padding: 8 }}><span style={sBadge(statusColor(item.status))}>{item.status}</span></td>
                  <td style={{ padding: 8, color: '#888', fontSize: 12 }}>{new Date(item.created_offline_at).toLocaleString()}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{item.retry_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OfflineSyncManager;
