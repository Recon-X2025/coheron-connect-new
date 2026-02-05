import { useState, useEffect } from 'react';
import { FileText, Plus, AlertTriangle, CheckCircle, Clock, RefreshCw, BarChart3, XCircle } from 'lucide-react';

const API_BASE = '/api/sales/agreements';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const cardStyle: React.CSSProperties = { background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #222' };
const inputStyle: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#fff', width: '100%', fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const btnSecondary: React.CSSProperties = { background: '#222', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };

const statusColors: Record<string, string> = { draft: '#888', active: '#00C971', expired: '#f59e0b', cancelled: '#ef4444' };
const typeColors: Record<string, string> = { price: '#3b82f6', volume: '#8b5cf6', rebate: '#00C971' };

type Tab = 'agreements' | 'compliance' | 'expiring';

export const SalesAgreements: React.FC = () => {
  const [tab, setTab] = useState<Tab>('agreements');
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [_loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<any>({
    agreement_number: '', agreement_type: 'price', partner_id: '',
    start_date: '', end_date: '', renewal_type: 'none', penalty_clause: '',
    terms: [{ product_id: '', committed_quantity: 0, committed_value: 0, agreed_price: 0, min_quantity: 0, rebate_pct: 0 }],
  });

  const loadAgreements = async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      const data = await apiFetch(`/${q ? q : '?limit=50'}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadExpiring = async () => {
    try {
      const data = await apiFetch('/reports/expiring?days=60');
      setExpiring(data || []);
    } catch (e) { console.error(e); }
  };

  const loadCompliance = async () => {
    try {
      const data = await apiFetch('/reports/compliance');
      setCompliance(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadAgreements(); }, [statusFilter]);
  useEffect(() => {
    if (tab === 'expiring') loadExpiring();
    if (tab === 'compliance') loadCompliance();
  }, [tab]);

  const handleCreate = async () => {
    try {
      await apiFetch('', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false);
      loadAgreements();
    } catch (e) { console.error(e); }
  };

  const handleRenew = async (id: string) => {
    try {
      await apiFetch(`/${id}/renew`, { method: 'POST' });
      loadAgreements();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agreement?')) return;
    await apiFetch(`/${id}`, { method: 'DELETE' });
    loadAgreements();
  };

  const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '10px 20px', cursor: 'pointer', borderRadius: 8, fontWeight: 600, fontSize: 14, border: 'none',
    background: tab === t ? '#00C971' : '#1a1a1a', color: tab === t ? '#000' : '#888',
  });

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={28} color="#00C971" /> Sales Agreements
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>Manage pricing, volume, and rebate agreements with fulfillment tracking</p>
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}><Plus size={18} /> New Agreement</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab('agreements')} style={tabStyle('agreements')}><FileText size={14} /> Agreements</button>
        <button onClick={() => setTab('compliance')} style={tabStyle('compliance')}><BarChart3 size={14} /> Compliance</button>
        <button onClick={() => setTab('expiring')} style={tabStyle('expiring')}><AlertTriangle size={14} /> Expiring Soon</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: total, icon: <FileText size={20} color="#00C971" /> },
          { label: 'Active', value: items.filter(i => i.status === 'active').length, icon: <CheckCircle size={20} color="#00C971" /> },
          { label: 'Expiring (60d)', value: expiring.length, icon: <Clock size={20} color="#f59e0b" /> },
          { label: 'At Risk', value: compliance.filter(c => c.at_risk).length, icon: <AlertTriangle size={20} color="#ef4444" /> },
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

      {/* AGREEMENTS TAB */}
      {tab === 'agreements' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['', 'draft', 'active', 'expired', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                ...btnSecondary, padding: '6px 14px', fontSize: 12,
                background: statusFilter === s ? '#00C971' : '#222', color: statusFilter === s ? '#000' : '#aaa',
              }}>
                {s || 'All'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380, 1fr))', gap: 16 }}>
            {items.map((a: any) => {
              const totalCommitted = (a.terms || []).reduce((s: number, t: any) => s + (t.committed_quantity || 0), 0);
              const totalFulfilled = (a.fulfillment || []).reduce((s: number, f: any) => s + (f.fulfilled_quantity || 0), 0);
              const pct = totalCommitted > 0 ? Math.round((totalFulfilled / totalCommitted) * 100) : 0;
              const days = daysUntil(a.end_date);

              return (
                <div key={a._id || a.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{a.agreement_number}</div>
                      <div style={{ color: '#888', fontSize: 13 }}>{a.partner_id?.name || 'Partner'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: typeColors[a.agreement_type] + '22', color: typeColors[a.agreement_type], padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        {a.agreement_type}
                      </span>
                      <span style={{ background: statusColors[a.status] + '22', color: statusColors[a.status], padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        {a.status}
                      </span>
                    </div>
                  </div>

                  {/* Fulfillment bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
                      <span>Fulfillment</span>
                      <span>{pct}% ({totalFulfilled}/{totalCommitted})</span>
                    </div>
                    <div style={{ height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct >= 80 ? '#00C971' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 12 }}>
                    <span>{new Date(a.start_date).toLocaleDateString()} - {new Date(a.end_date).toLocaleDateString()}</span>
                    <span style={{ color: days < 30 ? '#ef4444' : days < 60 ? '#f59e0b' : '#888' }}>
                      {days > 0 ? `${days}d remaining` : 'Expired'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {a.status === 'active' && (
                      <button onClick={() => handleRenew(a._id || a.id)} style={{ ...btnSecondary, padding: '4px 12px', fontSize: 12 }}>
                        <RefreshCw size={12} /> Renew
                      </button>
                    )}
                    <button onClick={() => handleDelete(a._id || a.id)} style={{ background: 'transparent', border: '1px solid #333', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#ef4444', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* COMPLIANCE TAB */}
      {tab === 'compliance' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Compliance Dashboard</h3>
          {compliance.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>No active agreements to report on</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Agreement', 'Partner', 'Qty Compliance', 'Value Compliance', 'Days Left', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compliance.map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{c.agreement_number}</td>
                    <td style={{ padding: '12px 8px' }}>{c.partner}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(c.quantity_compliance_pct, 100)}%`, background: c.quantity_compliance_pct >= 70 ? '#00C971' : '#ef4444', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.quantity_compliance_pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(c.value_compliance_pct, 100)}%`, background: c.value_compliance_pct >= 70 ? '#00C971' : '#ef4444', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.value_compliance_pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', color: c.days_remaining < 30 ? '#ef4444' : '#888' }}>{c.days_remaining}d</td>
                    <td style={{ padding: '12px 8px' }}>
                      {c.at_risk ? (
                        <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} /> At Risk
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(0,201,113,0.1)', color: '#00C971', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> On Track
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* EXPIRING TAB */}
      {tab === 'expiring' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#f59e0b" /> Agreements Expiring Within 60 Days
          </h3>
          {expiring.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>No agreements expiring soon</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {expiring.map((a: any) => {
                const days = daysUntil(a.end_date);
                return (
                  <div key={a._id || a.id} style={{ padding: 16, background: '#0a0a0a', borderRadius: 8, border: `1px solid ${days < 14 ? '#ef4444' : days < 30 ? '#f59e0b' : '#333'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{a.agreement_number}</div>
                      <div style={{ color: '#888', fontSize: 13 }}>{a.partner_id?.name || 'Partner'} | {a.agreement_type}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: days < 14 ? '#ef4444' : '#f59e0b', fontSize: 18 }}>{days} days</div>
                      <div style={{ color: '#888', fontSize: 12 }}>Expires {new Date(a.end_date).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => handleRenew(a._id || a.id)} style={{ ...btnPrimary, padding: '8px 16px' }}>
                      <RefreshCw size={14} /> Renew
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE FORM MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 600, maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>New Sales Agreement</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Agreement Number</label>
                <input style={inputStyle} value={form.agreement_number} onChange={e => setForm({ ...form, agreement_number: e.target.value })} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Type</label>
                <select style={inputStyle} value={form.agreement_type} onChange={e => setForm({ ...form, agreement_type: e.target.value })}>
                  <option value="price">Price</option>
                  <option value="volume">Volume</option>
                  <option value="rebate">Rebate</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Partner ID</label>
                <input style={inputStyle} value={form.partner_id} onChange={e => setForm({ ...form, partner_id: e.target.value })} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Renewal</label>
                <select style={inputStyle} value={form.renewal_type} onChange={e => setForm({ ...form, renewal_type: e.target.value })}>
                  <option value="none">None</option>
                  <option value="auto">Auto</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Start Date</label>
                <input style={inputStyle} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>End Date</label>
                <input style={inputStyle} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Penalty Clause</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.penalty_clause} onChange={e => setForm({ ...form, penalty_clause: e.target.value })} />
            </div>

            {/* Terms */}
            <h4 style={{ margin: '16px 0 8px', fontSize: 14, fontWeight: 600 }}>Terms</h4>
            {(form.terms || []).map((t: any, idx: number) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 8, marginBottom: 8 }}>
                <input style={inputStyle} placeholder="Product ID" value={t.product_id} onChange={e => {
                  const terms = [...form.terms]; terms[idx] = { ...t, product_id: e.target.value }; setForm({ ...form, terms });
                }} />
                <input style={inputStyle} type="number" placeholder="Qty" value={t.committed_quantity} onChange={e => {
                  const terms = [...form.terms]; terms[idx] = { ...t, committed_quantity: Number(e.target.value) }; setForm({ ...form, terms });
                }} />
                <input style={inputStyle} type="number" placeholder="Price" value={t.agreed_price} onChange={e => {
                  const terms = [...form.terms]; terms[idx] = { ...t, agreed_price: Number(e.target.value) }; setForm({ ...form, terms });
                }} />
                <input style={inputStyle} type="number" placeholder="Rebate %" value={t.rebate_pct} onChange={e => {
                  const terms = [...form.terms]; terms[idx] = { ...t, rebate_pct: Number(e.target.value) }; setForm({ ...form, terms });
                }} />
                <button onClick={() => { const terms = [...form.terms]; terms.splice(idx, 1); setForm({ ...form, terms }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                  <XCircle size={16} />
                </button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, terms: [...form.terms, { product_id: '', committed_quantity: 0, committed_value: 0, agreed_price: 0, min_quantity: 0, rebate_pct: 0 }] })} style={{ ...btnSecondary, padding: '4px 12px', fontSize: 12 }}>
              <Plus size={14} /> Add Term
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleCreate} style={btnPrimary}>Create Agreement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesAgreements;
