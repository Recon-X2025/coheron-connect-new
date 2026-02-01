import React, { useState, useEffect, useCallback, type FC } from 'react';
import {
  TrendingUp, Plus, Check, 
  Trash2, X
} from 'lucide-react';

const API = '/api/manufacturing/advanced-quality';

const styles = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' } as React.CSSProperties,
  h1: { fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 24px' } as React.CSSProperties,
  tabs: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #222' } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '10px 20px', cursor: 'pointer', background: active ? '#141414' : 'transparent',
    color: active ? '#00C971' : '#888', borderBottom: active ? '2px solid #00C971' : '2px solid transparent',
    fontWeight: active ? 600 : 400, fontSize: '14px', border: 'none', borderRadius: '8px 8px 0 0',
  }) as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '16px' } as React.CSSProperties,
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' } as React.CSSProperties,
  kpi: (color: string) => ({
    background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '20px',
    borderLeft: `4px solid ${color}`,
  }) as React.CSSProperties,
  kpiLabel: { fontSize: '12px', color: '#888', textTransform: 'uppercase' as const, marginBottom: '4px' },
  kpiValue: { fontSize: '28px', fontWeight: 700, color: '#fff' },
  btn: (variant: 'primary' | 'secondary' | 'danger') => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: variant === 'primary' ? '#00C971' : variant === 'danger' ? '#ef4444' : '#222',
    color: variant === 'primary' ? '#000' : '#fff',
  }) as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '1px solid #222', color: '#888', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #1a1a1a' },
  input: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px', width: '100%' } as React.CSSProperties,
  select: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
    background: `${color}22`, color,
  }),
  modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '24px', width: '700px', maxHeight: '80vh', overflowY: 'auto' as const },
};

const severityColors: Record<string, string> = { critical: '#ef4444', major: '#f59e0b', minor: '#3b82f6' };
const statusColors: Record<string, string> = { draft: '#888', approved: '#00C971', obsolete: '#ef4444', open: '#f59e0b', investigating: '#3b82f6', corrective_action: '#a855f7', closed: '#00C971' };

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

// ─── SPC Chart SVG ───
const SPCChart: FC<{ data: any }> = ({ data }) => {
  if (!data || !data.measurements || data.measurements.length === 0) {
    return <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No SPC data available. Record measurements first.</div>;
  }
  const { measurements, ucl, lcl, mean } = data;
  const values = measurements.map((m: any) => m.measured_value);
  const w = 700, h = 300, pad = 50;
  const minY = Math.min(lcl, ...values) - 1;
  const maxY = Math.max(ucl, ...values) + 1;
  const scaleX = (i: number) => pad + (i / (values.length - 1 || 1)) * (w - 2 * pad);
  const scaleY = (v: number) => h - pad - ((v - minY) / (maxY - minY || 1)) * (h - 2 * pad);

  const points = values.map((v: number, i: number) => `${scaleX(i)},${scaleY(v)}`).join(' ');

  return (
    <svg width={w} height={h} style={{ background: '#0a0a0a', borderRadius: '8px' }}>
      {/* Grid */}
      <line x1={pad} y1={scaleY(ucl)} x2={w - pad} y2={scaleY(ucl)} stroke="#ef4444" strokeDasharray="6,3" strokeWidth={1.5} />
      <line x1={pad} y1={scaleY(lcl)} x2={w - pad} y2={scaleY(lcl)} stroke="#ef4444" strokeDasharray="6,3" strokeWidth={1.5} />
      <line x1={pad} y1={scaleY(mean)} x2={w - pad} y2={scaleY(mean)} stroke="#00C971" strokeDasharray="4,4" strokeWidth={1} />
      {/* Labels */}
      <text x={w - pad + 5} y={scaleY(ucl) + 4} fill="#ef4444" fontSize="11">UCL {ucl.toFixed(2)}</text>
      <text x={w - pad + 5} y={scaleY(lcl) + 4} fill="#ef4444" fontSize="11">LCL {lcl.toFixed(2)}</text>
      <text x={w - pad + 5} y={scaleY(mean) + 4} fill="#00C971" fontSize="11">Mean {mean.toFixed(2)}</text>
      {/* Data line */}
      <polyline fill="none" stroke="#3b82f6" strokeWidth={2} points={points} />
      {/* Data points */}
      {values.map((v: number, i: number) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r={4}
          fill={v > ucl || v < lcl ? '#ef4444' : '#3b82f6'} stroke="#0a0a0a" strokeWidth={1.5} />
      ))}
    </svg>
  );
};

export const AdvancedQuality: FC = () => {
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState<any>(null);
  const [coq, setCOQ] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [ncrs, setNCRs] = useState<any[]>([]);
  const [spcData, setSpcData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(0);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showNCRModal, setShowNCRModal] = useState(false);
  const [planForm, setPlanForm] = useState<any>({ name: '', inspection_type: 'in_process', checkpoints: [{ name: '', characteristic: '', specification: '', tolerance_upper: 0, tolerance_lower: 0, uom: 'mm', measurement_type: 'variable', sampling_method: '100_pct', sample_size: 1, instrument: '', is_critical: false }] });
  const [ncrForm, setNCRForm] = useState<any>({ severity: 'minor', category: 'process', description: '', quantity_affected: 0, cost_impact: 0 });

  const loadDashboard = useCallback(async () => {
    const [d, c] = await Promise.all([api('/quality-dashboard'), api('/cost-of-quality')]);
    setDashboard(d);
    setCOQ(c);
  }, []);

  const loadPlans = useCallback(async () => {
    const r = await api('/plans');
    setPlans(r.data || []);
  }, []);

  const loadNCRs = useCallback(async () => {
    const r = await api('/ncr');
    setNCRs(r.data || []);
  }, []);

  const loadSPC = useCallback(async () => {
    if (!selectedPlan) return;
    const r = await api(`/spc-chart/${selectedPlan}/${selectedCheckpoint}`);
    setSpcData(r);
  }, [selectedPlan, selectedCheckpoint]);

  useEffect(() => { loadDashboard(); loadPlans(); loadNCRs(); }, [loadDashboard, loadPlans, loadNCRs]);
  useEffect(() => { if (tab === 1) loadSPC(); }, [tab, loadSPC]);

  const createPlan = async () => {
    await api('/plans', { method: 'POST', body: JSON.stringify(planForm) });
    setShowPlanModal(false);
    setPlanForm({ name: '', inspection_type: 'in_process', checkpoints: [{ name: '', characteristic: '', specification: '', tolerance_upper: 0, tolerance_lower: 0, uom: 'mm', measurement_type: 'variable', sampling_method: '100_pct', sample_size: 1, instrument: '', is_critical: false }] });
    loadPlans();
  };

  const approvePlan = async (id: string) => {
    await api(`/plans/${id}/approve`, { method: 'POST' });
    loadPlans();
  };

  const createNCR = async () => {
    await api('/ncr', { method: 'POST', body: JSON.stringify(ncrForm) });
    setShowNCRModal(false);
    setNCRForm({ severity: 'minor', category: 'process', description: '', quantity_affected: 0, cost_impact: 0 });
    loadNCRs();
    loadDashboard();
  };

  const addCheckpoint = () => {
    setPlanForm((f: any) => ({
      ...f,
      checkpoints: [...f.checkpoints, { name: '', characteristic: '', specification: '', tolerance_upper: 0, tolerance_lower: 0, uom: 'mm', measurement_type: 'variable', sampling_method: '100_pct', sample_size: 1, instrument: '', is_critical: false }],
    }));
  };

  const removeCheckpoint = (idx: number) => {
    setPlanForm((f: any) => ({ ...f, checkpoints: f.checkpoints.filter((_: any, i: number) => i !== idx) }));
  };

  const updateCheckpoint = (idx: number, field: string, value: any) => {
    setPlanForm((f: any) => {
      const cps = [...f.checkpoints];
      cps[idx] = { ...cps[idx], [field]: value };
      return { ...f, checkpoints: cps };
    });
  };

  const tabNames = ['Inspection Plans', 'SPC Charts', 'NCR', 'Cost of Quality'];

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Advanced Quality Management</h1>

      {/* KPI Row */}
      <div style={styles.kpiRow}>
        <div style={styles.kpi('#00C971')}>
          <div style={styles.kpiLabel}>Yield Rate</div>
          <div style={styles.kpiValue}>{dashboard?.yield_rate ?? '--'}%</div>
        </div>
        <div style={styles.kpi('#3b82f6')}>
          <div style={styles.kpiLabel}>Total Measurements</div>
          <div style={styles.kpiValue}>{dashboard?.total_measurements ?? 0}</div>
        </div>
        <div style={styles.kpi('#f59e0b')}>
          <div style={styles.kpiLabel}>Open NCRs</div>
          <div style={styles.kpiValue}>{dashboard?.total_ncr ?? 0}</div>
        </div>
        <div style={styles.kpi('#a855f7')}>
          <div style={styles.kpiLabel}>Cost of Quality</div>
          <div style={styles.kpiValue}>${coq?.total?.toLocaleString() ?? 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabNames.map((name, i) => (
          <button key={name} style={styles.tab(tab === i)} onClick={() => setTab(i)}>{name}</button>
        ))}
      </div>

      {/* Tab: Inspection Plans */}
      {tab === 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: '#888', fontSize: '14px' }}>{plans.length} plans</span>
            <button style={styles.btn('primary')} onClick={() => setShowPlanModal(true)}><Plus size={14} /> New Plan</button>
          </div>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th><th style={styles.th}>Type</th><th style={styles.th}>Version</th>
                  <th style={styles.th}>Checkpoints</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p._id}>
                    <td style={styles.td}>{p.name}</td>
                    <td style={styles.td}>{p.inspection_type}</td>
                    <td style={styles.td}>v{p.version}</td>
                    <td style={styles.td}>{p.checkpoints?.length || 0}</td>
                    <td style={styles.td}><span style={styles.badge(statusColors[p.status] || '#888')}>{p.status}</span></td>
                    <td style={styles.td}>
                      {p.status === 'draft' && (
                        <button style={styles.btn('secondary')} onClick={() => approvePlan(p._id)}><Check size={12} /> Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Plan Modal */}
          {showPlanModal && (
            <div style={styles.modal} onClick={() => setShowPlanModal(false)}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ color: '#fff', margin: 0 }}>New Inspection Plan</h2>
                  <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setShowPlanModal(false)}><X size={20} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <input style={styles.input} placeholder="Plan Name" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                  <select style={styles.select} value={planForm.inspection_type} onChange={(e) => setPlanForm({ ...planForm, inspection_type: e.target.value })}>
                    <option value="incoming">Incoming</option><option value="in_process">In-Process</option>
                    <option value="final">Final</option><option value="periodic">Periodic</option>
                  </select>
                </div>
                <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>Checkpoints</h3>
                {planForm.checkpoints.map((cp: any, idx: number) => (
                  <div key={idx} style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                      <input style={styles.input} placeholder="Checkpoint Name" value={cp.name} onChange={(e) => updateCheckpoint(idx, 'name', e.target.value)} />
                      <input style={styles.input} placeholder="Characteristic" value={cp.characteristic} onChange={(e) => updateCheckpoint(idx, 'characteristic', e.target.value)} />
                      <input style={styles.input} placeholder="Specification" value={cp.specification} onChange={(e) => updateCheckpoint(idx, 'specification', e.target.value)} />
                      <button style={styles.btn('danger')} onClick={() => removeCheckpoint(idx)}><Trash2 size={12} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                      <input style={styles.input} type="number" placeholder="Tol Upper" value={cp.tolerance_upper} onChange={(e) => updateCheckpoint(idx, 'tolerance_upper', +e.target.value)} />
                      <input style={styles.input} type="number" placeholder="Tol Lower" value={cp.tolerance_lower} onChange={(e) => updateCheckpoint(idx, 'tolerance_lower', +e.target.value)} />
                      <input style={styles.input} placeholder="UoM" value={cp.uom} onChange={(e) => updateCheckpoint(idx, 'uom', e.target.value)} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888', fontSize: '12px' }}>
                        <input type="checkbox" checked={cp.is_critical} onChange={(e) => updateCheckpoint(idx, 'is_critical', e.target.checked)} /> Critical
                      </label>
                    </div>
                  </div>
                ))}
                <button style={{ ...styles.btn('secondary'), marginBottom: '16px' }} onClick={addCheckpoint}><Plus size={12} /> Add Checkpoint</button>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button style={styles.btn('secondary')} onClick={() => setShowPlanModal(false)}>Cancel</button>
                  <button style={styles.btn('primary')} onClick={createPlan}>Create Plan</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: SPC Charts */}
      {tab === 1 && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <select style={styles.select} value={selectedPlan} onChange={(e) => { setSelectedPlan(e.target.value); setSelectedCheckpoint(0); }}>
              <option value="">Select Inspection Plan</option>
              {plans.filter((p) => p.status === 'approved').map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            {selectedPlan && (
              <select style={styles.select} value={selectedCheckpoint} onChange={(e) => setSelectedCheckpoint(+e.target.value)}>
                {(plans.find((p) => p._id === selectedPlan)?.checkpoints || []).map((cp: any, i: number) => (
                  <option key={i} value={i}>{cp.name || `Checkpoint ${i + 1}`}</option>
                ))}
              </select>
            )}
            <button style={styles.btn('primary')} onClick={loadSPC}><TrendingUp size={14} /> Load Chart</button>
          </div>
          <div style={styles.card}>
            <SPCChart data={spcData} />
            {spcData && spcData.measurements?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
                <div><span style={{ color: '#888', fontSize: '12px' }}>Mean</span><div style={{ color: '#fff', fontWeight: 600 }}>{spcData.mean?.toFixed(4)}</div></div>
                <div><span style={{ color: '#888', fontSize: '12px' }}>UCL</span><div style={{ color: '#ef4444', fontWeight: 600 }}>{spcData.ucl?.toFixed(4)}</div></div>
                <div><span style={{ color: '#888', fontSize: '12px' }}>LCL</span><div style={{ color: '#ef4444', fontWeight: 600 }}>{spcData.lcl?.toFixed(4)}</div></div>
                <div><span style={{ color: '#888', fontSize: '12px' }}>Samples</span><div style={{ color: '#fff', fontWeight: 600 }}>{spcData.count}</div></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: NCR */}
      {tab === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: '#888', fontSize: '14px' }}>{ncrs.length} reports</span>
            <button style={styles.btn('primary')} onClick={() => setShowNCRModal(true)}><Plus size={14} /> New NCR</button>
          </div>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>NCR #</th><th style={styles.th}>Severity</th><th style={styles.th}>Category</th>
                  <th style={styles.th}>Description</th><th style={styles.th}>Qty</th><th style={styles.th}>Cost Impact</th>
                  <th style={styles.th}>Status</th><th style={styles.th}>Disposition</th>
                </tr>
              </thead>
              <tbody>
                {ncrs.map((n) => (
                  <tr key={n._id}>
                    <td style={styles.td}><span style={{ color: '#00C971', fontFamily: 'monospace' }}>{n.ncr_number}</span></td>
                    <td style={styles.td}><span style={styles.badge(severityColors[n.severity] || '#888')}>{n.severity}</span></td>
                    <td style={styles.td}>{n.category}</td>
                    <td style={{ ...styles.td, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.description}</td>
                    <td style={styles.td}>{n.quantity_affected}</td>
                    <td style={styles.td}>${n.cost_impact?.toLocaleString()}</td>
                    <td style={styles.td}><span style={styles.badge(statusColors[n.status] || '#888')}>{n.status}</span></td>
                    <td style={styles.td}>{n.disposition || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showNCRModal && (
            <div style={styles.modal} onClick={() => setShowNCRModal(false)}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ color: '#fff', margin: '0 0 16px' }}>New Non-Conformance Report</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <select style={styles.select} value={ncrForm.severity} onChange={(e) => setNCRForm({ ...ncrForm, severity: e.target.value })}>
                    <option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option>
                  </select>
                  <select style={styles.select} value={ncrForm.category} onChange={(e) => setNCRForm({ ...ncrForm, category: e.target.value })}>
                    <option value="material">Material</option><option value="process">Process</option>
                    <option value="design">Design</option><option value="supplier">Supplier</option>
                  </select>
                </div>
                <textarea style={{ ...styles.input, height: '80px', marginBottom: '12px' }} placeholder="Description" value={ncrForm.description} onChange={(e) => setNCRForm({ ...ncrForm, description: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <input style={styles.input} type="number" placeholder="Quantity Affected" value={ncrForm.quantity_affected} onChange={(e) => setNCRForm({ ...ncrForm, quantity_affected: +e.target.value })} />
                  <input style={styles.input} type="number" placeholder="Cost Impact ($)" value={ncrForm.cost_impact} onChange={(e) => setNCRForm({ ...ncrForm, cost_impact: +e.target.value })} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button style={styles.btn('secondary')} onClick={() => setShowNCRModal(false)}>Cancel</button>
                  <button style={styles.btn('primary')} onClick={createNCR}>Create NCR</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Cost of Quality */}
      {tab === 3 && coq && (
        <div>
          <div style={styles.kpiRow}>
            <div style={styles.kpi('#00C971')}>
              <div style={styles.kpiLabel}>Prevention</div>
              <div style={styles.kpiValue}>${coq.prevention?.toLocaleString()}</div>
            </div>
            <div style={styles.kpi('#3b82f6')}>
              <div style={styles.kpiLabel}>Appraisal</div>
              <div style={styles.kpiValue}>${coq.appraisal?.toLocaleString()}</div>
            </div>
            <div style={styles.kpi('#f59e0b')}>
              <div style={styles.kpiLabel}>Internal Failure</div>
              <div style={styles.kpiValue}>${coq.internal_failure?.toLocaleString()}</div>
            </div>
            <div style={styles.kpi('#ef4444')}>
              <div style={styles.kpiLabel}>External Failure</div>
              <div style={styles.kpiValue}>${coq.external_failure?.toLocaleString()}</div>
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={{ color: '#fff', margin: '0 0 16px' }}>Cost of Quality Breakdown</h3>
            {/* Inline SVG Pie-like bar */}
            <svg width={600} height={40} style={{ borderRadius: '8px', overflow: 'hidden' }}>
              {(() => {
                const total = coq.total || 1;
                const segments = [
                  { value: coq.prevention, color: '#00C971', label: 'Prevention' },
                  { value: coq.appraisal, color: '#3b82f6', label: 'Appraisal' },
                  { value: coq.internal_failure, color: '#f59e0b', label: 'Internal' },
                  { value: coq.external_failure, color: '#ef4444', label: 'External' },
                ];
                let x = 0;
                return segments.map((s, i) => {
                  const w = (s.value / total) * 600;
                  const el = <rect key={i} x={x} y={0} width={w} height={40} fill={s.color} />;
                  x += w;
                  return el;
                });
              })()}
            </svg>
            <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
              {[{ l: 'Prevention', c: '#00C971' }, { l: 'Appraisal', c: '#3b82f6' }, { l: 'Internal Failure', c: '#f59e0b' }, { l: 'External Failure', c: '#ef4444' }].map((item) => (
                <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#888' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.c }} />
                  {item.l}
                </div>
              ))}
            </div>
          </div>
          {/* NCR by severity */}
          <div style={styles.card}>
            <h3 style={{ color: '#fff', margin: '0 0 12px' }}>NCRs by Severity</h3>
            {dashboard?.ncr_by_severity?.map((s: any) => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ ...styles.badge(severityColors[s._id] || '#888'), width: '80px', textAlign: 'center' }}>{s._id}</span>
                <div style={{ flex: 1, background: '#222', borderRadius: '4px', height: '20px' }}>
                  <div style={{ background: severityColors[s._id] || '#888', height: '100%', borderRadius: '4px', width: `${Math.min(100, (s.count / (dashboard?.total_ncr || 1)) * 100)}%`, transition: 'width 0.3s' }} />
                </div>
                <span style={{ color: '#fff', fontWeight: 600, width: '30px' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedQuality;
