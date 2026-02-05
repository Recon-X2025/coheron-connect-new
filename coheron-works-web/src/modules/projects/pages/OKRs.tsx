import { useState, useEffect } from 'react';
import { Target, Plus, ChevronRight, Trash2, Edit } from 'lucide-react';

const API_BASE = '/api/projects/okrs';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const statusColors: Record<string, string> = { draft: '#64748b', active: '#3b82f6', completed: '#22c55e', cancelled: '#ef4444', not_started: '#64748b', on_track: '#22c55e', at_risk: '#eab308', behind: '#ef4444' };

export const OKRs: React.FC = () => {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showObjModal, setShowObjModal] = useState(false);
  const [showKrModal, setShowKrModal] = useState(false);
  const [objForm, setObjForm] = useState({ title: '', description: '', period: 'Q1', year: new Date().getFullYear(), status: 'draft', project_id: '' });
  const [krForm, setKrForm] = useState({ title: '', metric_type: 'number', target_value: 100, current_value: 0, weight: 1 });
  const [editId, setEditId] = useState<string | null>(null);

  const loadObjectives = async () => {
    setLoading(true);
    try { setObjectives(await apiFetch('/objectives')); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadDetail = async (id: string) => {
    try { setSelected(await apiFetch(`/objectives/${id}`)); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadObjectives(); }, []);

  const saveObjective = async () => {
    try {
      if (editId) {
        await apiFetch(`/objectives/${editId}`, { method: 'PUT', body: JSON.stringify(objForm) });
      } else {
        await apiFetch('/objectives', { method: 'POST', body: JSON.stringify(objForm) });
      }
      setShowObjModal(false);
      setEditId(null);
      setObjForm({ title: '', description: '', period: 'Q1', year: new Date().getFullYear(), status: 'draft', project_id: '' });
      await loadObjectives();
    } catch (e) { console.error(e); }
  };

  const deleteObjective = async (id: string) => {
    if (!confirm('Delete this objective and all its key results?')) return;
    await apiFetch(`/objectives/${id}`, { method: 'DELETE' });
    setSelected(null);
    await loadObjectives();
  };

  const saveKeyResult = async () => {
    if (!selected?._id) return;
    try {
      await apiFetch('/key-results', { method: 'POST', body: JSON.stringify({ ...krForm, objective_id: selected._id }) });
      setShowKrModal(false);
      setKrForm({ title: '', metric_type: 'number', target_value: 100, current_value: 0, weight: 1 });
      await loadDetail(selected._id);
    } catch (e) { console.error(e); }
  };

  const updateKrProgress = async (krId: string, current_value: number) => {
    await apiFetch(`/key-results/${krId}/update-progress`, { method: 'PUT', body: JSON.stringify({ current_value }) });
    if (selected?._id) await loadDetail(selected._id);
  };

  const stats = {
    total: objectives.length,
    active: objectives.filter(o => o.status === 'active').length,
    completed: objectives.filter(o => o.status === 'completed').length,
    avgProgress: objectives.length ? Math.round(objectives.reduce((s, o) => s + (o.progress || 0), 0) / objectives.length) : 0,
  };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Target size={28} color="#f59e0b" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>OKR Alignment</h1>
        </div>
        <button onClick={() => { setEditId(null); setObjForm({ title: '', description: '', period: 'Q1', year: new Date().getFullYear(), status: 'draft', project_id: '' }); setShowObjModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          <Plus size={16} /> New Objective
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Objectives', value: stats.total, bg: '#1e3a5f' },
          { label: 'Active', value: stats.active, bg: '#1e3a5f' },
          { label: 'Completed', value: stats.completed, bg: '#14532d' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, bg: '#3b1f6e' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 12, padding: 20 }}>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div>
          {loading ? <div style={{ color: '#64748b', padding: 20 }}>Loading...</div> : objectives.map(obj => (
            <div key={obj._id} onClick={() => loadDetail(obj._id)} style={{ padding: 16, background: selected?._id === obj._id ? '#1e3a5f' : '#111827', borderRadius: 8, marginBottom: 8, cursor: 'pointer', border: selected?._id === obj._id ? '1px solid #3b82f6' : '1px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{obj.title}</span>
                <ChevronRight size={16} color="#64748b" />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, background: statusColors[obj.status] || '#374151', color: '#fff' }}>{obj.status}</span>
                <span style={{ color: '#64748b' }}>{obj.period} {obj.year}</span>
              </div>
              <div style={{ marginTop: 8, height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${obj.progress || 0}%`, height: '100%', background: '#f59e0b', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{obj.progress || 0}% complete</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#111827', borderRadius: 12, padding: 24 }}>
          {selected ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{selected.title}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditId(selected._id); setObjForm({ title: selected.title, description: selected.description || '', period: selected.period, year: selected.year, status: selected.status, project_id: selected.project_id || '' }); setShowObjModal(true); }} style={{ padding: '6px 12px', background: '#1e3a5f', color: '#60a5fa', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Edit size={14} /></button>
                  <button onClick={() => deleteObjective(selected._id)} style={{ padding: '6px 12px', background: '#7f1d1d', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              </div>
              {selected.description && <p style={{ color: '#94a3b8', marginBottom: 16 }}>{selected.description}</p>}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, fontSize: 13 }}>
                <span style={{ padding: '4px 10px', borderRadius: 6, background: statusColors[selected.status] || '#374151', color: '#fff' }}>{selected.status}</span>
                <span style={{ color: '#94a3b8' }}>{selected.period} {selected.year}</span>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{selected.progress || 0}% progress</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Key Results ({selected.key_results?.length || 0})</h3>
                <button onClick={() => setShowKrModal(true)} style={{ padding: '6px 14px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Add KR</button>
              </div>

              {(selected.key_results || []).map((kr: any) => {
                const pct = kr.target_value > 0 ? Math.round((kr.current_value / kr.target_value) * 100) : 0;
                return (
                  <div key={kr._id} style={{ background: '#0a0a0a', borderRadius: 8, padding: 16, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{kr.title}</span>
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: statusColors[kr.status] || '#374151', color: '#fff' }}>{kr.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1, height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40 }}>{pct}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>{kr.current_value} / {kr.target_value} ({kr.metric_type})</span>
                      <span style={{ color: '#64748b' }}>Weight: {kr.weight}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        <input type="number" defaultValue={kr.current_value} onBlur={e => updateKrProgress(kr._id, +e.target.value)} style={{ width: 70, padding: '4px 8px', background: '#111827', border: '1px solid #334155', borderRadius: 4, color: '#fff', fontSize: 12 }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {selected.children?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Child Objectives ({selected.children.length})</h3>
                  {selected.children.map((c: any) => (
                    <div key={c._id} onClick={() => loadDetail(c._id)} style={{ padding: 12, background: '#0a0a0a', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
                      <span style={{ fontWeight: 600 }}>{c.title}</span>
                      <span style={{ marginLeft: 12, fontSize: 12, color: '#64748b' }}>{c.progress || 0}%</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Select an objective to view details</div>
          )}
        </div>
      </div>

      {showObjModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 32, width: 480 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>{editId ? 'Edit' : 'New'} Objective</h2>
            {[
              { label: 'Title', key: 'title', type: 'text' },
              { label: 'Description', key: 'description', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>{f.label}</label>
                <input value={(objForm as any)[f.key]} onChange={e => setObjForm({ ...objForm, [f.key]: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Period</label>
                <select value={objForm.period} onChange={e => setObjForm({ ...objForm, period: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }}>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Year</label>
                <input type="number" value={objForm.year} onChange={e => setObjForm({ ...objForm, year: +e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowObjModal(false)} style={{ padding: '10px 20px', background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveObjective} style={{ padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showKrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 32, width: 480 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>New Key Result</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Title</label>
              <input value={krForm.title} onChange={e => setKrForm({ ...krForm, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Metric Type</label>
                <select value={krForm.metric_type} onChange={e => setKrForm({ ...krForm, metric_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }}>
                  {['number', 'percentage', 'currency', 'boolean'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Target</label>
                <input type="number" value={krForm.target_value} onChange={e => setKrForm({ ...krForm, target_value: +e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Weight</label>
                <input type="number" value={krForm.weight} onChange={e => setKrForm({ ...krForm, weight: +e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowKrModal(false)} style={{ padding: '10px 20px', background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveKeyResult} style={{ padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OKRs;
