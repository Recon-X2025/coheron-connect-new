import React, { useState } from 'react';
import { Play, Pause, Plus, Trash2, GitBranch, Mail, Clock, MessageSquare, Phone, Zap, Users, ArrowRight, BarChart3, Layout, ChevronRight } from 'lucide-react';

type JourneyStatus = 'draft' | 'active' | 'paused' | 'completed';
type NodeType = 'email' | 'sms' | 'whatsapp' | 'wait' | 'condition' | 'ab_split' | 'update_property' | 'add_to_list' | 'remove_from_list' | 'webhook' | 'internal_notification';

interface JourneyNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  config: any;
  stats: { entered: number; completed: number; failed: number };
}

interface Journey {
  id: string;
  name: string;
  description?: string;
  status: JourneyStatus;
  nodes: JourneyNode[];
  edges: { source: string; target: string; label?: string }[];
  enrolled_count: number;
  goal_achieved_count: number;
  conversion_rate: number;
}

const NODE_PALETTE: { type: NodeType; label: string; color: string; icon: React.ReactNode }[] = [
  { type: 'email', label: 'Send Email', color: '#3b82f6', icon: <Mail size={16} /> },
  { type: 'sms', label: 'Send SMS', color: '#8b5cf6', icon: <Phone size={16} /> },
  { type: 'whatsapp', label: 'WhatsApp', color: '#22c55e', icon: <MessageSquare size={16} /> },
  { type: 'wait', label: 'Wait / Delay', color: '#6b7280', icon: <Clock size={16} /> },
  { type: 'condition', label: 'If/Then', color: '#eab308', icon: <GitBranch size={16} /> },
  { type: 'ab_split', label: 'A/B Split', color: '#f97316', icon: <GitBranch size={16} /> },
  { type: 'update_property', label: 'Update Property', color: '#06b6d4', icon: <Zap size={16} /> },
  { type: 'add_to_list', label: 'Add to List', color: '#10b981', icon: <Users size={16} /> },
  { type: 'remove_from_list', label: 'Remove from List', color: '#ef4444', icon: <Users size={16} /> },
  { type: 'webhook', label: 'Webhook', color: '#a855f7', icon: <Zap size={16} /> },
  { type: 'internal_notification', label: 'Notify Team', color: '#f59e0b', icon: <MessageSquare size={16} /> },
];

const TEMPLATES = [
  { name: 'Welcome Series', description: 'Onboard new contacts with a 5-step welcome sequence', nodeCount: 5 },
  { name: 'Re-engagement', description: 'Win back inactive contacts', nodeCount: 3 },
  { name: 'Abandoned Cart', description: 'Recover abandoned shopping carts', nodeCount: 4 },
  { name: 'Event Follow-up', description: 'Follow up after event attendance', nodeCount: 3 },
  { name: 'Lead Nurture', description: 'Nurture leads through the funnel', nodeCount: 5 },
  { name: 'Upsell', description: 'Cross-sell to existing customers', nodeCount: 3 },
];

const STATUS_COLORS: Record<JourneyStatus, string> = { draft: '#6b7280', active: '#22c55e', paused: '#eab308', completed: '#3b82f6' };

const nodeColor = (type: NodeType) => NODE_PALETTE.find(n => n.type === type)?.color || '#6b7280';
const nodeIcon = (type: NodeType) => NODE_PALETTE.find(n => n.type === type)?.icon || <Zap size={16} />;

const SAMPLE_JOURNEYS: Journey[] = [
  { id: '1', name: 'Welcome Series', status: 'active', enrolled_count: 1243, goal_achieved_count: 312, conversion_rate: 25.1,
    nodes: [
      { id: 'n1', type: 'email', position: { x: 300, y: 60 }, config: { subject: 'Welcome!' }, stats: { entered: 1243, completed: 1200, failed: 12 } },
      { id: 'n2', type: 'wait', position: { x: 300, y: 160 }, config: { duration: 2, unit: 'days' }, stats: { entered: 1200, completed: 1180, failed: 0 } },
      { id: 'n3', type: 'condition', position: { x: 300, y: 260 }, config: { field: 'opened' }, stats: { entered: 1180, completed: 900, failed: 0 } },
      { id: 'n4', type: 'email', position: { x: 300, y: 360 }, config: { subject: 'Getting Started' }, stats: { entered: 900, completed: 870, failed: 5 } },
    ],
    edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }, { source: 'n3', target: 'n4' }],
  },
  { id: '2', name: 'Abandoned Cart Recovery', status: 'active', enrolled_count: 567, goal_achieved_count: 89, conversion_rate: 15.7, nodes: [], edges: [] },
  { id: '3', name: 'Lead Nurture Campaign', status: 'draft', enrolled_count: 0, goal_achieved_count: 0, conversion_rate: 0, nodes: [], edges: [] },
  { id: '4', name: 'Re-engagement Flow', status: 'paused', enrolled_count: 2100, goal_achieved_count: 420, conversion_rate: 20, nodes: [], edges: [] },
];

export const JourneyBuilder: React.FC = () => {
  const [view, setView] = useState<'list' | 'builder' | 'templates'>('list');
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const openBuilder = (j: Journey) => { setSelectedJourney(j); setSelectedNode(null); setView('builder'); };

  if (view === 'templates') {
    return (
      <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14 }}>Back to Journeys</button>
          <ChevronRight size={14} color="#555" />
          <span style={{ color: '#00C971', fontWeight: 600 }}>Templates Gallery</span>
        </div>
        <h2 style={{ margin: 0, marginBottom: 24 }}>Journey Templates</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {TEMPLATES.map(t => (
            <div key={t.name} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, cursor: 'pointer' }}
              onClick={() => {
                setSelectedJourney({ id: 'new', name: t.name, description: t.description, status: 'draft', nodes: [], edges: [], enrolled_count: 0, goal_achieved_count: 0, conversion_rate: 0 });
                setView('builder');
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Layout size={20} color="#00C971" />
                <h3 style={{ margin: 0 }}>{t.name}</h3>
              </div>
              <p style={{ color: '#999', fontSize: 14, margin: '0 0 16px' }}>{t.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', fontSize: 13 }}>
                <GitBranch size={14} /> {t.nodeCount} steps
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'builder' && selectedJourney) {
    const j = selectedJourney;
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
        {/* Sidebar - Node Palette */}
        <div style={{ width: 240, background: '#141414', borderRight: '1px solid #222', padding: 16, overflowY: 'auto' }}>
          <button onClick={() => { setView('list'); setSelectedNode(null); }} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
            &larr; Back
          </button>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Add Node</h3>
          {NODE_PALETTE.map(n => (
            <div key={n.type} draggable style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6,
              background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, cursor: 'grab', fontSize: 13,
            }}
              onClick={() => {
                const newNode: JourneyNode = { id: `n${Date.now()}`, type: n.type, position: { x: 300, y: (j.nodes.length + 1) * 100 }, config: {}, stats: { entered: 0, completed: 0, failed: 0 } };
                const newEdges = j.nodes.length > 0 ? [...j.edges, { source: j.nodes[j.nodes.length - 1].id, target: newNode.id }] : j.edges;
                setSelectedJourney({ ...j, nodes: [...j.nodes, newNode], edges: newEdges });
              }}>
              <span style={{ color: n.color }}>{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{j.name}</h2>
              <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: `${STATUS_COLORS[j.status]}22`, color: STATUS_COLORS[j.status] }}>{j.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAnalytics(!showAnalytics)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #333', background: showAnalytics ? '#00C97122' : 'transparent', color: showAnalytics ? '#00C971' : '#ccc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={14} /> Analytics
              </button>
              {j.status === 'draft' || j.status === 'paused' ? (
                <button style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Play size={14} /> Activate
                </button>
              ) : (
                <button style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #eab308', background: 'transparent', color: '#eab308', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pause size={14} /> Pause
                </button>
              )}
            </div>
          </div>

          {/* SVG Canvas */}
          <svg style={{ width: '100%', minHeight: 600 }}>
            {/* Edges */}
            {j.edges.map((e, i) => {
              const src = j.nodes.find(n => n.id === e.source);
              const tgt = j.nodes.find(n => n.id === e.target);
              if (!src || !tgt) return null;
              return <line key={i} x1={src.position.x + 80} y1={src.position.y + 40} x2={tgt.position.x + 80} y2={tgt.position.y} stroke="#333" strokeWidth={2} markerEnd="url(#arrow)" />;
            })}
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#555" />
              </marker>
            </defs>
            {/* Nodes */}
            {j.nodes.map(n => (
              <g key={n.id} onClick={() => setSelectedNode(n)} style={{ cursor: 'pointer' }}>
                <rect x={n.position.x} y={n.position.y} width={160} height={48} rx={10} fill={`${nodeColor(n.type)}22`} stroke={selectedNode?.id === n.id ? '#00C971' : nodeColor(n.type)} strokeWidth={selectedNode?.id === n.id ? 2 : 1} />
                <text x={n.position.x + 40} y={n.position.y + 29} fill="#fff" fontSize={13} fontFamily="system-ui">{NODE_PALETTE.find(p => p.type === n.type)?.label || n.type}</text>
                <circle cx={n.position.x + 20} cy={n.position.y + 24} r={8} fill={nodeColor(n.type)} />
                {showAnalytics && (
                  <text x={n.position.x + 165} y={n.position.y + 29} fill="#999" fontSize={11} fontFamily="system-ui">{n.stats.entered} entered</text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <div style={{ width: 300, background: '#141414', borderLeft: '1px solid #222', padding: 20, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>Node Config</h3>
              <button onClick={() => {
                setSelectedJourney({ ...j, nodes: j.nodes.filter(n => n.id !== selectedNode.id), edges: j.edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id) });
                setSelectedNode(null);
              }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Type</label>
              <div style={{ padding: '8px 12px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #333', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: nodeColor(selectedNode.type) }}>{nodeIcon(selectedNode.type)}</span>
                {NODE_PALETTE.find(p => p.type === selectedNode.type)?.label}
              </div>
            </div>
            {selectedNode.type === 'email' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Subject Line</label>
                <input value={selectedNode.config?.subject || ''} onChange={e => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, subject: e.target.value } })}
                  style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}
            {selectedNode.type === 'wait' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Duration</label>
                  <input type="number" value={selectedNode.config?.duration || ''} onChange={e => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, duration: Number(e.target.value) } })}
                    style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Unit</label>
                  <select value={selectedNode.config?.unit || 'days'} onChange={e => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, unit: e.target.value } })}
                    style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
            )}
            {selectedNode.type === 'condition' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Condition Field</label>
                <input value={selectedNode.config?.field || ''} onChange={e => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, field: e.target.value } })}
                  style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}
            {showAnalytics && (
              <div style={{ marginTop: 20, padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#999' }}>Node Stats</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: '#999', fontSize: 12 }}>Entered</span><span style={{ fontWeight: 600 }}>{selectedNode.stats.entered}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: '#999', fontSize: 12 }}>Completed</span><span style={{ color: '#22c55e', fontWeight: 600 }}>{selectedNode.stats.completed}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#999', fontSize: 12 }}>Failed</span><span style={{ color: '#ef4444', fontWeight: 600 }}>{selectedNode.stats.failed}</span></div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Journey Builder</h1>
          <p style={{ color: '#999', margin: '4px 0 0', fontSize: 14 }}>Create automated multi-step customer journeys</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setView('templates')} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layout size={16} /> Templates
          </button>
          <button onClick={() => openBuilder({ id: 'new', name: 'New Journey', status: 'draft', nodes: [], edges: [], enrolled_count: 0, goal_achieved_count: 0, conversion_rate: 0 })}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> New Journey
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Journeys', value: SAMPLE_JOURNEYS.length },
          { label: 'Active', value: SAMPLE_JOURNEYS.filter(j => j.status === 'active').length },
          { label: 'Total Enrolled', value: SAMPLE_JOURNEYS.reduce((s, j) => s + j.enrolled_count, 0).toLocaleString() },
          { label: 'Avg Conversion', value: `${(SAMPLE_JOURNEYS.reduce((s, j) => s + j.conversion_rate, 0) / SAMPLE_JOURNEYS.length).toFixed(1)}%` },
        ].map(s => (
          <div key={s.label} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Journey List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SAMPLE_JOURNEYS.map(j => (
          <div key={j.id} onClick={() => openBuilder(j)} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#00C971')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <GitBranch size={20} color="#00C971" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{j.name}</div>
                <div style={{ color: '#999', fontSize: 13, marginTop: 2 }}>{j.nodes.length} steps</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, background: `${STATUS_COLORS[j.status]}22`, color: STATUS_COLORS[j.status], fontWeight: 500 }}>{j.status}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{j.enrolled_count.toLocaleString()}</div>
                <div style={{ color: '#999', fontSize: 12 }}>enrolled</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#00C971' }}>{j.conversion_rate}%</div>
                <div style={{ color: '#999', fontSize: 12 }}>conversion</div>
              </div>
              <ArrowRight size={16} color="#555" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JourneyBuilder;
