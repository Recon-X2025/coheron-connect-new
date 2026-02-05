import { useState, useEffect } from 'react';
import {
  PiggyBank, Plus, CheckCircle, BarChart3, Trash2, X, Eye, Search,
} from 'lucide-react';

const getHeaders = async (method = 'GET') => {
  const token = localStorage.getItem('authToken') || '';
  const h: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  if (!['GET','HEAD','OPTIONS'].includes(method.toUpperCase())) {
    try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { h['x-csrf-token'] = (await r.json()).token; } } catch {}
  }
  return h;
};

interface BudgetLine {
  account_id: string;
  cost_center_id: string;
  period: string;
  budgeted_amount: number;
}

interface Budget {
  _id: string;
  name: string;
  fiscal_year_id: string;
  status: string;
  lines: BudgetLine[];
  created_at: string;
}

interface VarianceLine {
  account_id: string;
  period: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
}

export const Budgeting: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'summary'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [varianceReport, setVarianceReport] = useState<VarianceLine[] | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', fiscal_year_id: '', lines: [{ account_id: '', cost_center_id: '', period: '', budgeted_amount: 0 }] });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        fetch('/api/accounting/budgeting', { headers: await getHeaders() }),
        fetch('/api/accounting/budgeting/summary', { headers: await getHeaders() }),
      ]);
      if (listRes.ok) { const d = await listRes.json(); setBudgets(d.items || []); }
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const create = async () => {
    try {
      const res = await fetch('/api/accounting/budgeting', { method: 'POST', headers: await getHeaders('POST'), body: JSON.stringify(form) });
      if (res.ok) { setShowCreate(false); setForm({ name: '', fiscal_year_id: '', lines: [{ account_id: '', cost_center_id: '', period: '', budgeted_amount: 0 }] }); fetchAll(); }
    } catch { /* empty */ }
  };

  const approve = async (id: string) => {
    await fetch(`/api/accounting/budgeting/${id}/approve`, { method: 'POST', headers: await getHeaders('POST') });
    fetchAll();
  };

  const remove = async (id: string) => {
    await fetch(`/api/accounting/budgeting/${id}`, { method: 'DELETE', headers: await getHeaders('DELETE') });
    fetchAll();
  };

  const loadVariance = async (id: string) => {
    const res = await fetch(`/api/accounting/budgeting/${id}/variance-report`, { headers: await getHeaders() });
    if (res.ok) { const d = await res.json(); setVarianceReport(d.lines); }
  };

  const filtered = budgets.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => s === 'approved' ? '#00C971' : s === 'closed' ? '#888' : '#f59e0b';

  const s: Record<string, any> = {
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
    modal: { background: '#141414', borderRadius: 16, border: '1px solid #262626', padding: 32, width: 520, maxHeight: '80vh', overflow: 'auto' as const },
    tabs: { display: 'flex', gap: 8, marginBottom: 24 },
    tab: (active: boolean): React.CSSProperties => ({ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: active ? '#00C971' : '#1a1a1a', color: active ? '#000' : '#888', border: 'none', fontWeight: 600, fontSize: 14 }),
  };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PiggyBank size={28} color="#00C971" />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Budgeting</h1>
        </div>
        <button style={s.btn} onClick={() => setShowCreate(true)}><Plus size={16} /> New Budget</button>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'list')} onClick={() => setTab('list')}>All Budgets</button>
        <button style={s.tab(tab === 'summary')} onClick={() => setTab('summary')}>Summary</button>
      </div>

      {tab === 'list' && (
        <div style={s.card}>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#888' }} />
            <input style={{ ...s.input, paddingLeft: 36 }} placeholder="Search budgets..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <p>Loading...</p> : (
            <table style={s.table}>
              <thead><tr><th style={s.th}>Name</th><th style={s.th}>Status</th><th style={s.th}>Lines</th><th style={s.th}>Total Budgeted</th><th style={s.th}>Actions</th></tr></thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b._id}>
                    <td style={s.td}>{b.name}</td>
                    <td style={s.td}><span style={s.badge(statusColor(b.status))}>{b.status}</span></td>
                    <td style={s.td}>{b.lines.length}</td>
                    <td style={s.td}>${b.lines.reduce((sum, l) => sum + l.budgeted_amount, 0).toLocaleString()}</td>
                    <td style={{ ...s.td, display: 'flex', gap: 8 }}>
                      <button style={s.btnSm} onClick={() => { setSelectedBudget(b); loadVariance(b._id); }}><Eye size={12} /> Variance</button>
                      {b.status === 'draft' && <button style={s.btnSm} onClick={() => approve(b._id)}><CheckCircle size={12} /> Approve</button>}
                      <button style={s.btnDanger} onClick={() => remove(b._id)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'summary' && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={s.card}><div style={{ color: '#888', fontSize: 12 }}>Total Budgets</div><div style={{ fontSize: 32, fontWeight: 700, color: '#00C971' }}>{summary.total_budgets}</div></div>
          <div style={s.card}><div style={{ color: '#888', fontSize: 12 }}>Total Budgeted</div><div style={{ fontSize: 32, fontWeight: 700, color: '#00C971' }}>${summary.total_budgeted?.toLocaleString()}</div></div>
          <div style={s.card}><div style={{ color: '#888', fontSize: 12 }}>By Status</div>{Object.entries(summary.by_status || {}).map(([k, v]) => <div key={k} style={{ fontSize: 14 }}>{k}: {String(v)}</div>)}</div>
        </div>
      )}

      {selectedBudget && varianceReport && (
        <div style={s.overlay} onClick={() => { setSelectedBudget(null); setVarianceReport(null); }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}><BarChart3 size={20} style={{ marginRight: 8 }} />Variance Report: {selectedBudget.name}</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => { setSelectedBudget(null); setVarianceReport(null); }}><X size={20} /></button>
            </div>
            <table style={s.table}>
              <thead><tr><th style={s.th}>Period</th><th style={s.th}>Budgeted</th><th style={s.th}>Actual</th><th style={s.th}>Variance</th></tr></thead>
              <tbody>
                {varianceReport.map((l, i) => (
                  <tr key={i}>
                    <td style={s.td}>{l.period}</td>
                    <td style={s.td}>${l.budgeted_amount.toLocaleString()}</td>
                    <td style={s.td}>${l.actual_amount.toLocaleString()}</td>
                    <td style={{ ...s.td, color: l.variance >= 0 ? '#00C971' : '#ef4444' }}>${l.variance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={s.overlay} onClick={() => setShowCreate(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Create Budget</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={s.input} placeholder="Budget Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input style={s.input} placeholder="Fiscal Year ID" value={form.fiscal_year_id} onChange={e => setForm({ ...form, fiscal_year_id: e.target.value })} />
              <h4 style={{ margin: '8px 0 0 0', color: '#888' }}>Budget Lines</h4>
              {form.lines.map((line, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  <input style={s.input} placeholder="Account ID" value={line.account_id} onChange={e => { const lines = [...form.lines]; lines[i] = { ...lines[i], account_id: e.target.value }; setForm({ ...form, lines }); }} />
                  <input style={s.input} placeholder="Cost Center ID" value={line.cost_center_id} onChange={e => { const lines = [...form.lines]; lines[i] = { ...lines[i], cost_center_id: e.target.value }; setForm({ ...form, lines }); }} />
                  <input style={s.input} placeholder="Period (YYYY-MM)" value={line.period} onChange={e => { const lines = [...form.lines]; lines[i] = { ...lines[i], period: e.target.value }; setForm({ ...form, lines }); }} />
                  <input style={s.input} type="number" placeholder="Amount" value={line.budgeted_amount || ''} onChange={e => { const lines = [...form.lines]; lines[i] = { ...lines[i], budgeted_amount: Number(e.target.value) }; setForm({ ...form, lines }); }} />
                </div>
              ))}
              <button style={{ ...s.btnSm, alignSelf: 'flex-start' }} onClick={() => setForm({ ...form, lines: [...form.lines, { account_id: '', cost_center_id: '', period: '', budgeted_amount: 0 }] })}>+ Add Line</button>
              <button style={s.btn} onClick={create}>Create Budget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgeting;
