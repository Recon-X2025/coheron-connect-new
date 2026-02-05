import { useState, useEffect } from 'react';
import { FileText, Plus, Calendar, Package, Clock } from 'lucide-react';

const API_BASE = '/api/sales/blanket-orders';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const statusColors: Record<string, string> = { draft: '#888', active: '#00C971', completed: '#3b82f6', cancelled: '#ef4444' };

export const BlanketOrders: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, _setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [form, setForm] = useState({ order_number: '', partner_id: '', start_date: '', end_date: '', terms: '', lines: [{ product_id: '', quantity: 0, unit_price: 0 }] });

  const load = async () => {
    try {
      const data = await apiFetch(`?page=${page}&limit=20`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [page]);

  const handleCreate = async () => {
    try {
      await apiFetch('', { method: 'POST', body: JSON.stringify(form) });
      setShowModal(false);
      load();
    } catch (e) { console.error(e); }
  };

  const viewReleases = async (order: any) => {
    setSelected(order);
    try {
      const data = await apiFetch(`/${order._id}/releases`);
      setReleases(data || []);
    } catch (e) { console.error(e); }
  };

  const cardStyle = { background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #222' };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={28} color="#00C971" /> Blanket / Framework Orders
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>Manage long-term framework agreements with customers</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={18} /> New Blanket Order
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Orders', value: total, icon: <FileText size={20} color="#00C971" /> },
          { label: 'Active', value: items.filter(i => i.status === 'active').length, icon: <Package size={20} color="#00C971" /> },
          { label: 'Draft', value: items.filter(i => i.status === 'draft').length, icon: <Clock size={20} color="#888" /> },
          { label: 'Completed', value: items.filter(i => i.status === 'completed').length, icon: <Calendar size={20} color="#3b82f6" /> },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#888', fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              </div>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['Order #', 'Partner', 'Period', 'Total Value', 'Released', 'Remaining', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.order_number}</td>
                <td style={{ padding: '12px 16px' }}>{item.partner_id?.name || item.partner_id}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#aaa' }}>{new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}</td>
                <td style={{ padding: '12px 16px' }}>${item.total_value?.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#00C971' }}>${item.released_value?.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#f59e0b' }}>${item.remaining_value?.toLocaleString()}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: statusColors[item.status] + '22', color: statusColors[item.status], padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{item.status}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => viewReleases(item)} style={{ background: '#222', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#00C971', cursor: 'pointer', fontSize: 12 }}>Releases</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#666' }}>No blanket orders found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Releases sidebar */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div style={{ background: '#141414', width: 480, height: '100vh', padding: 24, overflowY: 'auto', borderLeft: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Releases for {selected.order_number}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>X</button>
            </div>
            {releases.length === 0 && <p style={{ color: '#666' }}>No releases yet</p>}
            {releases.map((r: any) => (
              <div key={r._id} style={{ background: '#0a0a0a', borderRadius: 8, padding: 14, marginBottom: 10, border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{r.release_number}</span>
                  <span style={{ color: statusColors[r.status] || '#888', fontSize: 12 }}>{r.status}</span>
                </div>
                <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>${r.total_value?.toLocaleString()} -- {new Date(r.release_date).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#141414', borderRadius: 12, padding: 24, width: 480, border: '1px solid #333' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600 }}>New Blanket Order</h2>
            {[
              { label: 'Order Number', key: 'order_number', type: 'text' },
              { label: 'Partner ID', key: 'partner_id', type: 'text' },
              { label: 'Start Date', key: 'start_date', type: 'date' },
              { label: 'End Date', key: 'end_date', type: 'date' },
              { label: 'Terms', key: 'terms', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, color: '#aaa', fontSize: 13 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={{ width: '100%', padding: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, color: '#fff' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', background: '#333', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} style={{ padding: '8px 18px', background: '#00C971', border: 'none', borderRadius: 6, color: '#000', fontWeight: 600, cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlanketOrders;
