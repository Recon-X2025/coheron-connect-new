import React, { useState } from 'react';
import { LayoutDashboard, Plus, GripVertical, Trash2, Save } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Widget {
  widget_id: string;
  type: 'kpi' | 'chart' | 'table' | 'list';
  title: string;
  config: Record<string, any>;
  x: number;
  y: number;
  w: number;
  h: number;
}

const WIDGET_TEMPLATES: Array<{ type: Widget['type']; title: string; config: Record<string, any> }> = [
  { type: 'kpi', title: 'Total Revenue', config: { collection: 'accountmoves', aggregation: 'sum', field: 'amount_total', filter: { move_type: 'out_invoice' } } },
  { type: 'kpi', title: 'Open Invoices', config: { collection: 'accountmoves', aggregation: 'count', filter: { payment_state: 'not_paid' } } },
  { type: 'kpi', title: 'Products Count', config: { collection: 'products', aggregation: 'count' } },
  { type: 'chart', title: 'Revenue by Month', config: { collection: 'accountmoves', chart_type: 'bar', group_by: 'month', field: 'amount_total' } },
  { type: 'chart', title: 'Orders by Status', config: { collection: 'saleorders', chart_type: 'pie', group_by: 'status' } },
  { type: 'table', title: 'Recent Invoices', config: { collection: 'accountmoves', columns: ['name', 'amount_total', 'payment_state'], limit: 10 } },
  { type: 'list', title: 'Low Stock Products', config: { collection: 'products', filter: 'low_stock', limit: 10 } },
];

const s = {
  page: { padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnSec: { background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
};

export const DashboardBuilder: React.FC = () => {
  const [dashboardName, setDashboardName] = useState('My Dashboard');
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const token = localStorage.getItem('authToken') || '';

  const addWidget = (template: typeof WIDGET_TEMPLATES[0]) => {
    const widget: Widget = {
      widget_id: 'w_' + Date.now() + Math.random().toString(36).substring(2, 6),
      type: template.type,
      title: template.title,
      config: { ...template.config },
      x: 0,
      y: widgets.length * 3,
      w: template.type === 'kpi' ? 3 : 6,
      h: template.type === 'kpi' ? 2 : 4,
    };
    setWidgets(prev => [...prev, widget]);
    setShowTemplates(false);
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.widget_id !== id));
  };

  const saveDashboard = async () => {
    try {
      await fetch(`${API_BASE}/api/dashboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: dashboardName, layout: widgets }),
      });
      alert('Dashboard saved');
    } catch {}
  };

  const typeColors: Record<string, string> = { kpi: '#00C971', chart: '#3b82f6', table: '#f59e0b', list: '#a855f7' };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LayoutDashboard size={28} style={{ color: '#00C971' }} />
          <input
            value={dashboardName}
            onChange={e => setDashboardName(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 28, fontWeight: 700, outline: 'none', width: 300 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btnSec} onClick={() => setShowTemplates(!showTemplates)}><Plus size={16} /> Add Widget</button>
          <button style={s.btn} onClick={saveDashboard}><Save size={16} /> Save</button>
        </div>
      </div>

      {showTemplates && (
        <div style={{ ...s.card, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Widget Templates</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {WIDGET_TEMPLATES.map((t, i) => (
              <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, cursor: 'pointer', border: '1px solid #333' }} onClick={() => addWidget(t)}>
                <span style={{ fontSize: 11, fontWeight: 600, color: typeColors[t.type], textTransform: 'uppercase' }}>{t.type}</span>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, minHeight: 400 }}>
        {widgets.map(w => (
          <div key={w.widget_id} style={{ ...s.card, gridColumn: `span ${w.w}`, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GripVertical size={14} style={{ color: '#444', cursor: 'grab' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: typeColors[w.type], textTransform: 'uppercase' }}>{w.type}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{w.title}</span>
              </div>
              <button onClick={() => removeWidget(w.widget_id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><Trash2 size={14} /></button>
            </div>
            <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 24, textAlign: 'center', color: '#444', fontSize: 13 }}>
              {w.type === 'kpi' && <div style={{ fontSize: 32, fontWeight: 700, color: '#00C971' }}>--</div>}
              {w.type === 'chart' && 'Chart widget - data loads at runtime'}
              {w.type === 'table' && 'Table widget - data loads at runtime'}
              {w.type === 'list' && 'List widget - data loads at runtime'}
            </div>
          </div>
        ))}
        {widgets.length === 0 && (
          <div style={{ gridColumn: 'span 12', textAlign: 'center', padding: 60, color: '#444' }}>
            Click "Add Widget" to start building your dashboard
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardBuilder;
