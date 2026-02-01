import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Zap, Plus, Trash2, Play, ToggleLeft, ToggleRight, Filter, GripVertical } from 'lucide-react';

const API = '/api/support/triggers';

const EVENTS = ['ticket_created','ticket_updated','ticket_assigned','ticket_commented','ticket_reopened','sla_warning','sla_breached','customer_replied','agent_replied','rating_submitted'];
const OPERATORS = ['is','is_not','contains','not_contains','greater_than','less_than','changed_to','changed_from'];
const ACTION_TYPES = ['set_priority','set_status','assign_to','add_tag','remove_tag','send_email','send_notification','add_internal_note','escalate','trigger_webhook','set_custom_field','add_cc','remove_cc'];
const FIELDS = ['status','priority','assignee','type','channel','tags','subject','requester_email','group','custom_field'];

const eventColors: Record<string, string> = {
  ticket_created: '#00C971', ticket_updated: '#3B82F6', ticket_assigned: '#8B5CF6',
  ticket_commented: '#F59E0B', ticket_reopened: '#EF4444', sla_warning: '#F97316',
  sla_breached: '#DC2626', customer_replied: '#06B6D4', agent_replied: '#10B981', rating_submitted: '#EC4899',
};

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
  tabs: { display: 'flex', gap: 8, marginBottom: 20 } as React.CSSProperties,
  tab: (active: boolean) => ({ padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: active ? '#00C971' : '#1a1a1a', color: active ? '#000' : '#aaa' }) as React.CSSProperties,
  card: { background: '#141414', borderRadius: 10, border: '1px solid #222', padding: 16, marginBottom: 12 } as React.CSSProperties,
  btn: (variant: string = 'primary') => ({ padding: '8px 16px', borderRadius: 6, border: variant === 'ghost' ? '1px solid #333' : 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: variant === 'primary' ? '#00C971' : variant === 'danger' ? '#DC2626' : 'transparent', color: variant === 'primary' ? '#000' : '#e0e0e0', display: 'inline-flex', alignItems: 'center', gap: 6 }) as React.CSSProperties,
  badge: (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: color + '22', color, border: `1px solid ${color}44` }) as React.CSSProperties,
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#e0e0e0', fontSize: 13, width: '100%' } as React.CSSProperties,
  select: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#e0e0e0', fontSize: 13 } as React.CSSProperties,
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 } as React.CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } as React.CSSProperties,
  label: { fontSize: 12, color: '#888', marginBottom: 4, display: 'block' } as React.CSSProperties,
  muted: { fontSize: 12, color: '#666' } as React.CSSProperties,
};

const emptyCondition = () => ({ field: 'status', operator: 'is', value: '' });
const emptyAction = () => ({ type: 'set_status', config: '' });

export const TriggerEngine: FC = () => {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [tab, setTab] = useState<'list' | 'builder' | 'simulate' | 'log'>('list');
  const [editing, setEditing] = useState<any>(null);
  const [simTicket, setSimTicket] = useState<any>({ status: 'open', priority: 'medium' });
  const [simEvent, setSimEvent] = useState('ticket_created');
  const [simResults, setSimResults] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const load = () => {
    fetch(API).then(r => r.json()).then(d => setTriggers(d.data || []));
    fetch(API + '/stats').then(r => r.json()).then(d => setStats(d.data));
  };
  useEffect(() => { load(); }, []);

  const loadLog = () => fetch(API + '/execution-log').then(r => r.json()).then(d => setLog(d.data || []));

  const saveTrigger = async () => {
    if (!editing) return;
    const method = editing._id ? 'PUT' : 'POST';
    const url = editing._id ? `${API}/${editing._id}` : API;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setEditing(null);
    load();
  };

  const deleteTrigger = async (id: string) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleTrigger = async (id: string) => {
    await fetch(`${API}/${id}/toggle`, { method: 'POST' });
    load();
  };

  const simulate = async () => {
    const r = await fetch(API + '/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: simEvent, ticket: simTicket }) });
    const d = await r.json();
    setSimResults(d.data);
  };

  const newTrigger = () => {
    setEditing({ name: '', description: '', trigger_event: 'ticket_created', conditions: { all: [emptyCondition()], any: [] }, actions: [emptyAction()], is_active: true, priority: triggers.length });
    setTab('builder');
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}><Zap size={22} color="#00C971" /> Trigger Engine</h1>
        <button style={s.btn()} onClick={newTrigger}><Plus size={14} /> New Trigger</button>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[{ label: 'Total', val: stats.total }, { label: 'Active', val: stats.active }, { label: 'Events', val: stats.by_event?.length || 0 }].map((s2, i) => (
            <div key={i} style={{ ...s.card, flex: 1, textAlign: 'center' as const }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#00C971' }}>{s2.val}</div>
              <div style={s.muted}>{s2.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={s.tabs}>
        {(['list', 'builder', 'simulate', 'log'] as const).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => { setTab(t); if (t === 'log') loadLog(); }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'list' && (
        <div>
          {triggers.length === 0 && <div style={{ ...s.card, textAlign: 'center' as const, color: '#666', padding: 40 }}>No triggers yet. Create one to automate your support workflow.</div>}
          {triggers.map(t => (
            <div key={t._id || t.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <GripVertical size={14} color="#444" />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>{t.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={s.badge(eventColors[t.trigger_event] || '#666')}>{t.trigger_event.replace(/_/g, ' ')}</span>
                    <span style={s.muted}>{t.conditions?.all?.length || 0} conditions</span>
                    <span style={s.muted}>{t.actions?.length || 0} actions</span>
                    <span style={s.muted}>Fired {t.execution_count || 0}x</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={s.btn('ghost')} onClick={() => toggleTrigger(t._id || t.id)}>
                  {t.is_active ? <ToggleRight size={18} color="#00C971" /> : <ToggleLeft size={18} color="#666" />}
                </button>
                <button style={s.btn('ghost')} onClick={() => { setEditing({ ...t }); setTab('builder'); }}><Filter size={14} /></button>
                <button style={s.btn('ghost')} onClick={() => deleteTrigger(t._id || t.id)}><Trash2 size={14} color="#DC2626" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'builder' && editing && (
        <div style={s.card}>
          <div style={s.grid}>
            <div>
              <label style={s.label}>Name</label>
              <input style={s.input} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Event</label>
              <select style={{ ...s.select, width: '100%' }} value={editing.trigger_event} onChange={e => setEditing({ ...editing, trigger_event: e.target.value })}>
                {EVENTS.map(ev => <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={s.label}>Description</label>
            <input style={s.input} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>Conditions (ALL must match)</span>
              <button style={s.btn('ghost')} onClick={() => setEditing({ ...editing, conditions: { ...editing.conditions, all: [...(editing.conditions?.all || []), emptyCondition()] } })}><Plus size={12} /> Add</button>
            </div>
            {(editing.conditions?.all || []).map((c: any, i: number) => (
              <div key={i} style={s.row}>
                <select style={s.select} value={c.field} onChange={e => { const all = [...editing.conditions.all]; all[i] = { ...c, field: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, all } }); }}>
                  {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select style={s.select} value={c.operator} onChange={e => { const all = [...editing.conditions.all]; all[i] = { ...c, operator: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, all } }); }}>
                  {OPERATORS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
                <input style={{ ...s.input, flex: 1 }} placeholder="Value" value={c.value} onChange={e => { const all = [...editing.conditions.all]; all[i] = { ...c, value: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, all } }); }} />
                <button style={s.btn('ghost')} onClick={() => { const all = editing.conditions.all.filter((_: any, j: number) => j !== i); setEditing({ ...editing, conditions: { ...editing.conditions, all } }); }}><Trash2 size={12} color="#DC2626" /></button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>Conditions (ANY must match)</span>
              <button style={s.btn('ghost')} onClick={() => setEditing({ ...editing, conditions: { ...editing.conditions, any: [...(editing.conditions?.any || []), emptyCondition()] } })}><Plus size={12} /> Add</button>
            </div>
            {(editing.conditions?.any || []).map((c: any, i: number) => (
              <div key={i} style={s.row}>
                <select style={s.select} value={c.field} onChange={e => { const any = [...editing.conditions.any]; any[i] = { ...c, field: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, any } }); }}>
                  {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select style={s.select} value={c.operator} onChange={e => { const any = [...editing.conditions.any]; any[i] = { ...c, operator: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, any } }); }}>
                  {OPERATORS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
                <input style={{ ...s.input, flex: 1 }} placeholder="Value" value={c.value} onChange={e => { const any = [...editing.conditions.any]; any[i] = { ...c, value: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, any } }); }} />
                <button style={s.btn('ghost')} onClick={() => { const any = editing.conditions.any.filter((_: any, j: number) => j !== i); setEditing({ ...editing, conditions: { ...editing.conditions, any } }); }}><Trash2 size={12} color="#DC2626" /></button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>Actions</span>
              <button style={s.btn('ghost')} onClick={() => setEditing({ ...editing, actions: [...(editing.actions || []), emptyAction()] })}><Plus size={12} /> Add</button>
            </div>
            {(editing.actions || []).map((a: any, i: number) => (
              <div key={i} style={s.row}>
                <select style={s.select} value={a.type} onChange={e => { const actions = [...editing.actions]; actions[i] = { ...a, type: e.target.value }; setEditing({ ...editing, actions }); }}>
                  {ACTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <input style={{ ...s.input, flex: 1 }} placeholder="Config value" value={typeof a.config === 'string' ? a.config : JSON.stringify(a.config || '')} onChange={e => { const actions = [...editing.actions]; actions[i] = { ...a, config: e.target.value }; setEditing({ ...editing, actions }); }} />
                <button style={s.btn('ghost')} onClick={() => { const actions = editing.actions.filter((_: any, j: number) => j !== i); setEditing({ ...editing, actions }); }}><Trash2 size={12} color="#DC2626" /></button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <button style={s.btn()} onClick={saveTrigger}>{editing._id ? 'Update' : 'Create'} Trigger</button>
            <button style={s.btn('ghost')} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {tab === 'simulate' && (
        <div style={s.card}>
          <h3 style={{ color: '#fff', marginBottom: 16 }}>Simulate Triggers</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Event</label>
            <select style={{ ...s.select, width: '100%' }} value={simEvent} onChange={e => setSimEvent(e.target.value)}>
              {EVENTS.map(ev => <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div style={s.grid}>
            {['status', 'priority', 'type', 'channel', 'assignee', 'subject'].map(field => (
              <div key={field}>
                <label style={s.label}>{field}</label>
                <input style={s.input} value={simTicket[field] || ''} onChange={e => setSimTicket({ ...simTicket, [field]: e.target.value })} />
              </div>
            ))}
          </div>
          <button style={{ ...s.btn(), marginTop: 16 }} onClick={simulate}><Play size={14} /> Run Simulation</button>

          {simResults && (
            <div style={{ marginTop: 20 }}>
              <div style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>Results: {simResults.matched?.length || 0} of {simResults.total_evaluated} triggers matched</div>
              {simResults.matched?.map((m: any, i: number) => (
                <div key={i} style={{ ...s.card, background: '#1a1a1a' }}>
                  <div style={{ fontWeight: 600, color: '#00C971' }}>{m.name}</div>
                  <div style={s.muted}>{m.actions?.length || 0} actions would execute</div>
                </div>
              ))}
              {simResults.matched?.length === 0 && <div style={s.muted}>No triggers matched the sample ticket.</div>}
            </div>
          )}
        </div>
      )}

      {tab === 'log' && (
        <div>
          {log.length === 0 && <div style={{ ...s.card, textAlign: 'center' as const, color: '#666' }}>No recent executions.</div>}
          {log.map((entry, i) => (
            <div key={i} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#fff' }}>{entry.name}</div>
                <span style={s.badge(eventColors[entry.trigger_event] || '#666')}>{entry.trigger_event?.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{ color: '#00C971', fontWeight: 600 }}>{entry.execution_count}x</div>
                <div style={s.muted}>{entry.last_triggered_at ? new Date(entry.last_triggered_at).toLocaleString() : '-'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TriggerEngine;
