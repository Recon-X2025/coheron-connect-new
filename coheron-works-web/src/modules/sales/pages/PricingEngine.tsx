import { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Play, BarChart3, Download, GripVertical, Tag, Percent, Calculator } from 'lucide-react';

const API_BASE = '/api/sales/pricing-engine';
const getToken = () => localStorage.getItem('authToken') || '';
let _csrf: string | null = null;
const getCsrf = async () => { if (_csrf) return _csrf; try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { _csrf = (await r.json()).token; } } catch {} return _csrf; };
const apiFetch = async (path: string, options?: RequestInit) => {
  const method = (options?.method || 'GET').toUpperCase();
  const hdrs: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...((options?.headers as any) || {}) };
  if (!['GET','HEAD','OPTIONS'].includes(method)) { const c = await getCsrf(); if (c) hdrs['x-csrf-token'] = c; }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: hdrs, credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const conditionTypes = ['base_price', 'discount', 'surcharge', 'freight', 'tax', 'rebate'] as const;
const calcTypes = ['fixed', 'percentage', 'formula'] as const;
const dimensions = ['customer', 'customer_group', 'product', 'product_category', 'quantity', 'region', 'channel', 'currency', 'order_value'] as const;
const operators = ['eq', 'neq', 'in', 'gt', 'lt', 'between'] as const;

const typeColors: Record<string, string> = {
  base_price: '#3b82f6', discount: '#ef4444', surcharge: '#f59e0b', freight: '#8b5cf6', tax: '#6366f1', rebate: '#00C971',
};

const cardStyle: React.CSSProperties = { background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #222' };
const inputStyle: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#fff', width: '100%', fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const btnSecondary: React.CSSProperties = { background: '#222', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };

type Tab = 'conditions' | 'simulator' | 'margins';

export const PricingEngine: React.FC = () => {
  const [tab, setTab] = useState<Tab>('conditions');
  const [conditions, setConditions] = useState<any[]>([]);
  const [_total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    name: '', condition_type: 'discount', calculation_type: 'percentage', priority: 0,
    is_active: true, value: 0, formula: '', exclusive: false, conditions: [], scale: [],
  });

  // Simulator state
  const [simForm, setSimForm] = useState({ product_id: '', customer_id: '', quantity: 1, list_price: 100 });
  const [waterfall, setWaterfall] = useState<any>(null);

  // Margin state
  const [margins, setMargins] = useState<any[]>([]);
  const [marginGroupBy, setMarginGroupBy] = useState('product');

  const loadConditions = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/conditions?limit=100');
      setConditions(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadMargins = async () => {
    try {
      const data = await apiFetch(`/margin-analysis?group_by=${marginGroupBy}`);
      setMargins(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadConditions(); }, []);
  useEffect(() => { if (tab === 'margins') loadMargins(); }, [tab, marginGroupBy]);

  const handleSave = async () => {
    try {
      if (editId) {
        await apiFetch(`/conditions/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/conditions', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', condition_type: 'discount', calculation_type: 'percentage', priority: 0, is_active: true, value: 0, formula: '', exclusive: false, conditions: [], scale: [] });
      loadConditions();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this condition?')) return;
    await apiFetch(`/conditions/${id}`, { method: 'DELETE' });
    loadConditions();
  };

  const handleEdit = (item: any) => {
    setForm({ ...item });
    setEditId(item._id || item.id);
    setShowForm(true);
  };

  const handleSimulate = async () => {
    try {
      const data = await apiFetch('/simulate', { method: 'POST', body: JSON.stringify(simForm) });
      setWaterfall(data);
    } catch (e) { console.error(e); }
  };

  const handleExport = async () => {
    const data = await apiFetch('/conditions/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pricing-conditions.json'; a.click();
  };

  const addConditionDimension = () => {
    setForm({ ...form, conditions: [...(form.conditions || []), { dimension: 'product', operator: 'eq', value: '' }] });
  };

  const addScaleBreak = () => {
    setForm({ ...form, scale: [...(form.scale || []), { from: 0, to: 0, value: 0 }] });
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '10px 20px', cursor: 'pointer', borderRadius: 8, fontWeight: 600, fontSize: 14,
    background: tab === t ? '#00C971' : '#1a1a1a', color: tab === t ? '#000' : '#888', border: 'none',
  });

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <DollarSign size={28} color="#00C971" /> Condition-Based Pricing Engine
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>SAP SD-style pricing with conditions, scales, and waterfall analysis</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} style={btnSecondary}><Download size={16} /> Export</button>
          <button onClick={() => { setEditId(null); setShowForm(true); }} style={btnPrimary}><Plus size={18} /> Add Condition</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab('conditions')} style={tabStyle('conditions')}><Tag size={14} /> Conditions</button>
        <button onClick={() => setTab('simulator')} style={tabStyle('simulator')}><Play size={14} /> Price Simulator</button>
        <button onClick={() => setTab('margins')} style={tabStyle('margins')}><BarChart3 size={14} /> Margin Analysis</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {conditionTypes.map(ct => (
          <div key={ct} style={{ ...cardStyle, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888', fontSize: 12, textTransform: 'capitalize' }}>{ct.replace('_', ' ')}</span>
              <span style={{ background: typeColors[ct] + '22', color: typeColors[ct], padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                {conditions.filter(c => c.condition_type === ct).length}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CONDITIONS TAB */}
      {tab === 'conditions' && (
        <div style={cardStyle}>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading...</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Priority', 'Name', 'Type', 'Calculation', 'Value', 'Conditions', 'Active', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conditions.map(c => (
                  <tr key={c._id || c.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <GripVertical size={14} color="#555" /> {c.priority}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ background: typeColors[c.condition_type] + '22', color: typeColors[c.condition_type], padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                        {c.condition_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', color: '#aaa' }}>
                      {c.calculation_type === 'percentage' && <Percent size={14} />}
                      {c.calculation_type === 'fixed' && <DollarSign size={14} />}
                      {c.calculation_type === 'formula' && <Calculator size={14} />}
                      {' '}{c.calculation_type}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: c.condition_type === 'discount' ? '#ef4444' : '#00C971' }}>
                      {c.calculation_type === 'percentage' ? `${c.value}%` : c.calculation_type === 'formula' ? 'Formula' : `$${c.value}`}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#888' }}>{(c.conditions || []).length} rules</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ color: c.is_active ? '#00C971' : '#ef4444' }}>{c.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleEdit(c)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                        <button onClick={() => handleDelete(c._id || c.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SIMULATOR TAB */}
      {tab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Simulate Price</h3>
            {[
              { label: 'Product ID', key: 'product_id' },
              { label: 'Customer ID', key: 'customer_id' },
              { label: 'Quantity', key: 'quantity', type: 'number' },
              { label: 'List Price', key: 'list_price', type: 'number' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  style={inputStyle}
                  type={f.type || 'text'}
                  value={(simForm as any)[f.key]}
                  onChange={e => setSimForm({ ...simForm, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                />
              </div>
            ))}
            <button onClick={handleSimulate} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginTop: 8 }}>
              <Play size={16} /> Simulate
            </button>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Price Waterfall</h3>
            {!waterfall ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>Run a simulation to see the waterfall</div>
            ) : (
              <>
                {/* Stacked bar visualization */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', height: 40, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                    {waterfall.steps.map((s: any, i: number) => {
                      const width = Math.abs(s.adjustment) / waterfall.list_price * 100;
                      return (
                        <div key={i} style={{
                          width: `${Math.max(width, 2)}%`,
                          background: s.adjustment < 0 ? '#ef4444' : typeColors[s.condition_type] || '#00C971',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: '#fff', fontWeight: 600, minWidth: 20,
                        }} title={`${s.condition_name}: ${s.adjustment >= 0 ? '+' : ''}${s.adjustment.toFixed(2)}`}>
                          {width > 8 ? s.condition_name.substring(0, 6) : ''}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 12 }}>
                    <span>List: ${waterfall.list_price.toFixed(2)}</span>
                    <span style={{ fontWeight: 700, color: '#00C971', fontSize: 16 }}>Final: ${waterfall.final_price.toFixed(2)}</span>
                  </div>
                </div>

                {/* Step details */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      {['Step', 'Condition', 'Type', 'Adjustment', 'Running Total'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px', color: '#888', fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: 8 }}>0</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>List Price</td>
                      <td style={{ padding: 8 }}>-</td>
                      <td style={{ padding: 8 }}>-</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>${waterfall.list_price.toFixed(2)}</td>
                    </tr>
                    {waterfall.steps.map((s: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: 8 }}>{i + 1}</td>
                        <td style={{ padding: 8, fontWeight: 600 }}>{s.condition_name}</td>
                        <td style={{ padding: 8 }}>
                          <span style={{ background: typeColors[s.condition_type] + '22', color: typeColors[s.condition_type], padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                            {s.condition_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: 8, fontWeight: 600, color: s.adjustment < 0 ? '#ef4444' : '#00C971' }}>
                          {s.adjustment >= 0 ? '+' : ''}{s.adjustment.toFixed(2)}
                        </td>
                        <td style={{ padding: 8, fontWeight: 600 }}>${s.running_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 16, padding: 12, background: '#0a0a0a', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Margin Impact</span>
                  <span style={{ fontWeight: 700, color: waterfall.margin_pct < 0 ? '#ef4444' : '#00C971' }}>{waterfall.margin_pct.toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MARGINS TAB */}
      {tab === 'margins' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Margin Analysis</h3>
            <select value={marginGroupBy} onChange={e => setMarginGroupBy(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="product">By Product</option>
              <option value="customer">By Customer</option>
            </select>
          </div>
          {margins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>No waterfall data available yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['ID', 'Avg List Price', 'Avg Final Price', 'Avg Margin', 'Calculations'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {margins.map((m: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>{String(m._id).substring(0, 12)}...</td>
                    <td style={{ padding: '10px 8px' }}>${m.avg_list_price?.toFixed(2)}</td>
                    <td style={{ padding: '10px 8px' }}>${m.avg_final_price?.toFixed(2)}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: m.avg_margin < 0 ? '#ef4444' : '#00C971' }}>{m.avg_margin?.toFixed(1)}%</td>
                    <td style={{ padding: '10px 8px', color: '#888' }}>{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CONDITION FORM MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 640, maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>{editId ? 'Edit' : 'Create'} Pricing Condition</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Name</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Priority</label>
                <input style={inputStyle} type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Condition Type</label>
                <select style={inputStyle} value={form.condition_type} onChange={e => setForm({ ...form, condition_type: e.target.value })}>
                  {conditionTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Calculation Type</label>
                <select style={inputStyle} value={form.calculation_type} onChange={e => setForm({ ...form, calculation_type: e.target.value })}>
                  {calcTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Value</label>
                <input style={inputStyle} type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} />
              </div>
              {form.calculation_type === 'formula' && (
                <div>
                  <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Formula (vars: price, qty, value)</label>
                  <input style={inputStyle} value={form.formula || ''} onChange={e => setForm({ ...form, formula: e.target.value })} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.exclusive} onChange={e => setForm({ ...form, exclusive: e.target.checked })} /> Exclusive (stop after match)
              </label>
            </div>

            {/* Condition Dimensions */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Condition Rules</h4>
                <button onClick={addConditionDimension} style={{ ...btnSecondary, padding: '4px 12px', fontSize: 12 }}><Plus size={14} /> Add Rule</button>
              </div>
              {(form.conditions || []).map((dim: any, idx: number) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                  <select style={inputStyle} value={dim.dimension} onChange={e => {
                    const c = [...form.conditions]; c[idx] = { ...dim, dimension: e.target.value }; setForm({ ...form, conditions: c });
                  }}>
                    {dimensions.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                  </select>
                  <select style={inputStyle} value={dim.operator} onChange={e => {
                    const c = [...form.conditions]; c[idx] = { ...dim, operator: e.target.value }; setForm({ ...form, conditions: c });
                  }}>
                    {operators.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input style={inputStyle} placeholder="Value" value={dim.value || ''} onChange={e => {
                    const c = [...form.conditions]; c[idx] = { ...dim, value: e.target.value }; setForm({ ...form, conditions: c });
                  }} />
                  <button onClick={() => { const c = [...form.conditions]; c.splice(idx, 1); setForm({ ...form, conditions: c }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Scale Breaks */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Scale Breaks (qty/value tiers)</h4>
                <button onClick={addScaleBreak} style={{ ...btnSecondary, padding: '4px 12px', fontSize: 12 }}><Plus size={14} /> Add Break</button>
              </div>
              {(form.scale || []).map((s: any, idx: number) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                  <input style={inputStyle} type="number" placeholder="From" value={s.from} onChange={e => {
                    const sc = [...form.scale]; sc[idx] = { ...s, from: Number(e.target.value) }; setForm({ ...form, scale: sc });
                  }} />
                  <input style={inputStyle} type="number" placeholder="To" value={s.to} onChange={e => {
                    const sc = [...form.scale]; sc[idx] = { ...s, to: Number(e.target.value) }; setForm({ ...form, scale: sc });
                  }} />
                  <input style={inputStyle} type="number" placeholder="Value" value={s.value} onChange={e => {
                    const sc = [...form.scale]; sc[idx] = { ...s, value: Number(e.target.value) }; setForm({ ...form, scale: sc });
                  }} />
                  <button onClick={() => { const sc = [...form.scale]; sc.splice(idx, 1); setForm({ ...form, scale: sc }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} style={btnPrimary}>{editId ? 'Update' : 'Create'} Condition</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingEngine;
