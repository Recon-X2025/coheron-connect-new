import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, Play, ChevronDown, X, Users, Target, Scale, MapPin, UserCheck } from 'lucide-react';

const API = '/api/crm/assignment-rules';
const getToken = () => localStorage.getItem('token') || '';
const apiFetch = async (path: string, opts?: RequestInit) => {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(opts?.headers || {}) } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
};

const methodIcons: Record<string, any> = { round_robin: Users, weighted: Scale, territory: MapPin, least_loaded: Target, specific_user: UserCheck };
const methodLabels: Record<string, string> = { round_robin: 'Round Robin', weighted: 'Weighted', territory: 'Territory', least_loaded: 'Least Loaded', specific_user: 'Specific User' };
const operators = ['equals', 'not_equals', 'contains', 'gt', 'lt', 'in', 'not_in'];

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

export const AssignmentRules: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [simLead, setSimLead] = useState<Record<string, string>>({ source: '', industry: '', score: '' });
  const [simResult, setSimResult] = useState<any>(null);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', entity_type: 'lead', conditions: [{ field: '', operator: 'equals', value: '' }], assignment_method: 'round_robin', config: { user_ids: [] } });
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { const data = await apiFetch(''); setRules(data); } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const createRule = async () => {
    await apiFetch('', { method: 'POST', body: JSON.stringify(form) });
    setShowCreate(false); resetForm(); await load();
  };

  const updateRule = async () => {
    if (!editRule) return;
    await apiFetch(`/${editRule._id}`, { method: 'PUT', body: JSON.stringify(form) });
    setEditRule(null); resetForm(); await load();
  };

  const deleteRule = async (id: string) => { await apiFetch(`/${id}`, { method: 'DELETE' }); await load(); };

  const toggleRule = async (id: string) => { await apiFetch(`/${id}/toggle`, { method: 'POST' }); await load(); };

  const resetForm = () => setForm({ name: '', entity_type: 'lead', conditions: [{ field: '', operator: 'equals', value: '' }], assignment_method: 'round_robin', config: { user_ids: [] } });

  const simulate = async () => {
    try {
      const lead: any = { ...simLead };
      if (lead.score) lead.score = Number(lead.score);
      const result = await apiFetch('/simulate', { method: 'POST', body: JSON.stringify({ lead }) });
      setSimResult(result);
    } catch (e) { console.error(e); }
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const reordered = [...rules];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setRules(reordered);
    setDragIdx(null);
    const order = reordered.map((r, i) => ({ id: r._id, priority: i }));
    await apiFetch('/reorder', { method: 'POST', body: JSON.stringify({ order }) });
    await load();
  };

  const openEdit = (rule: any) => {
    setEditRule(rule);
    setForm({ name: rule.name, entity_type: rule.entity_type, conditions: rule.conditions || [{ field: '', operator: 'equals', value: '' }], assignment_method: rule.assignment_method, config: rule.config || { user_ids: [] } });
  };

  const addCondition = () => setForm({ ...form, conditions: [...form.conditions, { field: '', operator: 'equals', value: '' }] });
  const removeCondition = (idx: number) => setForm({ ...form, conditions: form.conditions.filter((_: any, i: number) => i !== idx) });
  const updateCondition = (idx: number, updates: any) => {
    const conds = [...form.conditions];
    conds[idx] = { ...conds[idx], ...updates };
    setForm({ ...form, conditions: conds });
  };

  const renderRuleForm = (onSave: () => void, title: string) => (
    <div style={s.overlay} onClick={() => { setShowCreate(false); setEditRule(null); }}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px' }}>{title}</h3>
        <label style={{ fontSize: 12, color: '#aaa' }}>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...s.input, marginTop: 4, marginBottom: 12 }} /></label>
        <label style={{ fontSize: 12, color: '#aaa' }}>Entity Type
          <select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })} style={{ ...s.select, width: '100%', marginTop: 4, marginBottom: 12 }}>
            <option value="lead">Lead</option><option value="deal">Deal</option>
          </select>
        </label>

        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>CONDITIONS</div>
        {form.conditions.map((cond: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input placeholder="Field (e.g. source)" value={cond.field} onChange={e => updateCondition(idx, { field: e.target.value })} style={{ ...s.input, flex: 1 }} />
            <select value={cond.operator} onChange={e => updateCondition(idx, { operator: e.target.value })} style={s.select}>
              {operators.map(op => <option key={op} value={op}>{op.replace('_', ' ')}</option>)}
            </select>
            <input placeholder="Value" value={cond.value} onChange={e => updateCondition(idx, { value: e.target.value })} style={{ ...s.input, flex: 1 }} />
            <button onClick={() => removeCondition(idx)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        ))}
        <button onClick={addCondition} style={{ ...s.btnSm, marginBottom: 16 }}><Plus size={12} style={{ marginRight: 4 }} />Add Condition</button>

        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>ASSIGNMENT METHOD</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
          {Object.entries(methodLabels).map(([key, label]) => {
            const Icon = methodIcons[key] || Users;
            const active = form.assignment_method === key;
            return (
              <div key={key} onClick={() => setForm({ ...form, assignment_method: key })} style={{ ...s.card, cursor: 'pointer', border: `1px solid ${active ? '#00C971' : '#222'}`, background: active ? '#0a1f0a' : '#141414', padding: 12, textAlign: 'center' }}>
                <Icon size={18} color={active ? '#00C971' : '#666'} style={{ marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 600 }}>{label}</div>
              </div>
            );
          })}
        </div>

        {form.assignment_method === 'specific_user' && (
          <label style={{ fontSize: 12, color: '#aaa' }}>User IDs (comma-separated)
            <input value={(form.config?.user_ids || []).join(', ')} onChange={e => setForm({ ...form, config: { ...form.config, user_ids: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } })} style={{ ...s.input, marginTop: 4, marginBottom: 12 }} />
          </label>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => { setShowCreate(false); setEditRule(null); }} style={s.btnSm}>Cancel</button>
          <button onClick={onSave} style={s.btn}>Save</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Assignment Rules</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Auto-assign leads and deals based on conditions and methods</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowSimulate(true)} style={s.btnSm}><Play size={14} style={{ marginRight: 4 }} />Simulate</button>
          <button onClick={() => { resetForm(); setShowCreate(true); }} style={s.btn}><Plus size={14} style={{ marginRight: 4 }} />New Rule</button>
        </div>
      </div>

      {rules.length === 0 && <div style={{ ...s.card, textAlign: 'center', padding: 48, color: '#666' }}><Shield size={40} style={{ marginBottom: 12, opacity: 0.3 }} /><div>No assignment rules yet.</div></div>}

      {rules.map((rule: any, idx: number) => {
        const MethodIcon = methodIcons[rule.assignment_method] || Users;
        return (
          <div key={rule._id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={handleDragOver} onDrop={() => handleDrop(idx)}
            style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12, opacity: rule.is_active ? 1 : 0.5 }}>
            <GripVertical size={16} color="#555" style={{ cursor: 'grab', flexShrink: 0 }} />
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#00C971', flexShrink: 0 }}>{idx + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{rule.name}</span>
                <span style={s.badge(rule.entity_type === 'lead' ? '#3b82f6' : '#a855f7')}>{rule.entity_type}</span>
                <span style={s.badge(rule.is_active ? '#00C971' : '#64748b')}>{rule.is_active ? 'active' : 'inactive'}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#888' }}>
                <span>{(rule.conditions || []).length} condition(s)</span>
                <span><MethodIcon size={11} style={{ marginRight: 2 }} />{methodLabels[rule.assignment_method]}</span>
                <span>{rule.assigned_count || 0} assigned</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => openEdit(rule)} style={s.btnSm}>Edit</button>
              <button onClick={() => toggleRule(rule._id)} style={s.btnSm}>{rule.is_active ? <ToggleRight size={14} color="#00C971" /> : <ToggleLeft size={14} />}</button>
              <button onClick={() => deleteRule(rule._id)} style={{ ...s.btnSm, color: '#ef4444', borderColor: '#ef444444' }}><Trash2 size={12} /></button>
            </div>
          </div>
        );
      })}

      {showCreate && renderRuleForm(createRule, 'Create Assignment Rule')}
      {editRule && renderRuleForm(updateRule, 'Edit Assignment Rule')}

      {/* Simulate Modal */}
      {showSimulate && (
        <div style={s.overlay} onClick={() => setShowSimulate(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Simulate Assignment</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Enter lead data to see which rule matches:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#aaa' }}>Source<input value={simLead.source} onChange={e => setSimLead({ ...simLead, source: e.target.value })} style={{ ...s.input, marginTop: 4 }} placeholder="e.g. website" /></label>
              <label style={{ fontSize: 12, color: '#aaa' }}>Industry<input value={simLead.industry} onChange={e => setSimLead({ ...simLead, industry: e.target.value })} style={{ ...s.input, marginTop: 4 }} placeholder="e.g. tech" /></label>
              <label style={{ fontSize: 12, color: '#aaa' }}>Score<input value={simLead.score} onChange={e => setSimLead({ ...simLead, score: e.target.value })} style={{ ...s.input, marginTop: 4 }} placeholder="e.g. 85" /></label>
              <label style={{ fontSize: 12, color: '#aaa' }}>Region<input value={simLead.region || ''} onChange={e => setSimLead({ ...simLead, region: e.target.value })} style={{ ...s.input, marginTop: 4 }} placeholder="e.g. NA" /></label>
            </div>
            <button onClick={simulate} style={{ ...s.btn, marginBottom: 16 }}>Run Simulation</button>
            {simResult && (
              <div style={s.card}>
                {simResult.matched ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#00C971', marginBottom: 4 }}>Matched: {simResult.matched.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Method: {methodLabels[simResult.matched.assignment_method]}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Conditions: {(simResult.matched.conditions || []).map((c: any) => `${c.field} ${c.operator} ${c.value}`).join(', ')}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#ef4444' }}>No rule matched this lead data.</div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowSimulate(false)} style={s.btnSm}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentRules;
