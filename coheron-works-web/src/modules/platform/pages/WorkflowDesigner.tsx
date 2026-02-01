import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Save, Upload, Zap, Mail, GitBranch, Clock, RotateCw,
  Plus, Trash2, Check, Globe, Bell, Database,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────

interface WFNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'loop';
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface WFEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface Workflow {
  _id?: string;
  name: string;
  description: string;
  nodes: WFNode[];
  edges: WFEdge[];
  status: 'draft' | 'published' | 'archived';
  version: number;
}

interface NodeDef {
  type: WFNode['type'];
  subtype: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  defaultData: Record<string, any>;
}

// ── Constants ───────────────────────────────────────────────────────

const TOKEN = localStorage.getItem('token') || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

const NODE_W = 200;
const NODE_H = 64;

const NODE_PALETTE: NodeDef[] = [
  { type: 'trigger', subtype: 'webhook', label: 'Webhook', icon: <Globe size={16} />, color: '#00C971', defaultData: { trigger: 'webhook', url: '' } },
  { type: 'trigger', subtype: 'schedule', label: 'Schedule', icon: <Clock size={16} />, color: '#00C971', defaultData: { trigger: 'schedule', cron: '0 9 * * 1' } },
  { type: 'trigger', subtype: 'record_change', label: 'Record Change', icon: <Database size={16} />, color: '#00C971', defaultData: { trigger: 'record_change', model: '', event: 'create' } },
  { type: 'action', subtype: 'create_record', label: 'Create Record', icon: <Plus size={16} />, color: '#2196f3', defaultData: { action_type: 'create_record', model: '', fields: {} } },
  { type: 'action', subtype: 'update_record', label: 'Update Record', icon: <Database size={16} />, color: '#2196f3', defaultData: { action_type: 'update_record', model: '', filter: {}, update: {} } },
  { type: 'action', subtype: 'send_email', label: 'Send Email', icon: <Mail size={16} />, color: '#2196f3', defaultData: { action_type: 'send_email', to: '', subject: '', body: '' } },
  { type: 'action', subtype: 'send_notification', label: 'Notification', icon: <Bell size={16} />, color: '#2196f3', defaultData: { action_type: 'send_notification', channel: 'in_app', message: '' } },
  { type: 'action', subtype: 'api_call', label: 'API Call', icon: <Globe size={16} />, color: '#2196f3', defaultData: { action_type: 'api_call', method: 'GET', url: '', body: '' } },
  { type: 'condition', subtype: 'if_else', label: 'If / Else', icon: <GitBranch size={16} />, color: '#ff9800', defaultData: { condition: '', true_label: 'Yes', false_label: 'No' } },
  { type: 'delay', subtype: 'wait', label: 'Delay', icon: <Clock size={16} />, color: '#9c27b0', defaultData: { duration: '1h' } },
  { type: 'loop', subtype: 'loop', label: 'Loop', icon: <RotateCw size={16} />, color: '#e91e63', defaultData: { collection: '', variable: 'item' } },
];

// ── Component ───────────────────────────────────────────────────────

export const WorkflowDesigner: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [current, setCurrent] = useState<Workflow | null>(null);
  const [selectedNode, setSelectedNode] = useState<WFNode | null>(null);
  const [connecting, setConnecting] = useState<{ sourceId: string; mouseX: number; mouseY: number } | null>(null);
  const [draggingNode, setDraggingNode] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Fetch workflows ─────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/workflow-designer', { headers });
        const data = await res.json();
        setWorkflows(data.workflows || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────────

  const createNew = () => {
    setCurrent({
      name: 'New Workflow', description: '', nodes: [], edges: [],
      status: 'draft', version: 1,
    });
    setSelectedNode(null);
    setTestResult(null);
  };

  const loadWorkflow = async (id: string) => {
    const res = await fetch(`/api/workflow-designer/${id}`, { headers });
    const data = await res.json();
    setCurrent(data);
    setSelectedNode(null);
    setTestResult(null);
  };

  const saveWorkflow = async () => {
    if (!current) return;
    setSaving(true);
    try {
      if (current._id) {
        const res = await fetch(`/api/workflow-designer/${current._id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ name: current.name, description: current.description, nodes: current.nodes, edges: current.edges }),
        });
        const data = await res.json();
        setCurrent(data);
      } else {
        const res = await fetch('/api/workflow-designer', {
          method: 'POST', headers,
          body: JSON.stringify(current),
        });
        const data = await res.json();
        setCurrent(data);
        setWorkflows(prev => [...prev, data]);
      }
    } catch { /* empty */ }
    setSaving(false);
  };

  const publishWorkflow = async () => {
    if (!current?._id) return;
    try {
      const res = await fetch(`/api/workflow-designer/${current._id}/publish`, { method: 'POST', headers });
      if (!res.ok) { const e = await res.json(); alert(e.error); return; }
      const data = await res.json();
      setCurrent(data);
    } catch { /* empty */ }
  };

  const testWorkflow = async () => {
    if (!current?._id) return;
    try {
      const res = await fetch(`/api/workflow-designer/${current._id}/test`, {
        method: 'POST', headers, body: JSON.stringify({ test_data: { sample: true } }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch { /* empty */ }
  };

  // ── Node operations ───────────────────────────────────────────────

  const addNode = (def: NodeDef) => {
    if (!current) return;
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newNode: WFNode = {
      id, type: def.type,
      position: { x: 300 + Math.random() * 200, y: 100 + current.nodes.length * 90 },
      data: { ...def.defaultData, label: def.label, subtype: def.subtype },
    };
    setCurrent({ ...current, nodes: [...current.nodes, newNode] });
  };

  const deleteNode = (nodeId: string) => {
    if (!current) return;
    setCurrent({
      ...current,
      nodes: current.nodes.filter(n => n.id !== nodeId),
      edges: current.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    });
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  };

  const updateNodeData = (nodeId: string, key: string, value: any) => {
    if (!current) return;
    const nodes = current.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n);
    setCurrent({ ...current, nodes });
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: { ...prev.data, [key]: value } } : prev);
  };

  // ── Drag node ─────────────────────────────────────────────────────

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = current?.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingNode({ nodeId, offsetX: e.clientX - rect.left - node.position.x, offsetY: e.clientY - rect.top - node.position.y });
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode && current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - draggingNode.offsetX;
      const y = e.clientY - rect.top - draggingNode.offsetY;
      setCurrent(prev => prev ? {
        ...prev,
        nodes: prev.nodes.map(n => n.id === draggingNode.nodeId ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } } : n),
      } : prev);
    }
    if (connecting) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setConnecting(prev => prev ? { ...prev, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top } : null);
    }
  }, [draggingNode, connecting, current]);

  const handleCanvasMouseUp = useCallback(() => {
    setDraggingNode(null);
    setConnecting(null);
  }, []);

  // ── Connect nodes ─────────────────────────────────────────────────

  const startConnect = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setConnecting({ sourceId: nodeId, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top });
  };

  const endConnect = (targetId: string) => {
    if (!connecting || !current) return;
    if (connecting.sourceId === targetId) { setConnecting(null); return; }
    const exists = current.edges.some(e => e.source === connecting.sourceId && e.target === targetId);
    if (!exists) {
      const edge: WFEdge = { id: `edge_${Date.now()}`, source: connecting.sourceId, target: targetId };
      setCurrent({ ...current, edges: [...current.edges, edge] });
    }
    setConnecting(null);
  };

  // ── Node color ────────────────────────────────────────────────────

  const nodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return '#00C971';
      case 'action': return '#2196f3';
      case 'condition': return '#ff9800';
      case 'delay': return '#9c27b0';
      case 'loop': return '#e91e63';
      default: return '#666';
    }
  };

  // ── Styles ────────────────────────────────────────────────────────

  const S = {
    page: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
    header: { padding: '16px 24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    body: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: { width: 240, borderRight: '1px solid #222', background: '#111', overflowY: 'auto' as const, padding: 12 },
    canvas: { flex: 1, position: 'relative' as const, overflow: 'auto', background: '#0d0d0d', cursor: draggingNode ? 'grabbing' : 'default' },
    configPanel: { width: 300, borderLeft: '1px solid #222', background: '#111', overflowY: 'auto' as const, padding: 16 },
    btn: { background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 } as React.CSSProperties,
    btnPrimary: { background: '#00C971', border: '1px solid #00C971', color: '#000', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 } as React.CSSProperties,
    input: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%' } as React.CSSProperties,
    label: { fontSize: 11, color: '#939393', marginBottom: 4, display: 'block' } as React.CSSProperties,
    paletteItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, marginBottom: 4 } as React.CSSProperties,
  };

  // ── Render list view ──────────────────────────────────────────────

  if (!current) {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Workflow Designer</h1>
          <button style={S.btnPrimary} onClick={createNew}><Plus size={14} /> New Workflow</button>
        </div>
        <div style={{ padding: 24 }}>
          {loading && <div style={{ color: '#939393', textAlign: 'center', padding: 40 }}>Loading...</div>}
          {!loading && workflows.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#939393' }}>
              <Zap size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No workflows yet. Create your first visual workflow.</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {workflows.map(wf => (
              <div key={wf._id} onClick={() => loadWorkflow(wf._id!)}
                style={{ background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 16, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{wf.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: wf.status === 'published' ? '#00C97122' : '#333',
                    color: wf.status === 'published' ? '#00C971' : '#939393' }}>
                    {wf.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#939393' }}>{wf.description || 'No description'}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>v{wf.version} - {wf.nodes?.length || 0} nodes</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Render designer ───────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={S.btn} onClick={() => setCurrent(null)}>Back</button>
          <input style={{ ...S.input, width: 240, fontWeight: 600 }} value={current.name}
            onChange={e => setCurrent({ ...current, name: e.target.value })} />
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4,
            background: current.status === 'published' ? '#00C97122' : '#333',
            color: current.status === 'published' ? '#00C971' : '#939393' }}>
            {current.status} v{current.version}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btn} onClick={testWorkflow}><Play size={14} /> Test</button>
          <button style={S.btn} onClick={saveWorkflow} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button style={S.btnPrimary} onClick={publishWorkflow}><Upload size={14} /> Publish</button>
        </div>
      </div>

      <div style={S.body}>
        {/* Node Palette */}
        <div style={S.sidebar}>
          <div style={{ fontSize: 11, color: '#939393', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Node Palette</div>
          {['trigger', 'action', 'condition', 'delay', 'loop'].map(type => (
            <div key={type}>
              <div style={{ fontSize: 10, color: '#666', margin: '12px 0 4px', textTransform: 'uppercase' }}>{type}s</div>
              {NODE_PALETTE.filter(n => n.type === type).map(def => (
                <div key={def.subtype} style={{ ...S.paletteItem, border: `1px solid ${def.color}33` }}
                  onClick={() => addNode(def)}>
                  <div style={{ color: def.color }}>{def.icon}</div>
                  <span>{def.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div ref={canvasRef} style={S.canvas}
          onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp}>
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            <defs>
              <marker id="wf-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#939393" />
              </marker>
            </defs>
            {/* Edges */}
            {current.edges.map(edge => {
              const src = current.nodes.find(n => n.id === edge.source);
              const tgt = current.nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;
              const x1 = src.position.x + NODE_W;
              const y1 = src.position.y + NODE_H / 2;
              const x2 = tgt.position.x;
              const y2 = tgt.position.y + NODE_H / 2;
              const midX = (x1 + x2) / 2;
              return <path key={edge.id} d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                fill="none" stroke="#939393" strokeWidth={1.5} markerEnd="url(#wf-arrow)" style={{ pointerEvents: 'auto' }} />;
            })}
            {/* Connecting line */}
            {connecting && (() => {
              const src = current.nodes.find(n => n.id === connecting.sourceId);
              if (!src) return null;
              return <line x1={src.position.x + NODE_W} y1={src.position.y + NODE_H / 2}
                x2={connecting.mouseX} y2={connecting.mouseY}
                stroke="#00C971" strokeWidth={1.5} strokeDasharray="4 2" style={{ pointerEvents: 'none' }} />;
            })()}
          </svg>

          {/* Nodes */}
          {current.nodes.map(node => {
            const color = nodeColor(node.type);
            const isSelected = selectedNode?.id === node.id;
            return (
              <div key={node.id}
                style={{
                  position: 'absolute', left: node.position.x, top: node.position.y,
                  width: NODE_W, height: NODE_H,
                  background: '#1a1a1a', border: `2px solid ${isSelected ? color : '#333'}`,
                  borderRadius: 8, cursor: 'grab', userSelect: 'none',
                  display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10,
                }}
                onMouseDown={e => handleNodeMouseDown(e, node.id)}
                onClick={e => { e.stopPropagation(); setSelectedNode(node); }}>
                {/* Input port */}
                {node.type !== 'trigger' && (
                  <div style={{ position: 'absolute', left: -6, top: NODE_H / 2 - 6, width: 12, height: 12, borderRadius: '50%', background: '#333', border: '2px solid #555', cursor: 'crosshair' }}
                    onMouseUp={e => { e.stopPropagation(); endConnect(node.id); }} />
                )}
                {/* Content */}
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                  {NODE_PALETTE.find(d => d.subtype === node.data.subtype)?.icon || <Zap size={14} />}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.data.label || node.type}
                  </div>
                  <div style={{ fontSize: 10, color: '#666' }}>{node.type}</div>
                </div>
                {/* Output port */}
                <div style={{ position: 'absolute', right: -6, top: NODE_H / 2 - 6, width: 12, height: 12, borderRadius: '50%', background: color, cursor: 'crosshair' }}
                  onMouseDown={e => startConnect(e, node.id)} />
              </div>
            );
          })}
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <div style={S.configPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>Node Config</span>
              <button style={{ ...S.btn, padding: '4px 8px', color: '#ff4444', borderColor: '#ff444444' }}
                onClick={() => deleteNode(selectedNode.id)}>
                <Trash2 size={12} /> Delete
              </button>
            </div>

            <label style={S.label}>Label</label>
            <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.label || ''}
              onChange={e => updateNodeData(selectedNode.id, 'label', e.target.value)} />

            <label style={S.label}>Type</label>
            <div style={{ fontSize: 13, color: '#939393', marginBottom: 12, padding: '6px 10px', background: '#1a1a1a', borderRadius: 6 }}>
              {selectedNode.type} / {selectedNode.data.subtype || '-'}
            </div>

            {/* Dynamic fields based on type */}
            {selectedNode.type === 'trigger' && selectedNode.data.trigger === 'webhook' && (
              <>
                <label style={S.label}>Webhook URL</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.url || ''} placeholder="https://..."
                  onChange={e => updateNodeData(selectedNode.id, 'url', e.target.value)} />
              </>
            )}
            {selectedNode.type === 'trigger' && selectedNode.data.trigger === 'schedule' && (
              <>
                <label style={S.label}>Cron Expression</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.cron || ''} placeholder="0 9 * * 1"
                  onChange={e => updateNodeData(selectedNode.id, 'cron', e.target.value)} />
              </>
            )}
            {selectedNode.type === 'trigger' && selectedNode.data.trigger === 'record_change' && (
              <>
                <label style={S.label}>Model</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.model || ''}
                  onChange={e => updateNodeData(selectedNode.id, 'model', e.target.value)} />
                <label style={S.label}>Event</label>
                <select style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.event || 'create'}
                  onChange={e => updateNodeData(selectedNode.id, 'event', e.target.value)}>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                </select>
              </>
            )}
            {selectedNode.type === 'action' && selectedNode.data.action_type === 'send_email' && (
              <>
                <label style={S.label}>To</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.to || ''}
                  onChange={e => updateNodeData(selectedNode.id, 'to', e.target.value)} />
                <label style={S.label}>Subject</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.subject || ''}
                  onChange={e => updateNodeData(selectedNode.id, 'subject', e.target.value)} />
                <label style={S.label}>Body</label>
                <textarea style={{ ...S.input, marginBottom: 12, minHeight: 60, resize: 'vertical' }} value={selectedNode.data.body || ''}
                  onChange={e => updateNodeData(selectedNode.id, 'body', e.target.value)} />
              </>
            )}
            {selectedNode.type === 'action' && selectedNode.data.action_type === 'api_call' && (
              <>
                <label style={S.label}>Method</label>
                <select style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.method || 'GET'}
                  onChange={e => updateNodeData(selectedNode.id, 'method', e.target.value)}>
                  <option value="GET">GET</option><option value="POST">POST</option>
                  <option value="PUT">PUT</option><option value="DELETE">DELETE</option>
                </select>
                <label style={S.label}>URL</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.url || ''}
                  onChange={e => updateNodeData(selectedNode.id, 'url', e.target.value)} />
              </>
            )}
            {selectedNode.type === 'action' && (selectedNode.data.action_type === 'create_record' || selectedNode.data.action_type === 'update_record') && (
              <>
                <label style={S.label}>Model</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.model || ''}
                  onChange={e => updateNodeData(selectedNode.id, 'model', e.target.value)} />
              </>
            )}
            {selectedNode.type === 'action' && selectedNode.data.action_type === 'send_notification' && (
              <>
                <label style={S.label}>Channel</label>
                <select style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.channel || 'in_app'}
                  onChange={e => updateNodeData(selectedNode.id, 'channel', e.target.value)}>
                  <option value="in_app">In-App</option><option value="email">Email</option>
                  <option value="sms">SMS</option><option value="push">Push</option>
                </select>
                <label style={S.label}>Message</label>
                <textarea style={{ ...S.input, marginBottom: 12, minHeight: 60, resize: 'vertical' }} value={selectedNode.data.message || ''}
                  onChange={e => updateNodeData(selectedNode.id, 'message', e.target.value)} />
              </>
            )}
            {selectedNode.type === 'condition' && (
              <>
                <label style={S.label}>Condition Expression</label>
                <textarea style={{ ...S.input, marginBottom: 12, minHeight: 60, resize: 'vertical' }} value={selectedNode.data.condition || ''}
                  placeholder="e.g. record.amount > 1000"
                  onChange={e => updateNodeData(selectedNode.id, 'condition', e.target.value)} />
              </>
            )}
            {selectedNode.type === 'delay' && (
              <>
                <label style={S.label}>Duration</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.duration || ''}
                  placeholder="e.g. 1h, 30m, 2d"
                  onChange={e => updateNodeData(selectedNode.id, 'duration', e.target.value)} />
              </>
            )}
            {selectedNode.type === 'loop' && (
              <>
                <label style={S.label}>Collection</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.collection || ''}
                  onChange={e => updateNodeData(selectedNode.id, 'collection', e.target.value)} />
                <label style={S.label}>Item Variable</label>
                <input style={{ ...S.input, marginBottom: 12 }} value={selectedNode.data.variable || 'item'}
                  onChange={e => updateNodeData(selectedNode.id, 'variable', e.target.value)} />
              </>
            )}

            <div style={{ fontSize: 10, color: '#666', marginTop: 12 }}>Node ID: {selectedNode.id}</div>
          </div>
        )}
      </div>

      {/* Test result panel */}
      {testResult && (
        <div style={{ borderTop: '1px solid #222', background: '#111', padding: 16, maxHeight: 200, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              <Check size={14} style={{ color: '#00C971', marginRight: 4 }} />
              Test Result - {testResult.nodes_executed}/{testResult.total_nodes} nodes executed
            </span>
            <button style={{ ...S.btn, padding: '2px 8px' }} onClick={() => setTestResult(null)}>Close</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {testResult.execution_log?.map((log: any, i: number) => (
              <div key={i} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
                <span style={{ color: nodeColor(log.type) }}>{log.type}</span>
                <span style={{ color: '#939393', marginLeft: 6 }}>{log.node_id.slice(0, 12)}</span>
                <span style={{ color: '#00C971', marginLeft: 6 }}>{log.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowDesigner;
