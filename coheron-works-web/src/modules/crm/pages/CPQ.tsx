import { useState, useEffect } from 'react';
import { FileText, Plus, Send, CheckCircle, Search } from 'lucide-react';

const API_BASE = '/api/crm/cpq';
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

const statusColors: Record<string, string> = { draft: '#64748b', sent: '#3b82f6', accepted: '#22c55e', rejected: '#ef4444' };

export const CPQ: React.FC = () => {
  const [tab, setTab] = useState<'quotes' | 'templates'>('quotes');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [quoteForm, setQuoteForm] = useState({ template_id: '', lead_id: '', lines: [{ product_id: '', quantity: 1, unit_price: 0, discount_pct: 0 }], tax_total: 0, valid_until: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [q, t] = await Promise.all([apiFetch('/quotes'), apiFetch('/templates')]);
      setQuotes(q);
      setTemplates(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const createQuote = async () => {
    try {
      await apiFetch('/quotes', { method: 'POST', body: JSON.stringify(quoteForm) });
      setShowModal(false);
      setQuoteForm({ template_id: '', lead_id: '', lines: [{ product_id: '', quantity: 1, unit_price: 0, discount_pct: 0 }], tax_total: 0, valid_until: '' });
      await loadData();
    } catch (e) { console.error(e); }
  };

  const sendQuote = async (id: string) => {
    await apiFetch(`/quotes/${id}/send`, { method: 'POST' });
    await loadData();
  };

  const acceptQuote = async (id: string) => {
    await apiFetch(`/quotes/${id}/accept`, { method: 'POST' });
    await loadData();
  };

  const addLine = () => setQuoteForm({ ...quoteForm, lines: [...quoteForm.lines, { product_id: '', quantity: 1, unit_price: 0, discount_pct: 0 }] });
  const updateLine = (idx: number, field: string, value: any) => {
    const lines = [...quoteForm.lines];
    (lines[idx] as any)[field] = value;
    setQuoteForm({ ...quoteForm, lines });
  };

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    totalValue: quotes.reduce((s, q) => s + (q.grand_total || 0), 0),
  };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileText size={28} color="#06b6d4" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Configure-Price-Quote</h1>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#06b6d4', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          <Plus size={16} /> New Quote
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Quotes', value: stats.total, bg: '#1e3a5f' },
          { label: 'Draft', value: stats.draft, bg: '#1f2937' },
          { label: 'Sent', value: stats.sent, bg: '#1e3a5f' },
          { label: 'Accepted', value: stats.accepted, bg: '#14532d' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 12, padding: 20 }}>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['quotes', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', background: tab === t ? '#06b6d4' : '#1f2937', color: tab === t ? '#000' : '#94a3b8', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>{t}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ padding: '8px 8px 8px 36px', background: '#1a1a2e', border: '1px solid #334155', borderRadius: 8, color: '#fff' }} />
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div> : tab === 'quotes' ? (
        <div style={{ background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                {['Quote #', 'Lead', 'Lines', 'Subtotal', 'Tax', 'Grand Total', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.filter(q => !search || q.quote_number?.toLowerCase().includes(search.toLowerCase())).map(q => (
                <tr key={q._id} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#06b6d4' }}>{q.quote_number}</td>
                  <td style={{ padding: '12px 16px' }}>{q.lead_id?.name || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{q.lines?.length || 0}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>${(q.subtotal || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>${(q.tax_total || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#22c55e' }}>${(q.grand_total || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: statusColors[q.status] || '#374151', color: '#fff' }}>{q.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {q.status === 'draft' && <button onClick={() => sendQuote(q._id)} title="Send" style={{ padding: 6, background: '#1e3a5f', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#60a5fa' }}><Send size={14} /></button>}
                      {q.status === 'sent' && <button onClick={() => acceptQuote(q._id)} title="Accept" style={{ padding: 6, background: '#14532d', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#22c55e' }}><CheckCircle size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!quotes.length && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No quotes yet</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {templates.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase())).map(t => (
            <div key={t._id} style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{t.name}</div>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>{t.description || 'No description'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12 }}>
                <span>{t.product_lines?.length || 0} products</span>
                <span style={{ color: t.is_active ? '#22c55e' : '#ef4444' }}>{t.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
          {!templates.length && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#64748b' }}>No templates</div>}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 32, width: 600, maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>New Quote</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Lead ID</label>
                <input value={quoteForm.lead_id} onChange={e => setQuoteForm({ ...quoteForm, lead_id: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Valid Until</label>
                <input type="date" value={quoteForm.valid_until} onChange={e => setQuoteForm({ ...quoteForm, valid_until: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
              </div>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Line Items</h3>
            {quoteForm.lines.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input placeholder="Product ID" value={line.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }} />
                <input type="number" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, 'quantity', +e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }} />
                <input type="number" placeholder="Unit Price" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', +e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }} />
                <input type="number" placeholder="Disc %" value={line.discount_pct} onChange={e => updateLine(i, 'discount_pct', +e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }} />
              </div>
            ))}
            <button onClick={addLine} style={{ padding: '6px 12px', background: '#1f2937', color: '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 16, fontSize: 13 }}>+ Add Line</button>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createQuote} style={{ padding: '10px 20px', background: '#06b6d4', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Create Quote</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CPQ;
