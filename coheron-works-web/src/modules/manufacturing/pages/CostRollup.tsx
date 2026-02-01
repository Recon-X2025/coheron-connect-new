import React, { useState, useEffect, useCallback, type FC } from 'react';
import { DollarSign, RefreshCw, Lock, ChevronRight, ChevronDown, SlidersHorizontal, TrendingUp, BarChart3 } from 'lucide-react';

const API = '/api/manufacturing/cost-rollup';

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' } as React.CSSProperties,
  h1: { fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 24px' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '16px' } as React.CSSProperties,
  btn: (v: 'primary' | 'secondary') => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: v === 'primary' ? '#00C971' : '#222', color: v === 'primary' ? '#000' : '#fff',
  }) as React.CSSProperties,
  input: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' } as React.CSSProperties,
  select: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '1px solid #222', color: '#888', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #1a1a1a' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' } as React.CSSProperties,
  kpi: (c: string) => ({ background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${c}` }),
  kpiLabel: { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const },
  kpiVal: { fontSize: '24px', fontWeight: 700, color: '#fff' },
};

async function api(path: string, opts?: RequestInit) {
  const r = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return r.json();
}

const PieChart: FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No cost data</div>;
  const cx = 120, cy = 120, r = 100;
  let cumAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, pct: ((d.value / total) * 100).toFixed(1) };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <svg width={240} height={240}>
        {slices.map((sl, i) => <path key={i} d={sl.path} fill={sl.color} stroke="#141414" strokeWidth={2} />)}
      </svg>
      <div>
        {slices.map((sl, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: sl.color }} />
            <span style={{ color: '#ccc' }}>{sl.label}</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>${sl.value.toLocaleString()} ({sl.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CostRollup: FC = () => {
  const [productId, setProductId] = useState('');
  const [rollup, setRollup] = useState<any>(null);
  const [variance, setVariance] = useState<any>(null);
  const [whatIf, setWhatIf] = useState<any>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([1]));
  const [wifComponentId, setWifComponentId] = useState('');
  const [wifNewPrice, setWifNewPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);

  const loadRollup = useCallback(async () => {
    if (!productId) return;
    try {
      const r = await api(`/rollup/${productId}`);
      if (!r.error) setRollup(r);
    } catch (_) {}
  }, [productId]);

  const triggerRollup = async () => {
    if (!productId) return;
    setLoading(true);
    const r = await api(`/rollup/${productId}`, { method: 'POST', body: JSON.stringify({}) });
    if (!r.error) setRollup(r);
    setLoading(false);
  };

  const freezeRollup = async () => {
    if (!rollup?._id) return;
    const r = await api(`/rollup/${rollup._id}/freeze`, { method: 'POST' });
    if (!r.error) setRollup(r);
  };

  const loadVariance = async () => {
    if (!productId) return;
    const r = await api(`/variance/${productId}`);
    if (!r.error) setVariance(r);
  };

  const runWhatIf = async () => {
    if (!wifComponentId || !wifNewPrice) return;
    const r = await api(`/what-if?component_id=${wifComponentId}&new_price=${wifNewPrice}`);
    if (!r.error) setWhatIf(r);
  };

  useEffect(() => { loadRollup(); }, [loadRollup]);

  const toggleLevel = (level: number) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  };

  const cc = rollup?.cost_components;
  const tabNames = ['Breakdown', 'Variance', 'What-If'];

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Multi-Level Cost Rollup</h1>

      {/* Product Selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
        <input style={{ ...s.input, width: '300px' }} placeholder="Enter Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <button style={s.btn('primary')} onClick={triggerRollup} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Computing...' : 'Compute Rollup'}
        </button>
        {rollup && rollup.status !== 'frozen' && (
          <button style={s.btn('secondary')} onClick={freezeRollup}><Lock size={14} /> Freeze</button>
        )}
      </div>

      {/* KPI Row */}
      {cc && (
        <div style={s.kpiRow}>
          {[
            { l: 'Material', v: cc.material_cost, c: '#3b82f6' },
            { l: 'Labor', v: cc.labor_cost, c: '#a855f7' },
            { l: 'Overhead', v: cc.overhead_cost, c: '#f59e0b' },
            { l: 'Subcontracting', v: cc.subcontracting_cost, c: '#ef4444' },
            { l: 'Tooling', v: cc.tooling_cost, c: '#888' },
            { l: 'Total Cost', v: cc.total_cost, c: '#00C971' },
          ].map((k) => (
            <div key={k.l} style={s.kpi(k.c)}>
              <div style={s.kpiLabel}>{k.l}</div>
              <div style={s.kpiVal}>${k.v?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #222' }}>
        {tabNames.map((name, i) => (
          <button key={name} onClick={() => setTab(i)} style={{
            padding: '10px 20px', cursor: 'pointer', background: tab === i ? '#141414' : 'transparent',
            color: tab === i ? '#00C971' : '#888', borderBottom: tab === i ? '2px solid #00C971' : '2px solid transparent',
            fontWeight: tab === i ? 600 : 400, fontSize: '14px', border: 'none', borderRadius: '8px 8px 0 0',
          }}>{name}</button>
        ))}
      </div>

      {/* Tab: Breakdown */}
      {tab === 0 && rollup && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={s.card}>
            <h3 style={{ color: '#fff', margin: '0 0 12px' }}>Cost Pie Chart</h3>
            <PieChart data={[
              { label: 'Material', value: cc.material_cost, color: '#3b82f6' },
              { label: 'Labor', value: cc.labor_cost, color: '#a855f7' },
              { label: 'Overhead', value: cc.overhead_cost, color: '#f59e0b' },
              { label: 'Subcontracting', value: cc.subcontracting_cost, color: '#ef4444' },
              { label: 'Tooling', value: cc.tooling_cost, color: '#888' },
            ]} />
          </div>
          <div style={s.card}>
            <h3 style={{ color: '#fff', margin: '0 0 12px' }}>Material Breakdown (BOM Tree)</h3>
            {[1, 2, 3].map((level) => {
              const items = rollup.material_breakdown?.filter((m: any) => m.level === level) || [];
              if (items.length === 0) return null;
              return (
                <div key={level}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 0', color: '#00C971', fontSize: '13px', fontWeight: 600 }}
                    onClick={() => toggleLevel(level)}>
                    {expandedLevels.has(level) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Level {level} ({items.length} components)
                  </div>
                  {expandedLevels.has(level) && (
                    <table style={{ ...s.table, marginLeft: `${(level - 1) * 20}px`, marginBottom: '8px' }}>
                      <thead><tr><th style={s.th}>Component</th><th style={s.th}>Qty</th><th style={s.th}>Unit Cost</th><th style={s.th}>Extended</th></tr></thead>
                      <tbody>
                        {items.map((m: any, i: number) => (
                          <tr key={i}>
                            <td style={s.td}><span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{m.component_id?.toString()?.slice(-8) || '-'}</span></td>
                            <td style={s.td}>{m.quantity}</td>
                            <td style={s.td}>${m.unit_cost?.toFixed(2)}</td>
                            <td style={s.td}>${m.extended_cost?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}

            <h3 style={{ color: '#fff', margin: '16px 0 12px' }}>Labor Breakdown</h3>
            <table style={s.table}>
              <thead><tr><th style={s.th}>Operation</th><th style={s.th}>Work Center</th><th style={s.th}>Hours</th><th style={s.th}>Rate</th><th style={s.th}>Cost</th></tr></thead>
              <tbody>
                {(rollup.labor_breakdown || []).map((l: any, i: number) => (
                  <tr key={i}>
                    <td style={s.td}>{l.operation}</td><td style={s.td}>{l.work_center || '-'}</td>
                    <td style={s.td}>{l.hours?.toFixed(2)}</td><td style={s.td}>${l.rate?.toFixed(2)}</td>
                    <td style={s.td}>${l.cost?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Variance */}
      {tab === 1 && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: '#fff', margin: 0 }}>Standard vs Actual Variance</h3>
            <button style={s.btn('primary')} onClick={loadVariance}><BarChart3 size={14} /> Load Variance</button>
          </div>
          {variance && (
            <table style={s.table}>
              <thead>
                <tr><th style={s.th}>Component</th><th style={s.th}>Standard</th><th style={s.th}>Actual</th><th style={s.th}>Variance</th><th style={s.th}>%</th></tr>
              </thead>
              <tbody>
                {['material_cost', 'labor_cost', 'overhead_cost', 'subcontracting_cost', 'tooling_cost', 'total_cost'].map((k) => {
                  const std = variance.standard[k] || 0;
                  const act = variance.actual[k] || 0;
                  const v = variance.variance[k] || 0;
                  const pct = std > 0 ? ((v / std) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={k}>
                      <td style={s.td}>{k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                      <td style={s.td}>${std.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={s.td}>${act.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...s.td, color: v > 0 ? '#ef4444' : v < 0 ? '#00C971' : '#888', fontWeight: 600 }}>
                        {v > 0 ? '+' : ''}${v.toFixed(2)}
                      </td>
                      <td style={{ ...s.td, color: v > 0 ? '#ef4444' : v < 0 ? '#00C971' : '#888' }}>{v > 0 ? '+' : ''}{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: What-If */}
      {tab === 2 && (
        <div style={s.card}>
          <h3 style={{ color: '#fff', margin: '0 0 16px' }}>What-If Cost Simulator</h3>
          <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>Adjust a material price and see the cascading impact on all parent assemblies.</p>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <input style={{ ...s.input, width: '250px' }} placeholder="Component ID" value={wifComponentId} onChange={(e) => setWifComponentId(e.target.value)} />
            <input style={{ ...s.input, width: '150px' }} type="number" placeholder="New Price ($)" value={wifNewPrice} onChange={(e) => setWifNewPrice(e.target.value)} />
            <button style={s.btn('primary')} onClick={runWhatIf}><SlidersHorizontal size={14} /> Simulate</button>
          </div>
          {whatIf && whatIf.impacts && (
            <table style={s.table}>
              <thead>
                <tr><th style={s.th}>Product</th><th style={s.th}>Version</th><th style={s.th}>Current Total</th><th style={s.th}>New Total</th><th style={s.th}>Delta</th></tr>
              </thead>
              <tbody>
                {whatIf.impacts.map((imp: any, i: number) => (
                  <tr key={i}>
                    <td style={s.td}>{imp.product_id?.name || imp.product_id?.toString()?.slice(-8)}</td>
                    <td style={s.td}>v{imp.version}</td>
                    <td style={s.td}>${imp.current_total?.toFixed(2)}</td>
                    <td style={s.td}>${imp.new_total?.toFixed(2)}</td>
                    <td style={{ ...s.td, color: imp.delta > 0 ? '#ef4444' : imp.delta < 0 ? '#00C971' : '#888', fontWeight: 600 }}>
                      {imp.delta > 0 ? '+' : ''}${imp.delta?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default CostRollup;
