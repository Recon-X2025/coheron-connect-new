import { useState, useEffect } from 'react';
import {
  Building2, Plus, Play, FileText, Trash2, X, Search, Eye,
} from 'lucide-react';

const TOKEN = localStorage.getItem('authToken') || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

interface Subsidiary { entity_name: string; entity_id: string; ownership_percentage: number; currency: string; elimination_required: boolean; }
interface Group { _id: string; name: string; parent_entity: string; subsidiaries: Subsidiary[]; consolidation_currency: string; is_active: boolean; }
interface Run { _id: string; group_id: any; period_start: string; period_end: string; status: string; consolidated_totals: any; completed_at: string; }

export const Consolidation: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'groups' | 'runs'>('groups');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateRun, setShowCreateRun] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [groupForm, setGroupForm] = useState({ name: '', parent_entity: '', consolidation_currency: 'USD', subsidiaries: [{ entity_name: '', entity_id: '', ownership_percentage: 100, currency: 'USD', elimination_required: false }] });
  const [runForm, setRunForm] = useState({ group_id: '', period_start: '', period_end: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [gRes, rRes] = await Promise.all([
        fetch('/api/accounting/consolidation/groups', { headers }),
        fetch('/api/accounting/consolidation/runs', { headers }),
      ]);
      if (gRes.ok) { const d = await gRes.json(); setGroups(d.items || []); }
      if (rRes.ok) { const d = await rRes.json(); setRuns(d.items || []); }
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const createGroup = async () => {
    const res = await fetch('/api/accounting/consolidation/groups', { method: 'POST', headers, body: JSON.stringify(groupForm) });
    if (res.ok) { setShowCreateGroup(false); fetchAll(); }
  };

  const createRun = async () => {
    const res = await fetch('/api/accounting/consolidation/runs', { method: 'POST', headers, body: JSON.stringify(runForm) });
    if (res.ok) { setShowCreateRun(false); fetchAll(); }
  };

  const executeRun = async (id: string) => {
    await fetch(`/api/accounting/consolidation/runs/${id}/execute`, { method: 'POST', headers });
    fetchAll();
  };

  const viewReport = async (id: string) => {
    const res = await fetch(`/api/accounting/consolidation/runs/${id}/report`, { headers });
    if (res.ok) setSelectedRun(await res.json());
  };

  const deleteGroup = async (id: string) => { await fetch(`/api/accounting/consolidation/groups/${id}`, { method: 'DELETE', headers }); fetchAll(); };
  const deleteRun = async (id: string) => { await fetch(`/api/accounting/consolidation/runs/${id}`, { method: 'DELETE', headers }); fetchAll(); };

  const statusColor = (s: string) => s === 'completed' ? '#00C971' : s === 'in_progress' ? '#3b82f6' : s === 'failed' ? '#ef4444' : '#f59e0b';

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
    modal: { background: '#141414', borderRadius: 16, border: '1px solid #262626', padding: 32, width: 560, maxHeight: '80vh', overflow: 'auto' as const },
    tabs: { display: 'flex', gap: 8, marginBottom: 24 },
    tab: (active: boolean): React.CSSProperties => ({ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: active ? '#00C971' : '#1a1a1a', color: active ? '#000' : '#888', border: 'none', fontWeight: 600, fontSize: 14 }),
  };

  return (
    <div style={st.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building2 size={28} color="#00C971" />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Multi-Entity Consolidation</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={st.btn} onClick={() => setShowCreateGroup(true)}><Plus size={16} /> New Group</button>
          <button style={{ ...st.btn, background: '#1a1a1a', color: '#00C971', border: '1px solid #00C971' }} onClick={() => setShowCreateRun(true)}><Plus size={16} /> New Run</button>
        </div>
      </div>

      <div style={st.tabs}>
        <button style={st.tab(tab === 'groups')} onClick={() => setTab('groups')}>Groups</button>
        <button style={st.tab(tab === 'runs')} onClick={() => setTab('runs')}>Runs</button>
      </div>

      {tab === 'groups' && (
        <div style={st.card}>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#888' }} />
            <input style={{ ...st.input, paddingLeft: 36 }} placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <p>Loading...</p> : (
            <table style={st.table}>
              <thead><tr><th style={st.th}>Name</th><th style={st.th}>Parent</th><th style={st.th}>Subsidiaries</th><th style={st.th}>Currency</th><th style={st.th}>Actions</th></tr></thead>
              <tbody>
                {groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase())).map(g => (
                  <tr key={g._id}>
                    <td style={st.td}>{g.name}</td>
                    <td style={st.td}>{g.parent_entity}</td>
                    <td style={st.td}>{g.subsidiaries.length}</td>
                    <td style={st.td}>{g.consolidation_currency}</td>
                    <td style={{ ...st.td, display: 'flex', gap: 8 }}><button style={st.btnDanger} onClick={() => deleteGroup(g._id)}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'runs' && (
        <div style={st.card}>
          {loading ? <p>Loading...</p> : (
            <table style={st.table}>
              <thead><tr><th style={st.th}>Group</th><th style={st.th}>Period</th><th style={st.th}>Status</th><th style={st.th}>Completed</th><th style={st.th}>Actions</th></tr></thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r._id}>
                    <td style={st.td}>{r.group_id?.name || r.group_id}</td>
                    <td style={st.td}>{new Date(r.period_start).toLocaleDateString()} - {new Date(r.period_end).toLocaleDateString()}</td>
                    <td style={st.td}><span style={st.badge(statusColor(r.status))}>{r.status}</span></td>
                    <td style={st.td}>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '-'}</td>
                    <td style={{ ...st.td, display: 'flex', gap: 8 }}>
                      {r.status === 'draft' && <button style={st.btnSm} onClick={() => executeRun(r._id)}><Play size={12} /> Execute</button>}
                      <button style={st.btnSm} onClick={() => viewReport(r._id)}><Eye size={12} /> Report</button>
                      <button style={st.btnDanger} onClick={() => deleteRun(r._id)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedRun && (
        <div style={st.overlay} onClick={() => setSelectedRun(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}><FileText size={20} style={{ marginRight: 8 }} />Consolidation Report</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setSelectedRun(null)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.entries(selectedRun.consolidated_totals || {}).map(([k, v]) => (
                <div key={k} style={{ ...st.card, padding: 16 }}>
                  <div style={{ color: '#888', fontSize: 12 }}>{k.replace(/_/g, ' ').toUpperCase()}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#00C971' }}>${Number(v).toLocaleString()}</div>
                </div>
              ))}
            </div>
            {(selectedRun.eliminations || []).length > 0 && (
              <>
                <h3 style={{ marginTop: 16 }}>Eliminations</h3>
                <table style={st.table}>
                  <thead><tr><th style={st.th}>Type</th><th style={st.th}>Description</th><th style={st.th}>Amount</th></tr></thead>
                  <tbody>{selectedRun.eliminations.map((e: any, i: number) => (
                    <tr key={i}><td style={st.td}>{e.type}</td><td style={st.td}>{e.description}</td><td style={st.td}>${e.amount.toLocaleString()}</td></tr>
                  ))}</tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {showCreateGroup && (
        <div style={st.overlay} onClick={() => setShowCreateGroup(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Create Consolidation Group</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setShowCreateGroup(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={st.input} placeholder="Group Name" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} />
              <input style={st.input} placeholder="Parent Entity" value={groupForm.parent_entity} onChange={e => setGroupForm({ ...groupForm, parent_entity: e.target.value })} />
              <input style={st.input} placeholder="Consolidation Currency" value={groupForm.consolidation_currency} onChange={e => setGroupForm({ ...groupForm, consolidation_currency: e.target.value })} />
              <h4 style={{ margin: '8px 0 0 0', color: '#888' }}>Subsidiaries</h4>
              {groupForm.subsidiaries.map((sub, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: 8 }}>
                  <input style={st.input} placeholder="Entity Name" value={sub.entity_name} onChange={e => { const subs = [...groupForm.subsidiaries]; subs[i] = { ...subs[i], entity_name: e.target.value }; setGroupForm({ ...groupForm, subsidiaries: subs }); }} />
                  <input style={st.input} placeholder="Entity ID" value={sub.entity_id} onChange={e => { const subs = [...groupForm.subsidiaries]; subs[i] = { ...subs[i], entity_id: e.target.value }; setGroupForm({ ...groupForm, subsidiaries: subs }); }} />
                  <input style={st.input} type="number" placeholder="%" value={sub.ownership_percentage} onChange={e => { const subs = [...groupForm.subsidiaries]; subs[i] = { ...subs[i], ownership_percentage: Number(e.target.value) }; setGroupForm({ ...groupForm, subsidiaries: subs }); }} />
                  <input style={st.input} placeholder="CCY" value={sub.currency} onChange={e => { const subs = [...groupForm.subsidiaries]; subs[i] = { ...subs[i], currency: e.target.value }; setGroupForm({ ...groupForm, subsidiaries: subs }); }} />
                </div>
              ))}
              <button style={{ ...st.btnSm, alignSelf: 'flex-start' }} onClick={() => setGroupForm({ ...groupForm, subsidiaries: [...groupForm.subsidiaries, { entity_name: '', entity_id: '', ownership_percentage: 100, currency: 'USD', elimination_required: false }] })}>+ Add Subsidiary</button>
              <button style={st.btn} onClick={createGroup}>Create Group</button>
            </div>
          </div>
        </div>
      )}

      {showCreateRun && (
        <div style={st.overlay} onClick={() => setShowCreateRun(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Create Consolidation Run</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setShowCreateRun(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select style={st.input} value={runForm.group_id} onChange={e => setRunForm({ ...runForm, group_id: e.target.value })}>
                <option value="">Select Group</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
              <input style={st.input} type="date" placeholder="Period Start" value={runForm.period_start} onChange={e => setRunForm({ ...runForm, period_start: e.target.value })} />
              <input style={st.input} type="date" placeholder="Period End" value={runForm.period_end} onChange={e => setRunForm({ ...runForm, period_end: e.target.value })} />
              <button style={st.btn} onClick={createRun}>Create Run</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consolidation;
