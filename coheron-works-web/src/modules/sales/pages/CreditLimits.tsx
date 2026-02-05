import { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

const API_BASE = '/api/sales/credit-limits';
const getToken = () => localStorage.getItem('authToken') || '';
let _csrf: string | null = null;
const getCsrf = async () => { if (_csrf) return _csrf; try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { _csrf = (await r.json()).token; } } catch {} return _csrf; };
const apiFetch = async (path: string, options?: RequestInit) => {
  const method = (options?.method || 'GET').toUpperCase();
  const hdrs: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...((options?.headers as any) || {}) };
  if (!['GET','HEAD','OPTIONS'].includes(method)) { const c = await getCsrf(); if (c) hdrs['x-csrf-token'] = c; }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: hdrs, credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const riskColors: Record<string, string> = { low: '#00C971', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
const statusColors: Record<string, string> = { active: '#00C971', suspended: '#f59e0b', blocked: '#ef4444' };

export const CreditLimits: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ partner_id: '', credit_limit: 0, currency: 'USD', risk_rating: 'low', review_date: '' });
  const [_loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`?page=${page}&limit=20${search ? `&search=${search}` : ''}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, search]);

  const handleCreate = async () => {
    try {
      await apiFetch('', { method: 'POST', body: JSON.stringify(form) });
      setShowModal(false);
      setForm({ partner_id: '', credit_limit: 0, currency: 'USD', risk_rating: 'low', review_date: '' });
      load();
    } catch (e) { console.error(e); }
  };

  const cardStyle = { background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #222' };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={28} color="#00C971" /> Credit Limit Management
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>Manage customer credit limits and risk ratings</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={18} /> Set Credit Limit
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Accounts', value: total, icon: <Shield size={20} color="#00C971" /> },
          { label: 'Active', value: items.filter(i => i.status === 'active').length, icon: <ShieldCheck size={20} color="#00C971" /> },
          { label: 'High Risk', value: items.filter(i => i.risk_rating === 'high' || i.risk_rating === 'critical').length, icon: <ShieldAlert size={20} color="#ef4444" /> },
          { label: 'Blocked', value: items.filter(i => i.status === 'blocked').length, icon: <AlertTriangle size={20} color="#f59e0b" /> },
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

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: '#666' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', padding: '10px 10px 10px 38px', background: '#141414', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14 }} />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['Partner', 'Credit Limit', 'Used', 'Available', 'Status', 'Risk'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.partner_id?.name || item.partner_id}</td>
                <td style={{ padding: '12px 16px' }}>{item.currency} {item.credit_limit?.toLocaleString()}</td>
                <td style={{ padding: '12px 16px' }}>{item.currency} {item.current_balance?.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#00C971' }}>{item.currency} {item.available_credit?.toLocaleString()}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: statusColors[item.status] + '22', color: statusColors[item.status], padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{item.status}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: riskColors[item.risk_rating] + '22', color: riskColors[item.risk_rating], padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{item.risk_rating}</span>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#666' }}>No credit limits found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', background: '#222', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Prev</button>
          <span style={{ padding: '6px 14px', color: '#888' }}>Page {page}</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', background: '#222', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Next</button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#141414', borderRadius: 12, padding: 24, width: 420, border: '1px solid #333' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600 }}>Set Credit Limit</h2>
            {[
              { label: 'Partner ID', key: 'partner_id', type: 'text' },
              { label: 'Credit Limit', key: 'credit_limit', type: 'number' },
              { label: 'Currency', key: 'currency', type: 'text' },
              { label: 'Review Date', key: 'review_date', type: 'date' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, color: '#aaa', fontSize: 13 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} style={{ width: '100%', padding: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, color: '#fff' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, color: '#aaa', fontSize: 13 }}>Risk Rating</label>
              <select value={form.risk_rating} onChange={e => setForm({ ...form, risk_rating: e.target.value })} style={{ width: '100%', padding: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, color: '#fff' }}>
                {['low', 'medium', 'high', 'critical'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
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

export default CreditLimits;
