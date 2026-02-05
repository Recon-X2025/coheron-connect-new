import { useState, useEffect } from 'react';
import {
  TrendingUp, Plus, X, Search, Calendar, FileText, CheckCircle, Trash2,
} from 'lucide-react';

const getHeaders = async (method = 'GET') => {
  const token = localStorage.getItem('authToken') || '';
  const h: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  if (!['GET','HEAD','OPTIONS'].includes(method.toUpperCase())) {
    try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { h['x-csrf-token'] = (await r.json()).token; } } catch {}
  }
  return h;
};

interface Obligation { description: string; standalone_price: number; allocated_price: number; recognition_method: string; progress_measure: string; is_satisfied: boolean; }
interface Contract { _id: string; contract_number: string; customer_id: string; start_date: string; end_date: string; total_value: number; performance_obligations: Obligation[]; status: string; }
interface ScheduleItem { _id: string; contract_id: string; obligation_index: number; period: string; amount: number; recognized: boolean; status: string; }
interface WaterfallPeriod { period: string; recognized: number; pending: number; }

export const RevenueRecognition: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'contracts' | 'waterfall' | 'unbilled'>('contracts');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [waterfall, setWaterfall] = useState<WaterfallPeriod[]>([]);
  const [unbilled, setUnbilled] = useState<{ total_unbilled: number; items: any[] }>({ total_unbilled: 0, items: [] });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    contract_number: '', customer_id: '', start_date: '', end_date: '', total_value: 0,
    performance_obligations: [{ description: '', standalone_price: 0, allocated_price: 0, recognition_method: 'over_time', progress_measure: 'time', is_satisfied: false }],
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, wRes, uRes] = await Promise.all([
        fetch('/api/accounting/revenue-recognition/contracts', { headers: await getHeaders() }),
        fetch('/api/accounting/revenue-recognition/waterfall', { headers: await getHeaders() }),
        fetch('/api/accounting/revenue-recognition/unbilled-revenue', { headers: await getHeaders() }),
      ]);
      if (cRes.ok) { const d = await cRes.json(); setContracts(d.items || []); }
      if (wRes.ok) { const d = await wRes.json(); setWaterfall(d.periods || []); }
      if (uRes.ok) setUnbilled(await uRes.json());
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const create = async () => {
    const res = await fetch('/api/accounting/revenue-recognition/contracts', { method: 'POST', headers: await getHeaders('POST'), body: JSON.stringify(form) });
    if (res.ok) { setShowCreate(false); fetchAll(); }
  };

  const remove = async (id: string) => {
    await fetch(`/api/accounting/revenue-recognition/contracts/${id}`, { method: 'DELETE', headers: await getHeaders('DELETE') });
    fetchAll();
  };

  const loadSchedule = async (c: Contract) => {
    setSelectedContract(c);
    const res = await fetch(`/api/accounting/revenue-recognition/contracts/${c._id}/schedule`, { headers: await getHeaders() });
    if (res.ok) { const d = await res.json(); setSchedule(d.items || []); }
  };

  const recognize = async (contractId: string, period: string) => {
    await fetch(`/api/accounting/revenue-recognition/contracts/${contractId}/recognize`, { method: 'POST', headers: await getHeaders('POST'), body: JSON.stringify({ period }) });
    if (selectedContract) loadSchedule(selectedContract);
    fetchAll();
  };

  const statusColor = (s: string) => s === 'active' ? '#00C971' : s === 'completed' ? '#3b82f6' : s === 'cancelled' ? '#ef4444' : '#f59e0b';
  const filtered = contracts.filter(c => c.contract_number.toLowerCase().includes(search.toLowerCase()));

  const st: Record<string, any> = {
    page: { background: '#0a0a0a', minHeight: '100vh', color: '#e5e5e5', padding: 32 },
    card: { background: '#141414', borderRadius: 12, border: '1px solid #262626', padding: 24, marginBottom: 16 },
    btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 },
    btnSm: { background: 'transparent', color: '#00C971', border: '1px solid #00C971', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 },
    btnDanger: { background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 },
    input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#e5e5e5', width: '100%', fontSize: 14 },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { textAlign: 'left' as const, padding: '12px 16px', borderBottom: '1px solid #262626', color: '#888', fontSize: 12, textTransform: 'uppercase' as const },
    td: { padding: '12px 16px', borderBottom: '1px solid #1a1a1a', fontSize: 14 },
    badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, background: `${color}22`, color }),
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#141414', borderRadius: 16, border: '1px solid #262626', padding: 32, width: 600, maxHeight: '80vh', overflow: 'auto' as const },
    tabs: { display: 'flex', gap: 8, marginBottom: 24 },
    tab: (active: boolean): React.CSSProperties => ({ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: active ? '#00C971' : '#1a1a1a', color: active ? '#000' : '#888', border: 'none', fontWeight: 600, fontSize: 14 }),
  };

  return (
    <div style={st.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp size={28} color="#00C971" />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Revenue Recognition (ASC 606)</h1>
        </div>
        <button style={st.btn} onClick={() => setShowCreate(true)}><Plus size={16} /> New Contract</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={st.card}><div style={{ color: '#888', fontSize: 12 }}>Total Contracts</div><div style={{ fontSize: 32, fontWeight: 700, color: '#00C971' }}>{contracts.length}</div></div>
        <div style={st.card}><div style={{ color: '#888', fontSize: 12 }}>Total Contract Value</div><div style={{ fontSize: 32, fontWeight: 700, color: '#00C971' }}>${contracts.reduce((s, c) => s + c.total_value, 0).toLocaleString()}</div></div>
        <div style={st.card}><div style={{ color: '#888', fontSize: 12 }}>Unbilled Revenue</div><div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>${unbilled.total_unbilled.toLocaleString()}</div></div>
      </div>

      <div style={st.tabs}>
        <button style={st.tab(tab === 'contracts')} onClick={() => setTab('contracts')}>Contracts</button>
        <button style={st.tab(tab === 'waterfall')} onClick={() => setTab('waterfall')}>Waterfall</button>
        <button style={st.tab(tab === 'unbilled')} onClick={() => setTab('unbilled')}>Unbilled</button>
      </div>

      {tab === 'contracts' && (
        <div style={st.card}>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#888' }} />
            <input style={{ ...st.input, paddingLeft: 36 }} placeholder="Search contracts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <p>Loading...</p> : (
            <table style={st.table}>
              <thead><tr><th style={st.th}>Contract #</th><th style={st.th}>Period</th><th style={st.th}>Value</th><th style={st.th}>Obligations</th><th style={st.th}>Status</th><th style={st.th}>Actions</th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c._id}>
                    <td style={st.td}>{c.contract_number}</td>
                    <td style={st.td}>{new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}</td>
                    <td style={st.td}>${c.total_value.toLocaleString()}</td>
                    <td style={st.td}>{c.performance_obligations.length}</td>
                    <td style={st.td}><span style={st.badge(statusColor(c.status))}>{c.status}</span></td>
                    <td style={{ ...st.td, display: 'flex', gap: 8 }}>
                      <button style={st.btnSm} onClick={() => loadSchedule(c)}><Calendar size={12} /> Schedule</button>
                      <button style={st.btnDanger} onClick={() => remove(c._id)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'waterfall' && (
        <div style={st.card}>
          <h3 style={{ marginTop: 0 }}>Revenue Waterfall</h3>
          {waterfall.length === 0 ? <p style={{ color: '#888' }}>No data available</p> : (
            <table style={st.table}>
              <thead><tr><th style={st.th}>Period</th><th style={st.th}>Recognized</th><th style={st.th}>Pending</th><th style={st.th}>Total</th></tr></thead>
              <tbody>
                {waterfall.map(w => (
                  <tr key={w.period}>
                    <td style={st.td}>{w.period}</td>
                    <td style={{ ...st.td, color: '#00C971' }}>${w.recognized.toLocaleString()}</td>
                    <td style={{ ...st.td, color: '#f59e0b' }}>${w.pending.toLocaleString()}</td>
                    <td style={st.td}>${(w.recognized + w.pending).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'unbilled' && (
        <div style={st.card}>
          <h3 style={{ marginTop: 0 }}>Unbilled Revenue: <span style={{ color: '#00C971' }}>${unbilled.total_unbilled.toLocaleString()}</span></h3>
          <p style={{ color: '#888' }}>{unbilled.items.length} recognized schedule items</p>
        </div>
      )}

      {selectedContract && (
        <div style={st.overlay} onClick={() => setSelectedContract(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}><FileText size={20} style={{ marginRight: 8 }} />Schedule: {selectedContract.contract_number}</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setSelectedContract(null)}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: '#888', margin: '0 0 8px' }}>Performance Obligations</h4>
              {selectedContract.performance_obligations.map((o, i) => (
                <div key={i} style={{ ...st.card, padding: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{o.description}</span>
                  <span style={{ color: '#00C971' }}>${o.allocated_price.toLocaleString()} ({o.recognition_method})</span>
                  {o.is_satisfied && <CheckCircle size={16} color="#00C971" />}
                </div>
              ))}
            </div>
            {schedule.length > 0 && (
              <table style={st.table}>
                <thead><tr><th style={st.th}>Period</th><th style={st.th}>Amount</th><th style={st.th}>Status</th><th style={st.th}>Action</th></tr></thead>
                <tbody>
                  {schedule.map(s => (
                    <tr key={s._id}>
                      <td style={st.td}>{s.period}</td>
                      <td style={st.td}>${s.amount.toLocaleString()}</td>
                      <td style={st.td}><span style={st.badge(s.status === 'recognized' ? '#00C971' : '#f59e0b')}>{s.status}</span></td>
                      <td style={st.td}>{s.status === 'pending' && <button style={st.btnSm} onClick={() => recognize(selectedContract._id, s.period)}>Recognize</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <div style={st.overlay} onClick={() => setShowCreate(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Create Revenue Contract</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={st.input} placeholder="Contract Number" value={form.contract_number} onChange={e => setForm({ ...form, contract_number: e.target.value })} />
              <input style={st.input} placeholder="Customer ID" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <input style={st.input} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                <input style={st.input} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                <input style={st.input} type="number" placeholder="Total Value" value={form.total_value || ''} onChange={e => setForm({ ...form, total_value: Number(e.target.value) })} />
              </div>
              <h4 style={{ margin: '8px 0 0 0', color: '#888' }}>Performance Obligations</h4>
              {form.performance_obligations.map((ob, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
                  <input style={st.input} placeholder="Description" value={ob.description} onChange={e => { const obs = [...form.performance_obligations]; obs[i] = { ...obs[i], description: e.target.value }; setForm({ ...form, performance_obligations: obs }); }} />
                  <input style={st.input} type="number" placeholder="Standalone $" value={ob.standalone_price || ''} onChange={e => { const obs = [...form.performance_obligations]; obs[i] = { ...obs[i], standalone_price: Number(e.target.value) }; setForm({ ...form, performance_obligations: obs }); }} />
                  <input style={st.input} type="number" placeholder="Allocated $" value={ob.allocated_price || ''} onChange={e => { const obs = [...form.performance_obligations]; obs[i] = { ...obs[i], allocated_price: Number(e.target.value) }; setForm({ ...form, performance_obligations: obs }); }} />
                  <select style={st.input} value={ob.recognition_method} onChange={e => { const obs = [...form.performance_obligations]; obs[i] = { ...obs[i], recognition_method: e.target.value }; setForm({ ...form, performance_obligations: obs }); }}>
                    <option value="over_time">Over Time</option>
                    <option value="point_in_time">Point in Time</option>
                  </select>
                </div>
              ))}
              <button style={{ ...st.btnSm, alignSelf: 'flex-start' }} onClick={() => setForm({ ...form, performance_obligations: [...form.performance_obligations, { description: '', standalone_price: 0, allocated_price: 0, recognition_method: 'over_time', progress_measure: 'time', is_satisfied: false }] })}>+ Add Obligation</button>
              <button style={st.btn} onClick={create}>Create Contract</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueRecognition;
