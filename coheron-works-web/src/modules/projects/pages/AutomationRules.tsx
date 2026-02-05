import { useState, useEffect } from 'react';
import { Zap, Plus, Play, ToggleLeft, ToggleRight, Trash2, Edit } from 'lucide-react';

const API_BASE = '/api/projects/automation-rules';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const triggerLabels: Record<string, string> = {
  task_created: 'Task Created', task_status_changed: 'Status Changed', task_assigned: 'Task Assigned',
  due_date_passed: 'Due Date Passed', sprint_started: 'Sprint Started', sprint_ended: 'Sprint Ended',
};
const actionLabels: Record<string, string> = {
  assign_user: 'Assign User', change_status: 'Change Status', send_notification: 'Send Notification',
  add_label: 'Add Label', move_to_sprint: 'Move to Sprint',
};
const triggerColors: Record<string, string> = {
  task_created: '#22c55e', task_status_changed: '#3b82f6', task_assigned: '#f59e0b',
  due_date_passed: '#ef4444', sprint_started: '#a78bfa', sprint_ended: '#06b6d4',
};

export const AutomationRules: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', project_id: '', trigger_type: 'task_created', action_type: 'assign_user' });
  const [testResult, setTestResult] = useState<any>(null);

  const loadRules = async () => {
    setLoading(true);
    try { setRules(await apiFetch('/')); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadRules(); }, []);

  const saveRule = async () => {
    try {
      if (editId) {
        await apiFetch(`/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowModal(false);
      setEditId(null);
      setForm({ name: '', description: '', project_id: '', trigger_type: 'task_created', action_type: 'assign_user' });
      await loadRules();
    } catch (e) { console.error(e); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    await apiFetch(`/${id}`, { method: 'DELETE' });
    await loadRules();
  };

  const toggleRule = async (id: string) => {
    await apiFetch(`/${id}/toggle`, { method: 'POST' });
    await loadRules();
  };

  const testRule = async (id: string) => {
    try {
      const result = await apiFetch(`/${id}/test`, { method: 'POST' });
      setTestResult(result);
      setTimeout(() => setTestResult(null), 4000);
    } catch (e) { console.error(e); }
  };

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    totalExecutions: rules.reduce((s, r) => s + (r.execution_count || 0), 0),
  };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Zap size={28} color="#f59e0b" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Automation Rules</h1>
        </div>
        <button onClick={() => { setEditId(null); setForm({ name: '', description: '', project_id: '', trigger_type: 'task_created', action_type: 'assign_user' }); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          <Plus size={16} /> New Rule
        </button>
      </div>

      {testResult && (
        <div style={{ padding: 16, background: '#14532d', borderRadius: 8, marginBottom: 16, border: '1px solid #22c55e' }}>
          <strong>Test Result:</strong> {testResult.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Rules', value: stats.total, bg: '#1e3a5f' },
          { label: 'Active', value: stats.active, bg: '#14532d' },
          { label: 'Total Executions', value: stats.totalExecutions, bg: '#3b1f6e' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 12, padding: 20 }}>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rules.map(rule => (
            <div key={rule._id} style={{ background: '#111827', borderRadius: 12, padding: 20, border: rule.is_active ? '1px solid #1f2937' : '1px solid #374151', opacity: rule.is_active ? 1 : 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Zap size={18} color={rule.is_active ? '#f59e0b' : '#64748b'} />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{rule.name}</span>
                  {!rule.is_active && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#374151', color: '#94a3b8' }}>Disabled</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => testRule(rule._id)} title="Test" style={{ padding: 6, background: '#1e3a5f', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#60a5fa' }}><Play size={14} /></button>
                  <button onClick={() => toggleRule(rule._id)} title="Toggle" style={{ padding: 6, background: '#1f2937', border: 'none', borderRadius: 4, cursor: 'pointer', color: rule.is_active ? '#22c55e' : '#64748b' }}>
                    {rule.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button onClick={() => { setEditId(rule._id); setForm({ name: rule.name, description: rule.description || '', project_id: rule.project_id || '', trigger_type: rule.trigger_type, action_type: rule.action_type }); setShowModal(true); }} style={{ padding: 6, background: '#1e3a5f', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#60a5fa' }}><Edit size={14} /></button>
                  <button onClick={() => deleteRule(rule._id)} style={{ padding: 6, background: '#7f1d1d', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              </div>
              {rule.description && <p style={{ color: '#94a3b8', marginBottom: 12, fontSize: 13, margin: '0 0 12px 0' }}>{rule.description}</p>}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>WHEN</span>
                  <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: triggerColors[rule.trigger_type] || '#374151', color: '#fff' }}>{triggerLabels[rule.trigger_type] || rule.trigger_type}</span>
                </div>
                <span style={{ color: '#374151' }}>-&gt;</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>THEN</span>
                  <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#1f2937', color: '#94a3b8' }}>{actionLabels[rule.action_type] || rule.action_type}</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                  <span>Runs: {rule.execution_count || 0}</span>
                  {rule.last_triggered_at && <span>Last: {new Date(rule.last_triggered_at).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
          ))}
          {!rules.length && <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: '#111827', borderRadius: 12 }}>No automation rules yet. Create one to get started.</div>}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 32, width: 480 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>{editId ? 'Edit' : 'New'} Automation Rule</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Project ID</label>
              <input value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Trigger</label>
                <select value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }}>
                  {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Action</label>
                <select value={form.action_type} onChange={e => setForm({ ...form, action_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }}>
                  {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveRule} style={{ padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRules;
