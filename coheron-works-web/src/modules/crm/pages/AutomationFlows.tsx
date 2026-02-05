import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Plus, Play, Pause, TestTube, Trash2, ArrowRight, Clock, GitBranch, Mail, UserPlus, Edit3, LayoutGrid, ChevronRight, X } from 'lucide-react';

const API = '/api/crm/automation-flows';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, opts?: RequestInit) => {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(opts?.headers || {}) } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
};

const statusColor: Record<string, string> = { draft: '#64748b', active: '#00C971', paused: '#f59e0b' };
const triggerLabels: Record<string, string> = { lead_created: 'Lead Created', lead_updated: 'Lead Updated', deal_stage_changed: 'Deal Stage Changed', score_threshold: 'Score Threshold', time_based: 'Time Based', form_submitted: 'Form Submitted', email_opened: 'Email Opened', email_clicked: 'Email Clicked' };
const nodeTypeIcons: Record<string, any> = { condition: GitBranch, action: Zap, delay: Clock, split: GitBranch };
const nodePalette = [
  { type: 'condition', label: 'Condition', icon: GitBranch },
  { type: 'action', label: 'Send Email', icon: Mail, config: { action: 'send_email' } },
  { type: 'delay', label: 'Wait', icon: Clock },
  { type: 'action', label: 'Assign', icon: UserPlus, config: { action: 'assign' } },
  { type: 'action', label: 'Update Field', icon: Edit3, config: { action: 'update_field' } },
  { type: 'action', label: 'Create Task', icon: LayoutGrid, config: { action: 'create_task' } },
  { type: 'split', label: 'Split Test', icon: GitBranch },
];

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

export const AutomationFlows: React.FC = () => {
  const [flows, setFlows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'designer'>('list');
  const [selected, setSelected] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', trigger: { type: 'lead_created', config: {} } });
  const [executions, setExecutions] = useState<any[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [f, t] = await Promise.all([apiFetch(''), apiFetch('/templates')]);
      setFlows(f); setTemplates(t);
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const createFlow = async (data?: any) => {
    try {
      await apiFetch('', { method: 'POST', body: JSON.stringify(data || { ...form, nodes: [], edges: [] }) });
      setShowCreate(false); setShowTemplates(false); await load();
    } catch (e) { console.error(e); }
  };

  const openDesigner = async (flow: any) => {
    setSelected(flow); setView('designer'); setSelectedNode(null);
    try { const ex = await apiFetch(`/${flow._id}/executions`); setExecutions(ex); } catch { setExecutions([]); }
  };

  const saveFlow = async () => {
    if (!selected) return;
    try { await apiFetch(`/${selected._id}`, { method: 'PUT', body: JSON.stringify({ nodes: selected.nodes, edges: selected.edges, name: selected.name, description: selected.description, trigger: selected.trigger }) }); await load(); } catch (e) { console.error(e); }
  };

  const toggleStatus = async (flow: any) => {
    const action = flow.status === 'active' ? 'pause' : 'activate';
    await apiFetch(`/${flow._id}/${action}`, { method: 'POST' }); await load();
  };

  const deleteFlow = async (id: string) => { await apiFetch(`/${id}`, { method: 'DELETE' }); await load(); };

  const testFlow = async () => {
    if (!selected) return;
    try {
      const result = await apiFetch(`/${selected._id}/test`, { method: 'POST', body: JSON.stringify({ lead_id: null }) });
      setExecutions(prev => [result.execution, ...prev]);
    } catch (e) { console.error(e); }
  };

  const addNode = (paletteItem: any) => {
    if (!selected) return;
    const id = `n${Date.now()}`;
    const newNode = { id, type: paletteItem.type, position: { x: 250, y: (selected.nodes?.length || 0) * 120 + 100 }, config: paletteItem.config || {}, next_nodes: [] };
    const nodes = [...(selected.nodes || []), newNode];
    // auto-connect to previous node
    const edges = [...(selected.edges || [])];
    if (nodes.length > 1) {
      const prev = nodes[nodes.length - 2];
      prev.next_nodes = [...(prev.next_nodes || []), id];
      edges.push({ source: prev.id, target: id, label: '' });
    }
    setSelected({ ...selected, nodes, edges });
  };

  const removeNode = (nodeId: string) => {
    if (!selected) return;
    const nodes = (selected.nodes || []).filter((n: any) => n.id !== nodeId).map((n: any) => ({ ...n, next_nodes: (n.next_nodes || []).filter((x: string) => x !== nodeId) }));
    const edges = (selected.edges || []).filter((e: any) => e.source !== nodeId && e.target !== nodeId);
    setSelected({ ...selected, nodes, edges });
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  };

  const updateNodeConfig = (nodeId: string, config: any) => {
    if (!selected) return;
    const nodes = (selected.nodes || []).map((n: any) => n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n);
    setSelected({ ...selected, nodes });
    setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, ...config } });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !selected || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nodes = (selected.nodes || []).map((n: any) => n.id === dragging ? { ...n, position: { x: Math.max(0, x - 60), y: Math.max(0, y - 20) } } : n);
    setSelected({ ...selected, nodes });
  };

  // Render connection lines as SVG
  const renderEdges = () => {
    if (!selected?.edges?.length || !selected?.nodes?.length) return null;
    const nodeMap: Record<string, any> = {};
    (selected.nodes || []).forEach((n: any) => { nodeMap[n.id] = n; });
    return (
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {(selected.edges || []).map((edge: any, i: number) => {
          const src = nodeMap[edge.source]; const tgt = nodeMap[edge.target];
          if (!src || !tgt) return null;
          const x1 = src.position.x + 60; const y1 = src.position.y + 40;
          const x2 = tgt.position.x + 60; const y2 = tgt.position.y;
          return <path key={i} d={`M${x1},${y1} C${x1},${y1 + 40} ${x2},${y2 - 40} ${x2},${y2}`} stroke="#00C971" strokeWidth={2} fill="none" strokeDasharray={edge.label ? '6,3' : 'none'} />;
        })}
      </svg>
    );
  };

  if (view === 'designer' && selected) {
    return (
      <div style={s.page}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => { setView('list'); setSelected(null); }} style={s.btnSm}>Back</button>
            <h2 style={{ margin: 0, fontSize: 18 }}>{selected.name}</h2>
            <span style={s.badge(statusColor[selected.status] || '#666')}>{selected.status}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={testFlow} style={{ ...s.btnSm, color: '#3b82f6', borderColor: '#3b82f6' }}><TestTube size={14} style={{ marginRight: 4 }} />Test</button>
            <button onClick={() => toggleStatus(selected)} style={s.btnSm}>{selected.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}</button>
            <button onClick={saveFlow} style={s.btn}>Save</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>
          {/* Sidebar palette */}
          <div style={{ ...s.card, width: 180, flexShrink: 0, overflowY: 'auto' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>ADD NODES</div>
            {nodePalette.map((item, i) => {
              const Icon = item.icon;
              return <div key={i} onClick={() => addNode(item)} style={{ ...s.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}><Icon size={14} color="#00C971" /><span style={{ fontSize: 12 }}>{item.label}</span></div>;
            })}
            <div style={{ fontSize: 12, color: '#888', marginTop: 16, marginBottom: 8, fontWeight: 600 }}>TRIGGER</div>
            <div style={{ fontSize: 12, color: '#00C971' }}>{triggerLabels[selected.trigger?.type] || selected.trigger?.type}</div>
          </div>

          {/* Canvas */}
          <div ref={canvasRef} onMouseMove={handleCanvasMouseMove} onMouseUp={() => setDragging(null)} style={{ ...s.card, flex: 1, position: 'relative', overflow: 'auto', minHeight: 500 }}>
            {renderEdges()}
            {/* Trigger node */}
            <div style={{ position: 'absolute', left: 190, top: 20, background: '#1a2e1a', border: '2px solid #00C971', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#00C971' }}>
              <Zap size={12} style={{ marginRight: 4 }} />{triggerLabels[selected.trigger?.type] || 'Trigger'}
            </div>
            {(selected.nodes || []).map((node: any, idx: number) => {
              const Icon = nodeTypeIcons[node.type] || Zap;
              const isSelected = selectedNode?.id === node.id;
              return (
                <div key={node.id || (node as any)._id || idx} onMouseDown={() => setDragging(node.id)} onClick={() => setSelectedNode(node)}
                  style={{ position: 'absolute', left: node.position.x, top: node.position.y, background: isSelected ? '#1a2a1a' : '#1a1a1a', border: `1px solid ${isSelected ? '#00C971' : '#333'}`, borderRadius: 8, padding: '10px 14px', minWidth: 120, cursor: 'grab', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={14} color="#00C971" />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{node.type}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0 }}><X size={12} /></button>
                  </div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{node.config?.action || node.config?.days ? `${node.config.days}d` : node.config?.field || 'Configure...'}</div>
                </div>
              );
            })}
          </div>

          {/* Config panel */}
          <div style={{ ...s.card, width: 260, flexShrink: 0, overflowY: 'auto' }}>
            {selectedNode ? (
              <>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>NODE CONFIG</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{selectedNode.type}</div>
                {selectedNode.type === 'delay' && (
                  <label style={{ fontSize: 12, color: '#aaa' }}>Delay (days)<input type="number" value={selectedNode.config?.days || 0} onChange={e => updateNodeConfig(selectedNode.id, { days: +e.target.value })} style={{ ...s.input, marginTop: 4 }} /></label>
                )}
                {selectedNode.type === 'condition' && (
                  <>
                    <label style={{ fontSize: 12, color: '#aaa' }}>Field<input value={selectedNode.config?.field || ''} onChange={e => updateNodeConfig(selectedNode.id, { field: e.target.value })} style={{ ...s.input, marginTop: 4, marginBottom: 8 }} /></label>
                    <label style={{ fontSize: 12, color: '#aaa' }}>Operator
                      <select value={selectedNode.config?.operator || 'equals'} onChange={e => updateNodeConfig(selectedNode.id, { operator: e.target.value })} style={{ ...s.select, width: '100%', marginTop: 4, marginBottom: 8 }}>
                        <option value="equals">Equals</option><option value="not_equals">Not Equals</option><option value="gt">Greater Than</option><option value="lt">Less Than</option><option value="contains">Contains</option>
                      </select>
                    </label>
                    <label style={{ fontSize: 12, color: '#aaa' }}>Value<input value={selectedNode.config?.value || ''} onChange={e => updateNodeConfig(selectedNode.id, { value: e.target.value })} style={{ ...s.input, marginTop: 4 }} /></label>
                  </>
                )}
                {selectedNode.type === 'action' && (
                  <>
                    <label style={{ fontSize: 12, color: '#aaa' }}>Action
                      <select value={selectedNode.config?.action || ''} onChange={e => updateNodeConfig(selectedNode.id, { action: e.target.value })} style={{ ...s.select, width: '100%', marginTop: 4, marginBottom: 8 }}>
                        <option value="send_email">Send Email</option><option value="assign">Assign</option><option value="update_field">Update Field</option><option value="create_task">Create Task</option>
                      </select>
                    </label>
                    {selectedNode.config?.action === 'send_email' && (
                      <>
                        <label style={{ fontSize: 12, color: '#aaa' }}>Subject<input value={selectedNode.config?.subject || ''} onChange={e => updateNodeConfig(selectedNode.id, { subject: e.target.value })} style={{ ...s.input, marginTop: 4, marginBottom: 8 }} /></label>
                        <label style={{ fontSize: 12, color: '#aaa' }}>Template<input value={selectedNode.config?.template || ''} onChange={e => updateNodeConfig(selectedNode.id, { template: e.target.value })} style={{ ...s.input, marginTop: 4 }} /></label>
                      </>
                    )}
                    {selectedNode.config?.action === 'create_task' && (
                      <label style={{ fontSize: 12, color: '#aaa' }}>Task Title<input value={selectedNode.config?.title || ''} onChange={e => updateNodeConfig(selectedNode.id, { title: e.target.value })} style={{ ...s.input, marginTop: 4 }} /></label>
                    )}
                  </>
                )}
                {selectedNode.type === 'split' && (
                  <label style={{ fontSize: 12, color: '#aaa' }}>Split Percentage<input type="number" value={selectedNode.config?.split_pct || 50} onChange={e => updateNodeConfig(selectedNode.id, { split_pct: +e.target.value })} style={{ ...s.input, marginTop: 4 }} /></label>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>EXECUTIONS ({executions.length})</div>
                {executions.slice(0, 10).map((ex: any, i: number) => (
                  <div key={i} style={{ ...s.card, padding: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={s.badge(ex.status === 'completed' ? '#22c55e' : ex.status === 'failed' ? '#ef4444' : '#3b82f6')}>{ex.status}</span>
                      <span style={{ color: '#666' }}>{new Date(ex.started_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{(ex.execution_log || []).length} steps</div>
                  </div>
                ))}
                {executions.length === 0 && <div style={{ fontSize: 12, color: '#555' }}>No executions yet. Click a node to configure it.</div>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Automation Flows</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Visual workflow automation for your CRM</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTemplates(true)} style={s.btnSm}><LayoutGrid size={14} style={{ marginRight: 4 }} />Templates</button>
          <button onClick={() => setShowCreate(true)} style={s.btn}><Plus size={14} style={{ marginRight: 4 }} />New Flow</button>
        </div>
      </div>

      {flows.length === 0 && <div style={{ ...s.card, textAlign: 'center', padding: 48, color: '#666' }}><Zap size={40} style={{ marginBottom: 12, opacity: 0.3 }} /><div>No automation flows yet. Create one or start from a template.</div></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340, 1fr))', gap: 12 }}>
        {flows.map((flow: any) => (
          <div key={flow._id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{flow.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{flow.description || 'No description'}</div>
              </div>
              <span style={s.badge(statusColor[flow.status] || '#666')}>{flow.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#888' }}>
              <span><Zap size={12} style={{ marginRight: 4 }} />{triggerLabels[flow.trigger?.type] || flow.trigger?.type}</span>
              <span>{flow.nodes?.length || 0} nodes</span>
              <span>{flow.execution_count || 0} runs</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button onClick={() => openDesigner(flow)} style={s.btnSm}>Edit <ChevronRight size={12} /></button>
              <button onClick={() => toggleStatus(flow)} style={s.btnSm}>{flow.status === 'active' ? <Pause size={12} /> : <Play size={12} />}</button>
              <button onClick={() => deleteFlow(flow._id)} style={{ ...s.btnSm, color: '#ef4444', borderColor: '#ef444444' }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={s.overlay} onClick={() => setShowCreate(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Create Automation Flow</h3>
            <label style={{ fontSize: 12, color: '#aaa' }}>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...s.input, marginTop: 4, marginBottom: 12 }} /></label>
            <label style={{ fontSize: 12, color: '#aaa' }}>Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...s.input, marginTop: 4, marginBottom: 12 }} /></label>
            <label style={{ fontSize: 12, color: '#aaa' }}>Trigger
              <select value={form.trigger.type} onChange={e => setForm({ ...form, trigger: { ...form.trigger, type: e.target.value } })} style={{ ...s.select, width: '100%', marginTop: 4, marginBottom: 16 }}>
                {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={s.btnSm}>Cancel</button>
              <button onClick={() => createFlow()} style={s.btn}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div style={s.overlay} onClick={() => setShowTemplates(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Flow Templates</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {templates.map((t: any, i: number) => (
                <div key={i} style={{ ...s.card, cursor: 'pointer' }} onClick={() => createFlow({ name: t.name, description: t.description, trigger: t.trigger, nodes: t.nodes, edges: [] })}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t.description}</div>
                  <div style={{ fontSize: 11, color: '#00C971', marginTop: 8 }}><ArrowRight size={12} style={{ marginRight: 4 }} />Click to use this template</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowTemplates(false)} style={s.btnSm}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationFlows;
