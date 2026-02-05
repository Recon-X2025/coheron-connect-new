import { useState, useEffect, useCallback } from 'react';
import { Mail, Plus, Play, Pause, Trash2, Clock, MessageSquare, CheckSquare, Phone, Users, BarChart3, ChevronRight, X } from 'lucide-react';

const API = '/api/crm/nurture-sequences';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, opts?: RequestInit) => {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(opts?.headers || {}) } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
};

const statusColor: Record<string, string> = { draft: '#64748b', active: '#00C971', paused: '#f59e0b' };
const stepIcons: Record<string, any> = { email: Mail, wait: Clock, condition: ChevronRight, task: CheckSquare, sms: Phone, whatsapp: MessageSquare };

const s = {
  page: { background: '#0a0a0a', color: '#e2e2e2', minHeight: '100vh', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 16, marginBottom: 12 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 } as React.CSSProperties,
  btnSm: { background: '#222', color: '#ccc', border: '1px solid #333', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 } as React.CSSProperties,
  badge: (c: string) => ({ background: c + '22', color: c, borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 600 }) as React.CSSProperties,
  input: { background: '#1a1a1a', color: '#e2e2e2', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', width: '100%', fontSize: 13, outline: 'none' } as React.CSSProperties,
  select: { background: '#1a1a1a', color: '#e2e2e2', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none' } as React.CSSProperties,
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, width: '90%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto' as const },
};

export const NurtureSequences: React.FC = () => {
  const [sequences, setSequences] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [selected, setSelected] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollIds, setEnrollIds] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });

  const load = useCallback(async () => {
    try { const data = await apiFetch(''); setSequences(data); } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    await apiFetch('', { method: 'POST', body: JSON.stringify({ ...form, steps: [], target_segment: { filters: {} } }) });
    setShowCreate(false); setForm({ name: '', description: '' }); await load();
  };

  const openBuilder = async (seq: any) => {
    setSelected(seq); setView('builder');
    try { const a = await apiFetch(`/${seq._id}/analytics`); setAnalytics(a); } catch { setAnalytics(null); }
  };

  const saveSeq = async () => {
    if (!selected) return;
    await apiFetch(`/${selected._id}`, { method: 'PUT', body: JSON.stringify({ name: selected.name, description: selected.description, steps: selected.steps, target_segment: selected.target_segment }) });
    await load();
  };

  const toggleStatus = async (seq: any) => {
    await apiFetch(`/${seq._id}/activate`, { method: 'POST' }); await load();
  };

  const deleteSeq = async (id: string) => { await apiFetch(`/${id}`, { method: 'DELETE' }); await load(); };

  const enrollLeads = async () => {
    if (!selected) return;
    const ids = enrollIds.split(',').map(s => s.trim()).filter(Boolean);
    await apiFetch(`/${selected._id}/enroll`, { method: 'POST', body: JSON.stringify({ lead_ids: ids }) });
    setShowEnroll(false); setEnrollIds('');
    const a = await apiFetch(`/${selected._id}/analytics`); setAnalytics(a);
  };

  const addStep = (type: string) => {
    if (!selected) return;
    const steps = [...(selected.steps || []), { order: (selected.steps || []).length + 1, type, delay_days: type === 'wait' ? 1 : 0, delay_hours: 0, config: {}, sent_count: 0, open_rate: 0, click_rate: 0 }];
    setSelected({ ...selected, steps });
  };

  const removeStep = (idx: number) => {
    if (!selected) return;
    const steps = (selected.steps || []).filter((_: any, i: number) => i !== idx).map((s: any, i: number) => ({ ...s, order: i + 1 }));
    setSelected({ ...selected, steps });
  };

  const updateStep = (idx: number, updates: any) => {
    if (!selected) return;
    const steps = (selected.steps || []).map((s: any, i: number) => i === idx ? { ...s, ...updates } : s);
    setSelected({ ...selected, steps });
  };

  const updateStepConfig = (idx: number, configUpdates: any) => {
    if (!selected) return;
    const steps = (selected.steps || []).map((s: any, i: number) => i === idx ? { ...s, config: { ...s.config, ...configUpdates } } : s);
    setSelected({ ...selected, steps });
  };

  if (view === 'builder' && selected) {
    return (
      <div style={s.page}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => { setView('list'); setSelected(null); }} style={s.btnSm}>Back</button>
            <h2 style={{ margin: 0, fontSize: 18 }}>{selected.name}</h2>
            <span style={s.badge(statusColor[selected.status] || '#666')}>{selected.status}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowEnroll(true)} style={s.btnSm}><Users size={14} style={{ marginRight: 4 }} />Enroll</button>
            <button onClick={() => toggleStatus(selected)} style={s.btnSm}>{selected.status === 'active' ? <Pause size={14} /> : <Play size={14} />}</button>
            <button onClick={saveSeq} style={s.btn}>Save</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {/* Timeline */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 12, fontWeight: 600 }}>SEQUENCE STEPS</div>
            {(selected.steps || []).map((step: any, idx: number) => {
              const Icon = stepIcons[step.type] || Mail;
              const funnelData = analytics?.funnel?.[idx];
              return (
                <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 0 }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#00C971', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>{idx + 1}</div>
                    {idx < (selected.steps || []).length - 1 && <div style={{ width: 2, flex: 1, background: '#333', minHeight: 40 }} />}
                  </div>
                  <div style={{ ...s.card, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} color="#00C971" />
                        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{step.type}</span>
                        {step.type === 'wait' && <span style={{ fontSize: 11, color: '#888' }}>({step.delay_days}d {step.delay_hours}h)</span>}
                      </div>
                      <button onClick={() => removeStep(idx)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                    {/* Config inputs */}
                    {step.type === 'email' && (
                      <div style={{ marginTop: 8 }}>
                        <input placeholder="Subject" value={step.config?.subject || ''} onChange={e => updateStepConfig(idx, { subject: e.target.value })} style={{ ...s.input, marginBottom: 6 }} />
                        <textarea placeholder="Body" value={step.config?.body || ''} onChange={e => updateStepConfig(idx, { body: e.target.value })} style={{ ...s.input, minHeight: 60, resize: 'vertical' } as any} />
                      </div>
                    )}
                    {step.type === 'wait' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input type="number" placeholder="Days" value={step.delay_days} onChange={e => updateStep(idx, { delay_days: +e.target.value })} style={{ ...s.input, width: 80 }} />
                        <input type="number" placeholder="Hours" value={step.delay_hours} onChange={e => updateStep(idx, { delay_hours: +e.target.value })} style={{ ...s.input, width: 80 }} />
                      </div>
                    )}
                    {step.type === 'condition' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input placeholder="Field" value={step.config?.condition_field || ''} onChange={e => updateStepConfig(idx, { condition_field: e.target.value })} style={{ ...s.input, flex: 1 }} />
                        <select value={step.config?.condition_operator || 'equals'} onChange={e => updateStepConfig(idx, { condition_operator: e.target.value })} style={s.select}>
                          <option value="equals">Equals</option><option value="not_equals">Not Equals</option><option value="contains">Contains</option><option value="gt">GT</option><option value="lt">LT</option>
                        </select>
                        <input placeholder="Value" value={step.config?.condition_value || ''} onChange={e => updateStepConfig(idx, { condition_value: e.target.value })} style={{ ...s.input, flex: 1 }} />
                      </div>
                    )}
                    {step.type === 'task' && (
                      <input placeholder="Task title" value={step.config?.task_title || ''} onChange={e => updateStepConfig(idx, { task_title: e.target.value })} style={{ ...s.input, marginTop: 8 }} />
                    )}
                    {(step.type === 'sms' || step.type === 'whatsapp') && (
                      <textarea placeholder="Message body" value={step.config?.body || ''} onChange={e => updateStepConfig(idx, { body: e.target.value })} style={{ ...s.input, marginTop: 8, minHeight: 40, resize: 'vertical' } as any} />
                    )}
                    {/* Funnel stats */}
                    {funnelData && (
                      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#888' }}>
                        <span>Reached: {funnelData.reached} ({funnelData.percentage}%)</span>
                        {funnelData.open_rate > 0 && <span>Open: {funnelData.open_rate}%</span>}
                        {funnelData.click_rate > 0 && <span>Click: {funnelData.click_rate}%</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add step buttons */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {Object.keys(stepIcons).map(type => (
                <button key={type} onClick={() => addStep(type)} style={s.btnSm}>
                  <Plus size={12} style={{ marginRight: 4 }} />{type}
                </button>
              ))}
            </div>
          </div>

          {/* Analytics panel */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={s.card}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12, fontWeight: 600 }}><BarChart3 size={14} style={{ marginRight: 4 }} />FUNNEL ANALYTICS</div>
              {analytics ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 }}>
                    <span>Enrolled: <strong style={{ color: '#00C971' }}>{analytics.total_enrolled}</strong></span>
                    <span>Completed: <strong style={{ color: '#00C971' }}>{analytics.completed}</strong></span>
                  </div>
                  {(analytics.funnel || []).map((step: any, i: number) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                        <span style={{ textTransform: 'capitalize' }}>Step {step.step_index + 1}: {step.step_type}</span>
                        <span>{step.percentage}%</span>
                      </div>
                      <div style={{ background: '#222', borderRadius: 4, height: 16, overflow: 'hidden' }}>
                        <div style={{ background: '#00C971', height: '100%', width: `${step.percentage}%`, borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#555' }}>Enroll leads to see analytics</div>
              )}
            </div>

            <div style={s.card}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>STATS</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#00C971' }}>{selected.enrolled_count || 0}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Total enrolled</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#00C971', marginTop: 8 }}>{selected.conversion_rate || 0}%</div>
              <div style={{ fontSize: 11, color: '#888' }}>Conversion rate</div>
            </div>
          </div>
        </div>

        {/* Enroll Modal */}
        {showEnroll && (
          <div style={s.overlay} onClick={() => setShowEnroll(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px' }}>Enroll Leads</h3>
              <label style={{ fontSize: 12, color: '#aaa' }}>Lead IDs (comma-separated)
                <textarea value={enrollIds} onChange={e => setEnrollIds(e.target.value)} style={{ ...s.input, marginTop: 4, minHeight: 80, resize: 'vertical' } as any} placeholder="lead_id_1, lead_id_2, ..." />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setShowEnroll(false)} style={s.btnSm}>Cancel</button>
                <button onClick={enrollLeads} style={s.btn}>Enroll</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Nurture Sequences</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Multi-channel lead nurturing with email, SMS, WhatsApp, and tasks</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={s.btn}><Plus size={14} style={{ marginRight: 4 }} />New Sequence</button>
      </div>

      {sequences.length === 0 && <div style={{ ...s.card, textAlign: 'center', padding: 48, color: '#666' }}><Mail size={40} style={{ marginBottom: 12, opacity: 0.3 }} /><div>No nurture sequences yet.</div></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {sequences.map((seq: any) => (
          <div key={seq._id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{seq.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{seq.description || 'No description'}</div>
              </div>
              <span style={s.badge(statusColor[seq.status] || '#666')}>{seq.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#888' }}>
              <span>{seq.steps?.length || 0} steps</span>
              <span><Users size={12} style={{ marginRight: 2 }} />{seq.enrolled_count || 0} enrolled</span>
              <span>{seq.conversion_rate || 0}% conv.</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button onClick={() => openBuilder(seq)} style={s.btnSm}>Edit <ChevronRight size={12} /></button>
              <button onClick={() => toggleStatus(seq)} style={s.btnSm}>{seq.status === 'active' ? <Pause size={12} /> : <Play size={12} />}</button>
              <button onClick={() => deleteSeq(seq._id)} style={{ ...s.btnSm, color: '#ef4444', borderColor: '#ef444444' }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div style={s.overlay} onClick={() => setShowCreate(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Create Nurture Sequence</h3>
            <label style={{ fontSize: 12, color: '#aaa' }}>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...s.input, marginTop: 4, marginBottom: 12 }} /></label>
            <label style={{ fontSize: 12, color: '#aaa' }}>Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...s.input, marginTop: 4, marginBottom: 16 }} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={s.btnSm}>Cancel</button>
              <button onClick={create} style={s.btn}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurtureSequences;
