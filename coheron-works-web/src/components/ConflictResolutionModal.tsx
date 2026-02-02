import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import { ConflictResolver, type ConflictItem, type Resolution } from '../services/conflictResolver.js';

const sOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const sModal: React.CSSProperties = { background: '#141414', borderRadius: 12, border: '1px solid #333', width: 640, maxHeight: '80vh', overflow: 'auto', padding: 24 };
const sBtn = (bg: string): React.CSSProperties => ({ background: bg, color: bg === '#00C971' ? '#000' : '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 });

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<Props> = ({ open, onClose }) => {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [resolving, setResolving] = useState<number | null>(null);

  const load = async () => {
    setConflicts(await ConflictResolver.getConflicts());
  };

  useEffect(() => { if (open) load(); }, [open]);

  const handleResolve = async (id: number, resolution: Resolution) => {
    setResolving(id);
    await ConflictResolver.resolve(id, resolution);
    await load();
    setResolving(null);
    if (conflicts.length <= 1) onClose();
  };

  if (!open || conflicts.length === 0) return null;

  return (
    <div style={sOverlay} onClick={onClose}>
      <div style={sModal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
            <AlertTriangle size={20} style={{ color: '#f59e0b' }} /> Sync Conflicts ({conflicts.length})
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {conflicts.map(conflict => (
          <div key={conflict.id} style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{conflict.collection}</span>
                {conflict.document_id && <span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>ID: {conflict.document_id.slice(0, 8)}...</span>}
              </div>
              <span style={{ fontSize: 12, color: '#888' }}>{new Date(conflict.timestamp).toLocaleString()}</span>
            </div>

            <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
              <strong>Local changes:</strong>
              <pre style={{ background: '#0a0a0a', padding: 8, borderRadius: 6, margin: '4px 0', maxHeight: 100, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(conflict.local_data, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={sBtn('#00C971')} disabled={resolving === conflict.id} onClick={() => handleResolve(conflict.id, 'keep_local')}>
                <Check size={14} style={{ marginRight: 4 }} /> Keep Local
              </button>
              <button style={sBtn('#3b82f6')} disabled={resolving === conflict.id} onClick={() => handleResolve(conflict.id, 'keep_server')}>
                Keep Server
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
