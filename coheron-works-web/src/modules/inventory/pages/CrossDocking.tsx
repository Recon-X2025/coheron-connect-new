import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ChevronLeft, ArrowRight, Truck, Package, Clock, CheckCircle, XCircle } from 'lucide-react';

interface CrossDockOrder {
  _id: string;
  cross_dock_number: string;
  warehouse_id: any;
  dock_location: string;
  status: string;
  items: any[];
  expected_receipt_date: string;
  expected_ship_date: string;
  actual_receipt_date?: string;
  actual_ship_date?: string;
  notes?: string;
  created_at: string;
}

const API = '/api/inventory/cross-docking';

const statusColors: Record<string, { bg: string; text: string }> = {
  planned: { bg: '#1a1a2e', text: '#8888aa' },
  receiving: { bg: '#1a2a2a', text: '#44aaaa' },
  staging: { bg: '#2a2a1a', text: '#bbbb44' },
  shipping: { bg: '#1a1a2e', text: '#4488ee' },
  completed: { bg: '#1a2a1a', text: '#00C971' },
  cancelled: { bg: '#2a1a1a', text: '#bb4444' },
};

const workflowSteps = ['planned', 'receiving', 'staging', 'shipping', 'completed'];

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const CrossDocking: React.FC = () => {
  const [orders, setOrders] = useState<CrossDockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CrossDockOrder | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    warehouse_id: '',
    dock_location: '',
    expected_receipt_date: '',
    expected_ship_date: '',
    notes: '',
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const fetchDetail = async (id: string) => {
    try {
      const res = await fetch(`${API}/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch order');
      setSelectedOrder(await res.json());
    } catch (e: any) { setError(e.message); }
  };

  const createOrder = async () => {
    try {
      const res = await fetch(API, { method: 'POST', headers: getHeaders(), body: JSON.stringify(formData) });
      if (!res.ok) throw new Error('Failed to create order');
      setShowCreate(false);
      setFormData({ warehouse_id: '', dock_location: '', expected_receipt_date: '', expected_ship_date: '', notes: '' });
      fetchOrders();
    } catch (e: any) { setError(e.message); }
  };

  const transitionOrder = async (id: string, action: string) => {
    try {
      const res = await fetch(`${API}/${id}/${action}`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      fetchOrders();
      if (selectedOrder?._id === id) fetchDetail(id);
    } catch (e: any) { setError(e.message); }
  };

  const getNextAction = (status: string): { action: string; label: string } | null => {
    const map: Record<string, { action: string; label: string }> = {
      planned: { action: 'receive', label: 'Start Receiving' },
      receiving: { action: 'stage', label: 'Move to Staging' },
      staging: { action: 'ship', label: 'Start Shipping' },
      shipping: { action: 'complete', label: 'Complete' },
    };
    return map[status] || null;
  };

  const filtered = orders.filter(o => o.cross_dock_number.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(total / 20);

  if (selectedOrder) {
    const stepIdx = workflowSteps.indexOf(selectedOrder.status);
    const next = getNextAction(selectedOrder.status);

    return (
      <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
        <button onClick={() => setSelectedOrder(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#939393', cursor: 'pointer', marginBottom: 16, fontSize: 14 }}>
          <ChevronLeft size={16} /> Back
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{selectedOrder.cross_dock_number}</h1>
            <span style={{ color: '#6e6e6e', fontSize: 13 }}>Dock: {selectedOrder.dock_location || '-'}</span>
          </div>
          {next && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
            <button onClick={() => transitionOrder(selectedOrder._id, next.action)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
              <ArrowRight size={14} /> {next.label}
            </button>
          )}
        </div>

        {/* Workflow visualization */}
        <div style={{ backgroundColor: '#141414', borderRadius: 8, padding: 20, border: '1px solid #222', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {workflowSteps.map((step, i) => {
              const isActive = i === stepIdx;
              const isDone = i < stepIdx;
              const color = isDone ? '#00C971' : isActive ? '#00C971' : '#333';
              return (
                <React.Fragment key={step}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isDone || isActive ? '#00C971' : '#222',
                      color: isDone || isActive ? '#000' : '#6e6e6e',
                      fontWeight: 600, fontSize: 14,
                    }}>
                      {isDone ? <CheckCircle size={16} /> : i + 1}
                    </div>
                    <span style={{ fontSize: 11, color: isActive ? '#fff' : '#6e6e6e', textTransform: 'capitalize' }}>{step}</span>
                  </div>
                  {i < workflowSteps.length - 1 && (
                    <div style={{ flex: 1, height: 2, backgroundColor: i < stepIdx ? '#00C971' : '#333', margin: '0 8px', marginBottom: 20 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Expected Receipt', value: selectedOrder.expected_receipt_date },
            { label: 'Expected Ship', value: selectedOrder.expected_ship_date },
            { label: 'Actual Receipt', value: selectedOrder.actual_receipt_date },
            { label: 'Actual Ship', value: selectedOrder.actual_ship_date },
          ].map((d, i) => (
            <div key={i} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
              <div style={{ color: '#6e6e6e', fontSize: 12, marginBottom: 4 }}>{d.label}</div>
              <div style={{ fontSize: 14 }}>{d.value ? new Date(d.value).toLocaleDateString() : '-'}</div>
            </div>
          ))}
        </div>

        {/* Items */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Items ({selectedOrder.items.length})</h2>
        {selectedOrder.items.length === 0 ? (
          <div style={{ color: '#6e6e6e', padding: 24, textAlign: 'center', backgroundColor: '#141414', borderRadius: 8 }}>No items</div>
        ) : (
          <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Product', 'Inbound PO', 'Outbound Order', 'Qty', 'Received', 'Shipped', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{item.product_id?.name || item.product_id}</td>
                    <td style={cellStyle}>{item.inbound_po_id?.po_number || item.inbound_po_id}</td>
                    <td style={cellStyle}>{item.outbound_order_id?.order_number || item.outbound_order_id}</td>
                    <td style={cellStyle}>{item.quantity}</td>
                    <td style={cellStyle}>{item.received_quantity}</td>
                    <td style={cellStyle}>{item.shipped_quantity}</td>
                    <td style={cellStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 12,
                        backgroundColor: item.status === 'shipped' ? '#1a2a1a' : '#1a1a2e',
                        color: item.status === 'shipped' ? '#00C971' : '#8888aa',
                      }}>{item.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Cross-Docking</h1>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
          <Plus size={16} /> New Cross-Dock
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#6e6e6e' }} />
          <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 8px 8px 34px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          {workflowSteps.map(s => <option key={s} value={s}>{s}</option>)}
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>No cross-dock orders found</div>
      ) : (
        <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['CD #', 'Warehouse', 'Dock', 'Status', 'Items', 'Receipt Date', 'Ship Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const next = getNextAction(o.status);
                return (
                  <tr key={o._id} style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }} onClick={() => fetchDetail(o._id)}>
                    <td style={cellStyle}><span style={{ color: '#00C971', fontWeight: 500 }}>{o.cross_dock_number}</span></td>
                    <td style={cellStyle}>{o.warehouse_id?.name || '-'}</td>
                    <td style={cellStyle}>{o.dock_location || '-'}</td>
                    <td style={cellStyle}>
                      <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, backgroundColor: statusColors[o.status]?.bg, color: statusColors[o.status]?.text }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={cellStyle}>{o.items.length}</td>
                    <td style={cellStyle}>{new Date(o.expected_receipt_date).toLocaleDateString()}</td>
                    <td style={cellStyle}>{new Date(o.expected_ship_date).toLocaleDateString()}</td>
                    <td style={cellStyle} onClick={e => e.stopPropagation()}>
                      {next && (
                        <button onClick={() => transitionOrder(o._id, next.action)} style={{ padding: '4px 10px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#00C971', cursor: 'pointer', fontSize: 12 }}>
                          {next.label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>New Cross-Dock Order</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>Warehouse ID<input value={formData.warehouse_id} onChange={e => setFormData({ ...formData, warehouse_id: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Dock Location<input value={formData.dock_location} onChange={e => setFormData({ ...formData, dock_location: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Expected Receipt Date<input type="date" value={formData.expected_receipt_date} onChange={e => setFormData({ ...formData, expected_receipt_date: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Expected Ship Date<input type="date" value={formData.expected_ship_date} onChange={e => setFormData({ ...formData, expected_ship_date: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Notes<textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={createOrder} style={{ padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#ccc' };
const selectStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#939393', cursor: 'pointer', fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };

export default CrossDocking;
