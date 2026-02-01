import React, { useState } from 'react';
import { Plus, Play, Pause, Trash2, Zap, Mail, Tag, Users, Bell, ClipboardList, Clock, GitBranch, ArrowRight, Settings, TestTube } from 'lucide-react';

type TriggerType = 'form_submit' | 'page_view' | 'email_open' | 'email_click' | 'list_join' | 'property_change' | 'score_change' | 'date';
type ActionType = 'send_email' | 'add_tag' | 'remove_tag' | 'add_to_list' | 'remove_from_list' | 'update_property' | 'notify_user' | 'create_task' | 'delay' | 'if_then';

interface WorkflowAction {
  order: number;
  type: ActionType;
  config: any;
}

interface Workflow {
  id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: any;
  actions: WorkflowAction[];
  is_active: boolean;
  execution_count: number;
}

const TRIGGER_LABELS: Record<TriggerType, { label: string; color: string; icon: React.ReactNode }> = {
  form_submit: { label: 'Form Submit', color: '#3b82f6', icon: <ClipboardList size={16} /> },
  page_view: { label: 'Page View', color: '#8b5cf6', icon: <Zap size={16} /> },
  email_open: { label: 'Email Open', color: '#22c55e', icon: <Mail size={16} /> },
  email_click: { label: 'Email Click', color: '#06b6d4', icon: <Mail size={16} /> },
  list_join: { label: 'List Join', color: '#f97316', icon: <Users size={16} /> },
  property_change: { label: 'Property Change', color: '#eab308', icon: <Settings size={16} /> },
  score_change: { label: 'Score Change', color: '#ef4444', icon: <Zap size={16} /> },
  date: { label: 'Date-based', color: '#a855f7', icon: <Clock size={16} /> },
};

const ACTION_LABELS: Record<ActionType, { label: string; icon: React.ReactNode }> = {
  send_email: { label: 'Send Email', icon: <Mail size={14} /> },
  add_tag: { label: 'Add Tag', icon: <Tag size={14} /> },
  remove_tag: { label: 'Remove Tag', icon: <Tag size={14} /> },
  add_to_list: { label: 'Add to List', icon: <Users size={14} /> },
  remove_from_list: { label: 'Remove from List', icon: <Users size={14} /> },
  update_property: { label: 'Update Property', icon: <Settings size={14} /> },
  notify_user: { label: 'Notify User', icon: <Bell size={14} /> },
  create_task: { label: 'Create Task', icon: <ClipboardList size={14} /> },
  delay: { label: 'Delay', icon: <Clock size={14} /> },
  if_then: { label: 'If/Then Branch', icon: <GitBranch size={14} /> },
};

const SAMPLE_WORKFLOWS: Workflow[] = [
  { id: '1', name: 'Welcome Email Sequence', trigger_type: 'form_submit', trigger_config: { form: 'signup' }, actions: [
    { order: 0, type: 'send_email', config: { template: 'welcome' } },
    { order: 1, type: 'delay', config: { duration: 2, unit: 'days' } },
    { order: 2, type: 'add_tag', config: { tag: 'onboarded' } },
    { order: 3, type: 'send_email', config: { template: 'getting_started' } },
  ], is_active: true, execution_count: 1543 },
  { id: '2', name: 'Lead Score Notification', trigger_type: 'score_change', trigger_config: { threshold: 80 }, actions: [
    { order: 0, type: 'notify_user', config: { message: 'Hot lead!' } },
    { order: 1, type: 'create_task', config: { title: 'Follow up with lead' } },
  ], is_active: true, execution_count: 234 },
  { id: '3', name: 'Re-engagement Campaign', trigger_type: 'date', trigger_config: { inactive_days: 30 }, actions: [
    { order: 0, type: 'send_email', config: { template: 'we_miss_you' } },
    { order: 1, type: 'delay', config: { duration: 5, unit: 'days' } },
    { order: 2, type: 'if_then', config: { condition: 'email_opened' } },
    { order: 3, type: 'remove_tag', config: { tag: 'inactive' } },
  ], is_active: false, execution_count: 89 },
  { id: '4', name: 'Webinar Follow-up', trigger_type: 'list_join', trigger_config: { list: 'webinar_attendees' }, actions: [
    { order: 0, type: 'send_email', config: { template: 'thanks_for_attending' } },
    { order: 1, type: 'delay', config: { duration: 1, unit: 'days' } },
    { order: 2, type: 'add_to_list', config: { list: 'nurture_sequence' } },
  ], is_active: true, execution_count: 567 },
];

export const MarketingWorkflows: React.FC = () => {
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [editingAction, setEditingAction] = useState<number | null>(null);

  const openBuilder = (wf: Workflow) => { setSelectedWorkflow(wf); setView('builder'); setEditingAction(null); };

  const addAction = (type: ActionType) => {
    if (!selectedWorkflow) return;
    const action: WorkflowAction = { order: selectedWorkflow.actions.length, type, config: {} };
    setSelectedWorkflow({ ...selectedWorkflow, actions: [...selectedWorkflow.actions, action] });
  };

  const removeAction = (order: number) => {
    if (!selectedWorkflow) return;
    setSelectedWorkflow({ ...selectedWorkflow, actions: selectedWorkflow.actions.filter(a => a.order !== order).map((a, i) => ({ ...a, order: i })) });
    if (editingAction === order) setEditingAction(null);
  };

  if (view === 'builder' && selectedWorkflow) {
    const wf = selectedWorkflow;
    const trigger = TRIGGER_LABELS[wf.trigger_type];
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
        {/* Main */}
        <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14 }}>&larr; Back</button>
              <h2 style={{ margin: 0, fontSize: 20 }}>{wf.name}</h2>
              <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, background: wf.is_active ? '#22c55e22' : '#6b728022', color: wf.is_active ? '#22c55e' : '#6b7280' }}>
                {wf.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TestTube size={14} /> Test
              </button>
              <button style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: wf.is_active ? '#eab30822' : '#00C971', color: wf.is_active ? '#eab308' : '#000', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {wf.is_active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}
              </button>
            </div>
          </div>

          {/* Trigger */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ background: `${trigger.color}22`, border: `2px solid ${trigger.color}`, borderRadius: 12, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 280, justifyContent: 'center' }}>
              <span style={{ color: trigger.color }}>{trigger.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>Trigger</div>
                <div style={{ fontWeight: 600 }}>{trigger.label}</div>
              </div>
            </div>
            <div style={{ width: 2, height: 24, background: '#333' }} />

            {/* Actions */}
            {wf.actions.map((action, i) => {
              const al = ACTION_LABELS[action.type];
              return (
                <React.Fragment key={i}>
                  <div onClick={() => setEditingAction(i)} style={{
                    background: '#141414', border: editingAction === i ? '2px solid #00C971' : '1px solid #222', borderRadius: 12,
                    padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 280, cursor: 'pointer', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#00C971' }}>{al.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, color: '#666' }}>Step {i + 1}</div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{al.label}</div>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeAction(action.order); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {i < wf.actions.length - 1 && <div style={{ width: 2, height: 20, background: '#333' }} />}
                </React.Fragment>
              );
            })}

            {/* Add Action */}
            <div style={{ width: 2, height: 20, background: '#333' }} />
            <div style={{ position: 'relative' }}>
              <details style={{ position: 'relative' }}>
                <summary style={{ padding: '10px 20px', borderRadius: 8, border: '2px dashed #333', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, listStyle: 'none' }}>
                  <Plus size={14} /> Add Action
                </summary>
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: 4, zIndex: 10, minWidth: 220 }}>
                  {(Object.entries(ACTION_LABELS) as [ActionType, { label: string; icon: React.ReactNode }][]).map(([type, al]) => (
                    <div key={type} onClick={() => addAction(type)} style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: '#ccc' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#222')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {al.icon} {al.label}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Config Panel */}
        {editingAction !== null && wf.actions[editingAction] && (
          <div style={{ width: 300, background: '#141414', borderLeft: '1px solid #222', padding: 20, overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Action Config</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Type</label>
              <div style={{ padding: '8px 12px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #333', fontSize: 13 }}>
                {ACTION_LABELS[wf.actions[editingAction].type].label}
              </div>
            </div>
            {wf.actions[editingAction].type === 'send_email' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Email Template</label>
                <input placeholder="template name" value={wf.actions[editingAction].config.template || ''}
                  onChange={e => {
                    const actions = [...wf.actions];
                    actions[editingAction] = { ...actions[editingAction], config: { ...actions[editingAction].config, template: e.target.value } };
                    setSelectedWorkflow({ ...wf, actions });
                  }}
                  style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}
            {(wf.actions[editingAction].type === 'add_tag' || wf.actions[editingAction].type === 'remove_tag') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Tag</label>
                <input placeholder="tag name" value={wf.actions[editingAction].config.tag || ''}
                  onChange={e => {
                    const actions = [...wf.actions];
                    actions[editingAction] = { ...actions[editingAction], config: { ...actions[editingAction].config, tag: e.target.value } };
                    setSelectedWorkflow({ ...wf, actions });
                  }}
                  style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}
            {wf.actions[editingAction].type === 'delay' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Duration</label>
                  <input type="number" value={wf.actions[editingAction].config.duration || ''}
                    onChange={e => {
                      const actions = [...wf.actions];
                      actions[editingAction] = { ...actions[editingAction], config: { ...actions[editingAction].config, duration: Number(e.target.value) } };
                      setSelectedWorkflow({ ...wf, actions });
                    }}
                    style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Unit</label>
                  <select value={wf.actions[editingAction].config.unit || 'days'}
                    onChange={e => {
                      const actions = [...wf.actions];
                      actions[editingAction] = { ...actions[editingAction], config: { ...actions[editingAction].config, unit: e.target.value } };
                      setSelectedWorkflow({ ...wf, actions });
                    }}
                    style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option>
                  </select>
                </div>
              </div>
            )}
            {wf.actions[editingAction].type === 'notify_user' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Message</label>
                <textarea value={wf.actions[editingAction].config.message || ''}
                  onChange={e => {
                    const actions = [...wf.actions];
                    actions[editingAction] = { ...actions[editingAction], config: { ...actions[editingAction].config, message: e.target.value } };
                    setSelectedWorkflow({ ...wf, actions });
                  }}
                  style={{ width: '100%', height: 80, padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // List view
  const totalExecutions = SAMPLE_WORKFLOWS.reduce((s, w) => s + w.execution_count, 0);
  const activeCount = SAMPLE_WORKFLOWS.filter(w => w.is_active).length;

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Marketing Workflows</h1>
          <p style={{ color: '#999', margin: '4px 0 0', fontSize: 14 }}>Automate your marketing with trigger-based workflows</p>
        </div>
        <button onClick={() => openBuilder({ id: 'new', name: 'New Workflow', trigger_type: 'form_submit', trigger_config: {}, actions: [], is_active: false, execution_count: 0 })}
          style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Workflow
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Workflows', value: SAMPLE_WORKFLOWS.length },
          { label: 'Active', value: activeCount },
          { label: 'Total Executions', value: totalExecutions.toLocaleString() },
        ].map(s => (
          <div key={s.label} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Workflow List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SAMPLE_WORKFLOWS.map(wf => {
          const trigger = TRIGGER_LABELS[wf.trigger_type];
          return (
            <div key={wf.id} onClick={() => openBuilder(wf)} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#00C971')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${trigger.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: trigger.color }}>{trigger.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{wf.name}</div>
                  <div style={{ color: '#999', fontSize: 13, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: trigger.color }}>{trigger.label}</span>
                    <ArrowRight size={12} color="#555" />
                    <span>{wf.actions.length} actions</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, background: wf.is_active ? '#22c55e22' : '#6b728022', color: wf.is_active ? '#22c55e' : '#6b7280', fontWeight: 500 }}>
                  {wf.is_active ? 'Active' : 'Inactive'}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{wf.execution_count.toLocaleString()}</div>
                  <div style={{ color: '#999', fontSize: 12 }}>executions</div>
                </div>
                <ArrowRight size={16} color="#555" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketingWorkflows;
