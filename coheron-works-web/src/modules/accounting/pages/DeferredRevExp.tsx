import { useState, useEffect } from 'react';
import {
  Clock, Plus, X, Search, CheckCircle, Trash2, Play, BarChart3,
} from 'lucide-react';

const TOKEN = localStorage.getItem('token') || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

interface Period { period: string; amount: number; status: string; recognition_date?: string; }
interface Schedule { _id: string; type: string; source_document_type: string; description: string; total_amount: number; start_date: string; end_date: string; periods: Period[]; method: string; status: string; }
interface Summary { deferred_revenue: number; deferred_expenses: number; total_schedules: number; }

export const DeferredRevExp: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [summary, setSummary] = useState<Summary>({ deferred_revenue: 0, deferred_expenses: 0, total_schedules: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'revenue' | 'expense'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    type: 'revenue', source_document_type: 'manual', description: '', total_amount: 0,
    deferred_account_id: '', recognition_account_id: '', start_date: '', end_date: '', method: 'straight_line',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [lRes, sRes] = await Promise.all([
        fetch('/api/accounting/deferred', { headers }),
        fetch('/api/accounting/deferred/summary', { headers }),
      ]);
      if (lRes.ok) { const d = await lRes.json(); setSchedules(d.items || []); }
      if (sRes.ok) setSummary(await sRes.json());
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const create = async () => {
    const res = await fetch('/api/accounting/deferred', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) { setShowCreate(false); fetchAll(); }
  };

  const remove = async (id: string) => {
    await fetch(`/api/accounting/deferred/schedules/${id}`, { method: 'DELETE', headers });
    fetchAll();
  };

  const recognizePeriod = async (scheduleId: string, period: string) => {
    await fetch('/api/accounting/deferred/recognize-period', { method: 'POST', headers, body: JSON.stringify({ schedule_id: scheduleId, period }) });
    if (selectedSchedule) {
      const res = await fetch(`/api/accounting/deferred/schedules/${scheduleId}`, { headers });
      if (res.ok) setSelectedSchedule(await res.json());
    }
    fetchAll();
  };

  const autoRecognize = async () => {
    const res = await fetch('/api/accounting/deferred/auto-recognize', { method: 'POST', headers });
    if (res.ok) { const d = await res.json(); alert(`Recognized ${d.recognized_periods} periods`); fetchAll(); }
  };

  const filtered = schedules
    .filter(s => tab === 'all' || s.type === tab)
    .filter(s => s.description.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => s === 'active' ? '#00C971' : s === 'completed' ? '#3b82f6' : '#ef4444';

  const st: Record<string, React.CSSProperties> = {
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
    modal: { background: '#141414', borderRadius: 16, border: '1px solid #262626', padding: 32, width: 560, maxHeight: '80vh', overflow: 'auto' as const },
    tabs: { display: 'flex', gap: 8, marginBottom: 24 },
    tab: (active: boolean): React.CSSProperties => ({ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: active ? '#00C971' : '#1a1a1a', color: active ? '#000' : '#888', border: 'none', fontWeight: 600, fontSize: 14 }),
  };

  return (
    <div style={st.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={28} color="#00C971" />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Deferred Revenue & Expenses</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...st.btn, background: '#1a1a1a', color: '#00C971', border: '1px solid #00C971' }} onClick={autoRecognize}><Play size={16} /> Auto-Recognize</button>
          <button style={st.btn} onClick={() => setShowCreate(true)}><Plus size={16} /> New Schedule</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={st.card}><div style={{ color: '#888', fontSize: 12 }}>Deferred Revenue</div><div style={{ fontSize: 32, fontWeight: 700, color: '#00C971' }}>${summary.deferred_revenue.toLocaleString()}</div></div>
        <div style={st.card}><div style={{ color: '#888', fontSize: 12 }}>Deferred Expenses</div><div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>${summary.deferred_expenses.toLocaleString()}</div></div>
        <div style={st.card}><div style={{ color: '#888', fontSize: 12 }}>Active Schedules</div><div style={{ fontSize: 32, fontWeight: 700, color: '#00C971' }}>{summary.total_schedules}</div></div>
      </div>

      <div style={st.tabs}>
        <button style={st.tab(tab === 'all')} onClick={() => setTab('all')}>All</button>
        <button style={st.tab(tab === 'revenue')} onClick={() => setTab('revenue')}>Revenue</button>
        <button style={st.tab(tab === 'expense')} onClick={() => setTab('expense')}>Expenses</button>
      </div>

      <div style={st.card}>
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#888' }} />
          <input style={{ ...st.input, paddingLeft: 36 }} placeholder="Search schedules..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? <p>Loading...</p> : (
          <table style={st.table}>
            <thead><tr><th style={st.th}>Description</th><th style={st.th}>Type</th><th style={st.th}>Amount</th><th style={st.th}>Period</th><th style={st.th}>Method</th><th style={st.th}>Status</th><th style={st.th}>Progress</th><th style={st.th}>Actions</th></tr></thead>
            <tbody>
              {filtered.map(s => {
                const recognized = s.periods.filter(p => p.status === 'recognized').length;
                return (
                  <tr key={s._id}>
                    <td style={st.td}>{s.description}</td>
                    <td style={st.td}><span style={st.badge(s.type === 'revenue' ? '#00C971' : '#f59e0b')}>{s.type}</span></td>
                    <td style={st.td}>${s.total_amount.toLocaleString()}</td>
                    <td style={st.td}>{new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}</td>
                    <td style={st.td}>{s.method}</td>
                    <td style={st.td}><span style={st.badge(statusColor(s.status))}>{s.status}</span></td>
                    <td style={st.td}>{recognized}/{s.periods.length}</td>
                    <td style={{ ...st.td, display: 'flex', gap: 8 }}>
                      <button style={st.btnSm} onClick={() => setSelectedSchedule(s)}><BarChart3 size={12} /> Periods</button>
                      <button style={st.btnDanger} onClick={() => remove(s._id)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedSchedule && (
        <div style={st.overlay} onClick={() => setSelectedSchedule(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Periods: {selectedSchedule.description}</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setSelectedSchedule(null)}><X size={20} /></button>
            </div>
            <table style={st.table}>
              <thead><tr><th style={st.th}>Period</th><th style={st.th}>Amount</th><th style={st.th}>Status</th><th style={st.th}>Action</th></tr></thead>
              <tbody>
                {selectedSchedule.periods.map((p, i) => (
                  <tr key={i}>
                    <td style={st.td}>{p.period}</td>
                    <td style={st.td}>${p.amount.toLocaleString()}</td>
                    <td style={st.td}><span style={st.badge(p.status === 'recognized' ? '#00C971' : '#f59e0b')}>{p.status}</span></td>
                    <td style={st.td}>{p.status === 'pending' && <button style={st.btnSm} onClick={() => recognizePeriod(selectedSchedule._id, p.period)}><CheckCircle size={12} /> Recognize</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={st.overlay} onClick={() => setShowCreate(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Create Deferral Schedule</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select style={st.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
              <select style={st.input} value={form.source_document_type} onChange={e => setForm({ ...form, source_document_type: e.target.value })}>
                <option value="manual">Manual</option>
                <option value="invoice">Invoice</option>
                <option value="bill">Bill</option>
              </select>
              <input style={st.input} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <input style={st.input} type="number" placeholder="Total Amount" value={form.total_amount || ''} onChange={e => setForm({ ...form, total_amount: Number(e.target.value) })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input style={st.input} placeholder="Deferred Account ID" value={form.deferred_account_id} onChange={e => setForm({ ...form, deferred_account_id: e.target.value })} />
                <input style={st.input} placeholder="Recognition Account ID" value={form.recognition_account_id} onChange={e => setForm({ ...form, recognition_account_id: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input style={st.input} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                <input style={st.input} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <select style={st.input} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                <option value="straight_line">Straight Line</option>
                <option value="custom">Custom</option>
              </select>
              <button style={st.btn} onClick={create}>Create Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeferredRevExp;
