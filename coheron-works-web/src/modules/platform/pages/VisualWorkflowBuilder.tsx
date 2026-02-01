import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Plus, Trash2, GitBranch, CheckCircle, RotateCw, Clock, Diamond, Monitor, Zap, Filter, ArrowUpDown, ChevronRight, Bug, LayoutTemplate, GripVertical, X, Save } from 'lucide-react';

const API = '/api/platform/visual-workflows';

interface Node { id: string; type: string; label: string; position: { x: number; y: number }; config: any; }
interface Edge { id: string; source: string; target: string; label?: string; condition?: any; }
interface Workflow { _id: string; name: string; type: string; status: string; nodes: Node[]; edges: Edge[]; variables: any[]; description: string; object_type: string; trigger_config: any; execution_count: number; error_count: number; avg_execution_ms: number; version: number; }

const NODE_TYPES = [
  { type: 'start', label: 'Start', icon: Play, color: '#00C971' },
  { type: 'action', label: 'Action', icon: Zap, color: '#3B82F6' },
  { type: 'decision', label: 'Decision', icon: Diamond, color: '#F59E0B' },
  { type: 'loop', label: 'Loop', icon: RotateCw, color: '#8B5CF6' },
  { type: 'assignment', label: 'Assignment', icon: ArrowUpDown, color: '#EC4899' },
  { type: 'approval', label: 'Approval', icon: CheckCircle, color: '#10B981' },
  { type: 'subflow', label: 'Subflow', icon: GitBranch, color: '#6366F1' },
  { type: 'screen', label: 'Screen', icon: Monitor, color: '#06B6D4' },
  { type: 'wait', label: 'Wait', icon: Clock, color: '#F97316' },
  { type: 'collection_filter', label: 'Filter', icon: Filter, color: '#14B8A6' },
  { type: 'collection_sort', label: 'Sort', icon: ArrowUpDown, color: '#A855F7' },
];

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  record_triggered: { label: 'Record Triggered', color: '#3B82F6' },
  scheduled: { label: 'Scheduled', color: '#F59E0B' },
  platform_event: { label: 'Platform Event', color: '#8B5CF6' },
  approval: { label: 'Approval', color: '#10B981' },
  screen_flow: { label: 'Screen Flow', color: '#06B6D4' },
};

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 16 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnSec: { background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  input: { background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', width: '100%', fontSize: 14 } as React.CSSProperties,
  badge: (color: string) => ({ background: color + '22', color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }) as React.CSSProperties,
  select: { background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', fontSize: 14 } as React.CSSProperties,
};

const VisualWorkflowBuilder: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'builder' | 'templates' | 'debugger'>('list');
  const [current, setCurrent] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);
  const [showVars, setShowVars] = useState(false);

  const load = useCallback(async () => {
    const [wfRes, stRes] = await Promise.all([fetch(API), fetch(API + '/stats')]);
    setWorkflows(await wfRes.json());
    setStats(await stRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadTemplates = async () => {
    const r = await fetch(API + '/templates');
    setTemplates(await r.json());
    setView('templates');
  };

  const createWorkflow = async (data: any) => {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const wf = await r.json();
    setCurrent(wf);
    setView('builder');
    load();
  };

  const saveWorkflow = async () => {
    if (!current) return;
    await fetch(API + '/' + current._id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
    load();
  };

  const toggleStatus = async (wf: Workflow) => {
    const action = wf.status === 'active' ? 'deactivate' : 'activate';
    await fetch(API + '/' + wf._id + '/' + action, { method: 'POST' });
    load();
  };

  const deleteWorkflow = async (id: string) => {
    await fetch(API + '/' + id, { method: 'DELETE' });
    load();
  };

  const testWorkflow = async () => {
    if (!current) return;
    await fetch(API + '/' + current._id + '/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const r = await fetch(API + '/' + current._id + '/executions');
    setExecutions(await r.json());
  };

  const openDebugger = async (wf: Workflow) => {
    setCurrent(wf);
    const r = await fetch(API + '/' + wf._id + '/executions');
    setExecutions(await r.json());
    setView('debugger');
  };

  const addNode = (type: string, x: number, y: number) => {
    if (!current) return;
    const id = 'node_' + Date.now();
    const nt = NODE_TYPES.find(n => n.type === type);
    const node: Node = { id, type, label: nt?.label || type, position: { x, y }, config: {} };
    setCurrent({ ...current, nodes: [...current.nodes, node] });
  };

  const removeNode = (id: string) => {
    if (!current) return;
    setCurrent({ ...current, nodes: current.nodes.filter(n => n.id !== id), edges: current.edges.filter(e => e.source !== id && e.target !== id) });
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  const connectNodes = (sourceId: string, targetId: string) => {
    if (!current || sourceId === targetId) return;
    const id = 'edge_' + Date.now();
    setCurrent({ ...current, edges: [...current.edges, { id, source: sourceId, target: targetId }] });
  };

  const getNodeInfo = (type: string) => NODE_TYPES.find(n => n.type === type) || NODE_TYPES[0];

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragType) {
      const rect = (e.target as HTMLElement).closest('[data-canvas]')?.getBoundingClientRect();
      if (rect) addNode(dragType, e.clientX - rect.left, e.clientY - rect.top);
      setDragType(null);
    }
  };

  // Templates view
  if (view === 'templates') return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Workflow Templates</h1>
        <button style={s.btnSec} onClick={() => setView('list')}><X size={16} /> Back</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {templates.map(t => (
          <div key={t.id} style={s.card}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{t.name}</h3>
            <p style={{ color: '#888', fontSize: 14, margin: '0 0 12px' }}>{t.description}</p>
            <span style={s.badge(TYPE_BADGES[t.type]?.color || '#888')}>{TYPE_BADGES[t.type]?.label || t.type}</span>
            <div style={{ marginTop: 12 }}>
              <button style={s.btn} onClick={() => createWorkflow({ name: t.name, type: t.type, description: t.description, nodes: t.nodes || [], edges: t.edges || [], variables: [] })}>
                <Plus size={14} /> Use Template
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Debugger view
  if (view === 'debugger' && current) return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Execution Debugger: {current.name}</h1>
        <button style={s.btnSec} onClick={() => setView('list')}><X size={16} /> Back</button>
      </div>
      {executions.map((ex: any) => (
        <div key={ex._id} style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={s.badge(ex.status === 'completed' ? '#00C971' : ex.status === 'failed' ? '#EF4444' : '#F59E0B')}>{ex.status}</span>
            <span style={{ color: '#888', fontSize: 13 }}>{ex.duration_ms}ms - {new Date(ex.started_at).toLocaleString()}</span>
          </div>
          {ex.error_message && <div style={{ background: '#1a0000', border: '1px solid #441111', borderRadius: 8, padding: 12, marginBottom: 12, color: '#EF4444', fontSize: 13 }}>{ex.error_message}</div>}
          <div style={{ fontSize: 13 }}>
            <strong>Execution Path:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {(ex.execution_path || []).map((step: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ background: '#222', borderRadius: 6, padding: '4px 10px', fontSize: 12 }}>{step.node_id}</div>
                  {i < (ex.execution_path?.length || 0) - 1 && <ChevronRight size={14} style={{ color: '#555' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      {executions.length === 0 && <div style={{ ...s.card, textAlign: 'center', color: '#888' }}>No executions yet. Run a test first.</div>}
    </div>
  );

  // Builder view
  if (view === 'builder' && current) return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{current.name}</h1>
          <span style={s.badge(TYPE_BADGES[current.type]?.color || '#888')}>{TYPE_BADGES[current.type]?.label}</span>
          <span style={s.badge(current.status === 'active' ? '#00C971' : '#888')}>{current.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btnSec} onClick={() => setShowVars(!showVars)}>Variables</button>
          <button style={s.btnSec} onClick={testWorkflow}><Play size={14} /> Test Run</button>
          <button style={s.btn} onClick={saveWorkflow}><Save size={14} /> Save</button>
          <button style={s.btnSec} onClick={() => { setView('list'); setSelectedNode(null); }}><X size={14} /></button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 140px)' }}>
        {/* Node Palette */}
        <div style={{ ...s.card, width: 180, overflowY: 'auto', flexShrink: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#888' }}>NODES</h3>
          {NODE_TYPES.map(nt => {
            const Icon = nt.icon;
            return (
              <div key={nt.type} draggable onDragStart={() => setDragType(nt.type)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'grab', marginBottom: 4, border: '1px solid transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <GripVertical size={12} style={{ color: '#555' }} />
                <Icon size={16} style={{ color: nt.color }} />
                <span style={{ fontSize: 13 }}>{nt.label}</span>
              </div>
            );
          })}
        </div>
        {/* Canvas */}
        <div data-canvas style={{ ...s.card, flex: 1, position: 'relative', overflow: 'auto' }}
          onDrop={handleCanvasDrop} onDragOver={e => e.preventDefault()}>
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#555" /></marker></defs>
            {current.edges.map(edge => {
              const src = current.nodes.find(n => n.id === edge.source);
              const tgt = current.nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;
              return <line key={edge.id} x1={src.position.x + 70} y1={src.position.y + 25} x2={tgt.position.x + 70} y2={tgt.position.y + 25} stroke="#555" strokeWidth={2} markerEnd="url(#arrowhead)" />;
            })}
          </svg>
          {current.nodes.map(node => {
            const info = getNodeInfo(node.type);
            const Icon = info.icon;
            const isDecision = node.type === 'decision';
            return (
              <div key={node.id} style={{
                position: 'absolute', left: node.position.x, top: node.position.y,
                background: '#1a1a1a', border: `2px solid ${selectedNode?.id === node.id ? '#00C971' : info.color + '66'}`,
                borderRadius: isDecision ? 4 : 10, padding: '10px 16px', cursor: 'pointer', minWidth: 120,
                transform: isDecision ? 'rotate(0deg)' : undefined, zIndex: 1,
              }} onClick={() => setSelectedNode(node)}
                onDoubleClick={() => {
                  if (selectedNode && selectedNode.id !== node.id) connectNodes(selectedNode.id, node.id);
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={16} style={{ color: info.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{node.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{info.label}</div>
              </div>
            );
          })}
          {current.nodes.length === 0 && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', textAlign: 'center' }}>
              <p style={{ fontSize: 16 }}>Drag nodes from the palette to start building</p>
              <p style={{ fontSize: 13 }}>Double-click a node then double-click another to connect them</p>
            </div>
          )}
        </div>
        {/* Config Panel */}
        {selectedNode && (
          <div style={{ ...s.card, width: 280, overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Node Config</h3>
              <button style={{ ...s.btnSec, padding: '4px 8px' }} onClick={() => removeNode(selectedNode.id)}><Trash2 size={14} /></button>
            </div>
            <label style={{ fontSize: 12, color: '#888' }}>Label</label>
            <input style={{ ...s.input, marginBottom: 12 }} value={selectedNode.label}
              onChange={e => {
                const updated = { ...selectedNode, label: e.target.value };
                setSelectedNode(updated);
                setCurrent({ ...current, nodes: current.nodes.map(n => n.id === updated.id ? updated : n) });
              }} />
            <label style={{ fontSize: 12, color: '#888' }}>Type</label>
            <div style={{ ...s.input, marginBottom: 12, cursor: 'default' }}>{selectedNode.type}</div>
            <label style={{ fontSize: 12, color: '#888' }}>Position</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={s.input} type="number" value={selectedNode.position.x} onChange={e => {
                const updated = { ...selectedNode, position: { ...selectedNode.position, x: +e.target.value } };
                setSelectedNode(updated);
                setCurrent({ ...current, nodes: current.nodes.map(n => n.id === updated.id ? updated : n) });
              }} />
              <input style={s.input} type="number" value={selectedNode.position.y} onChange={e => {
                const updated = { ...selectedNode, position: { ...selectedNode.position, y: +e.target.value } };
                setSelectedNode(updated);
                setCurrent({ ...current, nodes: current.nodes.map(n => n.id === updated.id ? updated : n) });
              }} />
            </div>
          </div>
        )}
        {/* Variables Panel */}
        {showVars && (
          <div style={{ ...s.card, width: 260, overflowY: 'auto', flexShrink: 0 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Variables</h3>
            {(current.variables || []).map((v: any, i: number) => (
              <div key={i} style={{ marginBottom: 8, padding: 8, background: '#1a1a1a', borderRadius: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{v.type}{v.default_value != null ? ` = ${v.default_value}` : ''}</div>
              </div>
            ))}
            <button style={{ ...s.btnSec, width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => {
              setCurrent({ ...current, variables: [...(current.variables || []), { name: 'var_' + Date.now(), type: 'text', default_value: '' }] });
            }}><Plus size={14} /> Add Variable</button>
          </div>
        )}
      </div>
    </div>
  );

  // List view (default)
  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Visual Workflow Builder</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btnSec} onClick={loadTemplates}><LayoutTemplate size={16} /> Templates</button>
          <button style={s.btn} onClick={() => createWorkflow({ name: 'New Workflow', type: 'record_triggered', nodes: [], edges: [], variables: [] })}>
            <Plus size={16} /> New Workflow
          </button>
        </div>
      </div>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Workflows', value: stats.total },
            { label: 'Active', value: stats.active, color: '#00C971' },
            { label: 'Executions Today', value: stats.executions_today },
            { label: 'Error Rate', value: stats.error_rate + '%', color: +stats.error_rate > 5 ? '#EF4444' : '#00C971' },
          ].map(m => (
            <div key={m.label} style={s.card}>
              <div style={{ fontSize: 13, color: '#888' }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: m.color || '#e0e0e0' }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}
      {workflows.map(wf => (
        <div key={wf._id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{wf.name}</span>
              <span style={s.badge(TYPE_BADGES[wf.type]?.color || '#888')}>{TYPE_BADGES[wf.type]?.label || wf.type}</span>
              <span style={s.badge(wf.status === 'active' ? '#00C971' : wf.status === 'error' ? '#EF4444' : '#888')}>{wf.status}</span>
            </div>
            <div style={{ fontSize: 13, color: '#888' }}>
              {wf.nodes?.length || 0} nodes | {wf.execution_count} executions | {wf.error_count} errors | avg {wf.avg_execution_ms}ms | v{wf.version}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={s.btnSec} onClick={() => { setCurrent(wf); setView('builder'); }} title="Edit"><GitBranch size={14} /></button>
            <button style={s.btnSec} onClick={() => openDebugger(wf)} title="Debug"><Bug size={14} /></button>
            <button style={s.btnSec} onClick={() => toggleStatus(wf)} title="Toggle">{wf.status === 'active' ? <Pause size={14} /> : <Play size={14} />}</button>
            <button style={{ ...s.btnSec, color: '#EF4444' }} onClick={() => deleteWorkflow(wf._id)} title="Delete"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      {workflows.length === 0 && <div style={{ ...s.card, textAlign: 'center', color: '#888', padding: 40 }}>No workflows yet. Create one or start from a template.</div>}
    </div>
  );
};

export { VisualWorkflowBuilder };
export default VisualWorkflowBuilder;
