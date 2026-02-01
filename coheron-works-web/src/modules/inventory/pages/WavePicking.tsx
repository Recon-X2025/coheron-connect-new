import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Play, CheckCircle, Send, ChevronLeft, Package, Users, BarChart3 } from 'lucide-react';

interface PickWave {
  _id: string;
  wave_number: string;
  warehouse_id: any;
  status: string;
  pick_type: string;
  priority: string;
  orders: any[];
  pick_lists: any[];
  assigned_to: any[];
  total_items: number;
  picked_items: number;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

interface PickListDetail {
  _id: string;
  pick_list_number: string;
  wave_id: any;
  warehouse_id: any;
  assigned_to: any;
  status: string;
  items: any[];
  started_at?: string;
  completed_at?: string;
}

const API = '/api/inventory/wave-picking';

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#1a1a2e', text: '#8888aa' },
  released: { bg: '#1a2a1a', text: '#44bb44' },
  in_progress: { bg: '#2a2a1a', text: '#bbbb44' },
  completed: { bg: '#1a2a1a', text: '#00C971' },
  cancelled: { bg: '#2a1a1a', text: '#bb4444' },
  pending: { bg: '#1a1a2e', text: '#8888aa' },
  partial: { bg: '#2a2a1a', text: '#bbbb44' },
};

const priorityColors: Record<string, string> = {
  low: '#6e6e6e',
  normal: '#939393',
  high: '#ee8833',
  urgent: '#ee3333',
};

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  };
}

export const WavePicking: React.FC = () => {
  const [waves, setWaves] = useState<PickWave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWave, setSelectedWave] = useState<PickWave | null>(null);
  const [pickLists, setPickLists] = useState<PickListDetail[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Create form
  const [formData, setFormData] = useState({
    warehouse_id: '',
    pick_type: 'wave',
    priority: 'normal',
    notes: '',
    orders: [] as string[],
    orderInput: '',
  });

  const fetchWaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('pick_type', typeFilter);
      const res = await fetch(`${API}?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch waves');
      const data = await res.json();
      setWaves(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => { fetchWaves(); }, [fetchWaves]);

  const fetchWaveDetail = async (id: string) => {
    try {
      const res = await fetch(`${API}/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch wave');
      const data = await res.json();
      setSelectedWave(data);
      setPickLists(data.pick_lists_detail || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const createWave = async () => {
    try {
      const body = {
        warehouse_id: formData.warehouse_id,
        pick_type: formData.pick_type,
        priority: formData.priority,
        notes: formData.notes,
        orders: formData.orders,
      };
      const res = await fetch(API, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create wave');
      setShowCreate(false);
      setFormData({ warehouse_id: '', pick_type: 'wave', priority: 'normal', notes: '', orders: [], orderInput: '' });
      fetchWaves();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const performAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`${API}/${id}/${action}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }
      fetchWaves();
      if (selectedWave?._id === id) fetchWaveDetail(id);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredWaves = waves.filter(w =>
    w.wave_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(total / 20);

  if (selectedWave) {
    const progress = selectedWave.total_items > 0
      ? Math.round((selectedWave.picked_items / selectedWave.total_items) * 100)
      : 0;

    return (
      <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
        <button
          onClick={() => setSelectedWave(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#939393', cursor: 'pointer', marginBottom: 16, fontSize: 14 }}
        >
          <ChevronLeft size={16} /> Back to Waves
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{selectedWave.wave_number}</h1>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 12, fontSize: 12,
                backgroundColor: statusColors[selectedWave.status]?.bg || '#1a1a1a',
                color: statusColors[selectedWave.status]?.text || '#939393',
              }}>
                {selectedWave.status.replace('_', ' ')}
              </span>
              <span style={{ color: '#6e6e6e', fontSize: 13 }}>Type: {selectedWave.pick_type}</span>
              <span style={{ color: priorityColors[selectedWave.priority], fontSize: 13 }}>
                Priority: {selectedWave.priority}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedWave.status === 'draft' && (
              <button onClick={() => performAction(selectedWave._id, 'release')} style={actionBtnStyle('#00C971')}>
                <Send size={14} /> Release
              </button>
            )}
            {selectedWave.status === 'released' && (
              <button onClick={() => performAction(selectedWave._id, 'start')} style={actionBtnStyle('#ee8833')}>
                <Play size={14} /> Start Picking
              </button>
            )}
            {selectedWave.status === 'in_progress' && (
              <button onClick={() => performAction(selectedWave._id, 'complete')} style={actionBtnStyle('#00C971')}>
                <CheckCircle size={14} /> Complete
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Orders', value: selectedWave.orders?.length || 0, icon: <Package size={18} /> },
            { label: 'Pick Lists', value: pickLists.length, icon: <BarChart3 size={18} /> },
            { label: 'Total Items', value: selectedWave.total_items, icon: <Users size={18} /> },
            { label: 'Picked', value: selectedWave.picked_items, icon: <CheckCircle size={18} /> },
          ].map((s, i) => (
            <div key={i} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6e6e6e', fontSize: 13, marginBottom: 8 }}>
                {s.label} {s.icon}
              </div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#939393' }}>
            <span>Overall Progress</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 8, backgroundColor: '#222', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#00C971', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Pick Lists */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Pick Lists</h2>
        {pickLists.length === 0 ? (
          <div style={{ color: '#6e6e6e', padding: 24, textAlign: 'center', backgroundColor: '#141414', borderRadius: 8 }}>
            No pick lists generated yet. Release the wave to generate pick lists.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pickLists.map(pl => {
              const plPicked = pl.items.filter((i: any) => i.status === 'picked').length;
              const plTotal = pl.items.length;
              const plProgress = plTotal > 0 ? Math.round((plPicked / plTotal) * 100) : 0;
              return (
                <div key={pl._id} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{pl.pick_list_number}</span>
                    <span style={{
                      padding: '2px 10px', borderRadius: 12, fontSize: 12,
                      backgroundColor: statusColors[pl.status]?.bg || '#1a1a1a',
                      color: statusColors[pl.status]?.text || '#939393',
                    }}>
                      {pl.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6e6e6e', marginBottom: 8 }}>
                    Assigned: {pl.assigned_to?.name || 'Unassigned'} | Items: {plPicked}/{plTotal}
                  </div>
                  <div style={{ height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${plProgress}%`, backgroundColor: '#00C971', borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Wave / Batch Picking</h1>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
          <Plus size={16} /> Create Wave
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#6e6e6e' }} />
          <input
            type="text"
            placeholder="Search waves..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 8px 8px 34px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="released">Released</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All Types</option>
          <option value="wave">Wave</option>
          <option value="batch">Batch</option>
          <option value="zone">Zone</option>
          <option value="cluster">Cluster</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : filteredWaves.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>No waves found</div>
      ) : (
        <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['Wave #', 'Type', 'Warehouse', 'Status', 'Priority', 'Orders', 'Progress', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredWaves.map(w => {
                const prog = w.total_items > 0 ? Math.round((w.picked_items / w.total_items) * 100) : 0;
                return (
                  <tr key={w._id} style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }} onClick={() => fetchWaveDetail(w._id)}>
                    <td style={cellStyle}><span style={{ color: '#00C971', fontWeight: 500 }}>{w.wave_number}</span></td>
                    <td style={cellStyle}>{w.pick_type}</td>
                    <td style={cellStyle}>{w.warehouse_id?.name || '-'}</td>
                    <td style={cellStyle}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 12, fontSize: 12,
                        backgroundColor: statusColors[w.status]?.bg, color: statusColors[w.status]?.text,
                      }}>{w.status.replace('_', ' ')}</span>
                    </td>
                    <td style={cellStyle}><span style={{ color: priorityColors[w.priority] }}>{w.priority}</span></td>
                    <td style={cellStyle}>{w.orders?.length || 0}</td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${prog}%`, backgroundColor: '#00C971', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#6e6e6e', minWidth: 32 }}>{prog}%</span>
                      </div>
                    </td>
                    <td style={cellStyle}>{new Date(w.created_at).toLocaleDateString()}</td>
                    <td style={cellStyle} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {w.status === 'draft' && (
                          <button onClick={() => performAction(w._id, 'release')} style={smallBtnStyle} title="Release">
                            <Send size={13} />
                          </button>
                        )}
                        {w.status === 'released' && (
                          <button onClick={() => performAction(w._id, 'start')} style={smallBtnStyle} title="Start">
                            <Play size={13} />
                          </button>
                        )}
                        {w.status === 'in_progress' && (
                          <button onClick={() => performAction(w._id, 'complete')} style={smallBtnStyle} title="Complete">
                            <CheckCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>Prev</button>
          <span style={{ padding: '8px 12px', color: '#939393', fontSize: 14 }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Next</button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>Create Pick Wave</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>
                Warehouse ID
                <input value={formData.warehouse_id} onChange={e => setFormData({ ...formData, warehouse_id: e.target.value })} style={inputStyle} placeholder="Enter warehouse ID" />
              </label>
              <label style={labelStyle}>
                Pick Type
                <select value={formData.pick_type} onChange={e => setFormData({ ...formData, pick_type: e.target.value })} style={inputStyle}>
                  <option value="wave">Wave</option>
                  <option value="batch">Batch</option>
                  <option value="zone">Zone</option>
                  <option value="cluster">Cluster</option>
                </select>
              </label>
              <label style={labelStyle}>
                Priority
                <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} style={inputStyle}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label style={labelStyle}>
                Order IDs (comma-separated)
                <input value={formData.orderInput} onChange={e => {
                  setFormData({ ...formData, orderInput: e.target.value, orders: e.target.value.split(',').map(s => s.trim()).filter(Boolean) });
                }} style={inputStyle} placeholder="order_id_1, order_id_2" />
              </label>
              <label style={labelStyle}>
                Notes
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={createWave} style={{ padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#ccc' };
const selectStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const smallBtnStyle: React.CSSProperties = { padding: 6, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#939393', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#939393', cursor: 'pointer', fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };

function actionBtnStyle(color: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: color, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 };
}

export default WavePicking;
