import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Play, Pause } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const s = {
  page: { padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 12 } as React.CSSProperties,
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#e0e0e0', fontSize: 14, width: '100%' } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  badge: (active: boolean) => ({ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: active ? '#00C97122' : '#88888822', color: active ? '#00C971' : '#888' }) as React.CSSProperties,
};

export const ScheduledReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', collection: 'accountmoves', cron_expression: 'daily 08:00', recipients: '', format: 'xlsx' });
  const token = localStorage.getItem('authToken') || '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/scheduled-reports`, { headers });
      if (res.ok) setReports(await res.json());
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    await fetch(`${API_BASE}/api/scheduled-reports`, {
      method: 'POST', headers,
      body: JSON.stringify({ ...form, recipients: form.recipients.split(',').map(r => r.trim()).filter(Boolean) }),
    });
    setShowCreate(false);
    setForm({ name: '', collection: 'accountmoves', cron_expression: 'daily 08:00', recipients: '', format: 'xlsx' });
    load();
  };

  const toggle = async (id: string, isActive: boolean) => {
    await fetch(`${API_BASE}/api/scheduled-reports/${id}`, { method: 'PUT', headers, body: JSON.stringify({ is_active: !isActive }) });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/api/scheduled-reports/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={28} style={{ color: '#00C971' }} /> Scheduled Reports
        </h1>
        <button style={s.btn} onClick={() => setShowCreate(!showCreate)}><Plus size={16} /> New Schedule</button>
      </div>

      {showCreate && (
        <div style={s.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input style={s.input} placeholder="Report name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select style={s.input} value={form.collection} onChange={e => setForm({ ...form, collection: e.target.value })}>
              <option value="accountmoves">Invoices</option>
              <option value="saleorders">Sale Orders</option>
              <option value="products">Products</option>
              <option value="partners">Partners</option>
            </select>
            <input style={s.input} placeholder="Schedule (e.g., daily 08:00)" value={form.cron_expression} onChange={e => setForm({ ...form, cron_expression: e.target.value })} />
            <input style={s.input} placeholder="Recipients (comma-separated emails)" value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} />
            <select style={s.input} value={form.format} onChange={e => setForm({ ...form, format: e.target.value })}>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button style={s.btn} onClick={create}>Create</button>
          </div>
        </div>
      )}

      {reports.map(r => (
        <div key={r._id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {r.collection} | {r.cron_expression} | {r.format.toUpperCase()} | {r.recipients?.length || 0} recipients
            </div>
            {r.next_run && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Next run: {new Date(r.next_run).toLocaleString()}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={s.badge(r.is_active)}>{r.is_active ? 'Active' : 'Paused'}</span>
            <button style={{ background: '#222', border: '1px solid #333', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#e0e0e0' }} onClick={() => toggle(r._id, r.is_active)}>
              {r.is_active ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button style={{ background: '#222', border: '1px solid #ef4444', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#ef4444' }} onClick={() => remove(r._id)}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      {reports.length === 0 && !showCreate && <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>No scheduled reports yet.</div>}
    </div>
  );
};

export default ScheduledReports;
