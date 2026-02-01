import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Truck, CheckCircle, Send, Package, ArrowRight } from 'lucide-react';

interface Transfer {
  _id: string;
  transfer_number: string;
  source_entity: string;
  destination_entity: string;
  lines: any[];
  total_value: number;
  status: string;
  transfer_date: string;
  expected_delivery: string;
  actual_delivery: string;
  created_at: string;
}

const API = '/api/inventory/intercompany';

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#1a1a2e', text: '#8888aa' },
  pending_approval: { bg: '#2a2a1a', text: '#bbbb44' },
  approved: { bg: '#1a2a1a', text: '#44bb44' },
  in_transit: { bg: '#1a1a2e', text: '#4488ee' },
  received: { bg: '#1a2a1a', text: '#00C971' },
  cancelled: { bg: '#2a1a1a', text: '#bb4444' },
};

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const IntercompanyTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    source_entity: '', destination_entity: '', source_warehouse_id: '', destination_warehouse_id: '',
    expected_delivery: '', notes: '',
  });

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTransfers(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const createTransfer = async () => {
    try {
      const res = await fetch(API, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ ...formData, status: 'draft', lines: [] }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowCreate(false);
      setFormData({ source_entity: '', destination_entity: '', source_warehouse_id: '', destination_warehouse_id: '', expected_delivery: '', notes: '' });
      fetchTransfers();
    } catch (e: any) { setError(e.message); }
  };

  const performAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`${API}/${id}/${action}`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Action failed'); }
      fetchTransfers();
    } catch (e: any) { setError(e.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Intercompany Transfers</h1>
        <button onClick={() => setShowCreate(true)} style={greenBtnStyle}><Plus size={16} /> New Transfer</button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="in_transit">In Transit</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : (
        <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['Transfer #', 'From', 'To', 'Items', 'Total Value', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={cellStyle}><span style={{ color: '#00C971', fontWeight: 500 }}>{t.transfer_number}</span></td>
                  <td style={cellStyle}>{t.source_entity}</td>
                  <td style={cellStyle}>{t.destination_entity}</td>
                  <td style={cellStyle}>{t.lines?.length || 0}</td>
                  <td style={cellStyle}>${t.total_value?.toLocaleString() || '0'}</td>
                  <td style={cellStyle}>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, backgroundColor: statusColors[t.status]?.bg, color: statusColors[t.status]?.text }}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={cellStyle}>{t.transfer_date ? new Date(t.transfer_date).toLocaleDateString() : '-'}</td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {t.status === 'pending_approval' && <button onClick={() => performAction(t._id, 'approve')} style={smallBtnStyle} title="Approve"><CheckCircle size={13} /></button>}
                      {t.status === 'approved' && <button onClick={() => performAction(t._id, 'ship')} style={smallBtnStyle} title="Ship"><Truck size={13} /></button>}
                      {t.status === 'in_transit' && <button onClick={() => performAction(t._id, 'receive')} style={smallBtnStyle} title="Receive"><Package size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#6e6e6e' }}>No transfers found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>Prev</button>
          <span style={{ padding: '8px 12px', color: '#939393', fontSize: 14 }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Next</button>
        </div>
      )}

      {showCreate && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>New Intercompany Transfer</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>Source Entity<input value={formData.source_entity} onChange={e => setFormData({ ...formData, source_entity: e.target.value })} style={inputStyle} placeholder="Company A" /></label>
              <label style={labelStyle}>Destination Entity<input value={formData.destination_entity} onChange={e => setFormData({ ...formData, destination_entity: e.target.value })} style={inputStyle} placeholder="Company B" /></label>
              <label style={labelStyle}>Source Warehouse ID<input value={formData.source_warehouse_id} onChange={e => setFormData({ ...formData, source_warehouse_id: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Destination Warehouse ID<input value={formData.destination_warehouse_id} onChange={e => setFormData({ ...formData, destination_warehouse_id: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Expected Delivery<input type="date" value={formData.expected_delivery} onChange={e => setFormData({ ...formData, expected_delivery: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Notes<textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreate(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={createTransfer} style={{ ...greenBtnStyle, padding: '8px 16px' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#ccc' };
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' };
const selectStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const greenBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 };
const smallBtnStyle: React.CSSProperties = { padding: 6, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#939393', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#939393', cursor: 'pointer', fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };

export default IntercompanyTransfers;
