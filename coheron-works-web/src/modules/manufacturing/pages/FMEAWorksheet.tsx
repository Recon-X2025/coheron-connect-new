import React, { useState, useEffect, useCallback, type FC } from 'react';
import { Plus, BarChart3, FileCheck, X, AlertTriangle } from 'lucide-react';

const API = '/api/manufacturing/fmea';

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' } as React.CSSProperties,
  h1: { fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 24px' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '16px' } as React.CSSProperties,
  btn: (v: 'primary' | 'secondary' | 'danger') => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: v === 'primary' ? '#00C971' : v === 'danger' ? '#ef4444' : '#222',
    color: v === 'primary' ? '#000' : '#fff',
  }) as React.CSSProperties,
  input: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', width: '100%' } as React.CSSProperties,
  select: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' },
  th: { textAlign: 'left' as const, padding: '8px 6px', borderBottom: '1px solid #222', color: '#888', fontWeight: 600, fontSize: '11px' },
  td: { padding: '6px', borderBottom: '1px solid #1a1a1a', verticalAlign: 'top' as const },
  modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '24px', width: '500px', maxHeight: '80vh', overflowY: 'auto' as const },
};

const rpnColor = (rpn: number): string => rpn >= 200 ? '#ef4444' : rpn >= 100 ? '#f59e0b' : '#00C971';
const rpnBg = (rpn: number): string => rpn >= 200 ? '#ef444422' : rpn >= 100 ? '#f59e0b22' : '#00C97122';

async function api(path: string, opts?: RequestInit) {
  const r = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return r.json();
}

export const FMEAWorksheet: FC = () => {
  const [fmeas, setFmeas] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [paretoData, setParetoData] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', process_or_design: 'process' });
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [tab, setTab] = useState(0); // 0=worksheet, 1=pareto

  const load = useCallback(async () => {
    const r = await api('');
    setFmeas(r.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectFMEA = async (id: string) => {
    const r = await api(`/${id}`);
    if (!r.error) setSelected(r);
  };

  const loadPareto = async () => {
    if (!selected?._id) return;
    const r = await api(`/${selected._id}/rpn-analysis`);
    if (!r.error) setParetoData(r);
    setTab(1);
  };

  const createFMEA = async () => {
    await api('', { method: 'POST', body: JSON.stringify({ ...createForm, items: [] }) });
    setShowCreate(false);
    setCreateForm({ name: '', process_or_design: 'process' });
    load();
  };

  const addItem = async () => {
    if (!selected?._id) return;
    const r = await api(`/${selected._id}/add-item`, {
      method: 'POST',
      body: JSON.stringify({ process_step: '', potential_failure_mode: 'New failure mode', potential_effect: '', severity: 5, potential_cause: '', occurrence: 5, current_controls: '', detection: 5 }),
    });
    if (!r.error) setSelected(r);
  };

  const updateItem = async (idx: number, field: string, value: any) => {
    if (!selected?._id) return;
    const r = await api(`/${selected._id}/items/${idx}`, { method: 'PUT', body: JSON.stringify({ [field]: value }) });
    if (!r.error) setSelected(r);
  };

  const reviewFMEA = async () => {
    if (!selected?._id) return;
    const r = await api(`/${selected._id}/review`, { method: 'POST' });
    if (!r.error) { setSelected(r); load(); }
  };

  const tabNames = ['Worksheet', 'RPN Pareto'];

  return (
    <div style={s.page}>
      <h1 style={s.h1}>FMEA - Failure Mode & Effects Analysis</h1>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Sidebar: FMEA list */}
        <div style={{ width: '260px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#888', fontSize: '13px' }}>{fmeas.length} FMEAs</span>
            <button style={s.btn('primary')} onClick={() => setShowCreate(true)}><Plus size={12} /> New</button>
          </div>
          {fmeas.map((f) => (
            <div key={f._id} onClick={() => selectFMEA(f._id)} style={{
              background: selected?._id === f._id ? '#1a2a1f' : '#141414', border: `1px solid ${selected?._id === f._id ? '#00C971' : '#222'}`,
              borderRadius: '8px', padding: '12px', marginBottom: '8px', cursor: 'pointer',
            }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{f.name}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>{f.process_or_design}</span>
                <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '8px', background: f.status === 'active' ? '#00C97122' : '#88888822', color: f.status === 'active' ? '#00C971' : '#888' }}>{f.status}</span>
                <span style={{ fontSize: '11px', color: '#888' }}>{f.items?.length || 0} items</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '60px' }}>
              <AlertTriangle size={48} style={{ color: '#333', marginBottom: '16px' }} />
              <div style={{ color: '#888' }}>Select an FMEA from the list or create a new one</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ color: '#fff', margin: 0 }}>{selected.name}</h2>
                  <span style={{ color: '#888', fontSize: '13px' }}>{selected.process_or_design} FMEA | {selected.items?.length || 0} failure modes</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={s.btn('secondary')} onClick={addItem}><Plus size={12} /> Add Row</button>
                  <button style={s.btn('secondary')} onClick={loadPareto}><BarChart3 size={12} /> RPN Analysis</button>
                  {selected.status === 'draft' && (
                    <button style={s.btn('primary')} onClick={reviewFMEA}><FileCheck size={12} /> Review & Activate</button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #222' }}>
                {tabNames.map((name, i) => (
                  <button key={name} onClick={() => setTab(i)} style={{
                    padding: '8px 16px', cursor: 'pointer', background: tab === i ? '#141414' : 'transparent',
                    color: tab === i ? '#00C971' : '#888', borderBottom: tab === i ? '2px solid #00C971' : '2px solid transparent',
                    fontWeight: tab === i ? 600 : 400, fontSize: '13px', border: 'none', borderRadius: '8px 8px 0 0',
                  }}>{name}</button>
                ))}
              </div>

              {/* Worksheet */}
              {tab === 0 && (
                <div style={{ ...s.card, overflowX: 'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={{ ...s.th, width: '30px' }}>#</th>
                        <th style={s.th}>Process Step</th>
                        <th style={s.th}>Failure Mode</th>
                        <th style={s.th}>Effect</th>
                        <th style={{ ...s.th, width: '40px' }}>S</th>
                        <th style={s.th}>Cause</th>
                        <th style={{ ...s.th, width: '40px' }}>O</th>
                        <th style={s.th}>Controls</th>
                        <th style={{ ...s.th, width: '40px' }}>D</th>
                        <th style={{ ...s.th, width: '60px' }}>RPN</th>
                        <th style={s.th}>Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.items || []).map((item: any, idx: number) => (
                        <tr key={idx} style={{ background: editingItem === idx ? '#0d1a0f' : 'transparent' }}
                          onClick={() => setEditingItem(idx)}>
                          <td style={s.td}>{idx + 1}</td>
                          <td style={s.td}>
                            <input style={s.input} value={item.process_step || ''} onChange={(e) => updateItem(idx, 'process_step', e.target.value)} />
                          </td>
                          <td style={s.td}>
                            <input style={s.input} value={item.potential_failure_mode || ''} onChange={(e) => updateItem(idx, 'potential_failure_mode', e.target.value)} />
                          </td>
                          <td style={s.td}>
                            <input style={s.input} value={item.potential_effect || ''} onChange={(e) => updateItem(idx, 'potential_effect', e.target.value)} />
                          </td>
                          <td style={s.td}>
                            <input style={{ ...s.input, width: '40px', textAlign: 'center' }} type="number" min={1} max={10}
                              value={item.severity || ''} onChange={(e) => updateItem(idx, 'severity', +e.target.value)} />
                          </td>
                          <td style={s.td}>
                            <input style={s.input} value={item.potential_cause || ''} onChange={(e) => updateItem(idx, 'potential_cause', e.target.value)} />
                          </td>
                          <td style={s.td}>
                            <input style={{ ...s.input, width: '40px', textAlign: 'center' }} type="number" min={1} max={10}
                              value={item.occurrence || ''} onChange={(e) => updateItem(idx, 'occurrence', +e.target.value)} />
                          </td>
                          <td style={s.td}>
                            <input style={s.input} value={item.current_controls || ''} onChange={(e) => updateItem(idx, 'current_controls', e.target.value)} />
                          </td>
                          <td style={s.td}>
                            <input style={{ ...s.input, width: '40px', textAlign: 'center' }} type="number" min={1} max={10}
                              value={item.detection || ''} onChange={(e) => updateItem(idx, 'detection', +e.target.value)} />
                          </td>
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', background: rpnBg(item.rpn || 0), color: rpnColor(item.rpn || 0) }}>
                              {item.rpn || 0}
                            </span>
                          </td>
                          <td style={s.td}>
                            <input style={s.input} value={item.recommended_action || ''} onChange={(e) => updateItem(idx, 'recommended_action', e.target.value)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pareto */}
              {tab === 1 && paretoData && (
                <div style={s.card}>
                  <h3 style={{ color: '#fff', margin: '0 0 16px' }}>RPN Pareto Analysis (Total RPN: {paretoData.total_rpn})</h3>
                  <svg width={Math.max(600, (paretoData.pareto?.length || 0) * 60)} height={300} style={{ background: '#0a0a0a', borderRadius: '8px' }}>
                    {(() => {
                      const items = paretoData.pareto || [];
                      if (items.length === 0) return null;
                      const maxRPN = Math.max(...items.map((i: any) => i.rpn));
                      const barW = 40;
                      const gap = 20;
                      const chartH = 240;
                      const padL = 50;

                      return (
                        <>
                          {/* Bars */}
                          {items.map((item: any, i: number) => {
                            const barH = maxRPN > 0 ? (item.rpn / maxRPN) * chartH : 0;
                            const x = padL + i * (barW + gap);
                            const y = chartH - barH + 10;
                            return (
                              <g key={i}>
                                <rect x={x} y={y} width={barW} height={barH} fill={rpnColor(item.rpn)} rx={4} />
                                <text x={x + barW / 2} y={y - 6} fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold">{item.rpn}</text>
                                <text x={x + barW / 2} y={chartH + 25} fill="#888" fontSize="10" textAnchor="middle" transform={`rotate(-30, ${x + barW / 2}, ${chartH + 25})`}>
                                  {(item.failure_mode || '').substring(0, 12)}
                                </text>
                              </g>
                            );
                          })}
                          {/* Cumulative % line */}
                          {items.length > 1 && (
                            <polyline fill="none" stroke="#3b82f6" strokeWidth={2}
                              points={items.map((item: any, i: number) => {
                                const x = padL + i * (barW + gap) + barW / 2;
                                const y = chartH + 10 - (item.cumulative_pct / 100) * chartH;
                                return `${x},${y}`;
                              }).join(' ')} />
                          )}
                          {/* 80% line */}
                          <line x1={padL} y1={chartH + 10 - 0.8 * chartH} x2={padL + items.length * (barW + gap)} y2={chartH + 10 - 0.8 * chartH} stroke="#f59e0b" strokeDasharray="6,3" strokeWidth={1} />
                          <text x={padL - 5} y={chartH + 10 - 0.8 * chartH + 4} fill="#f59e0b" fontSize="10" textAnchor="end">80%</text>
                        </>
                      );
                    })()}
                  </svg>
                  <div style={{ marginTop: '16px' }}>
                    <table style={s.table}>
                      <thead>
                        <tr><th style={s.th}>#</th><th style={s.th}>Failure Mode</th><th style={s.th}>RPN</th><th style={s.th}>Cumulative %</th></tr>
                      </thead>
                      <tbody>
                        {(paretoData.pareto || []).map((p: any, i: number) => (
                          <tr key={i}>
                            <td style={s.td}>{i + 1}</td>
                            <td style={s.td}>{p.failure_mode}</td>
                            <td style={s.td}><span style={{ color: rpnColor(p.rpn), fontWeight: 700 }}>{p.rpn}</span></td>
                            <td style={s.td}>{p.cumulative_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={s.modal} onClick={() => setShowCreate(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ color: '#fff', margin: 0 }}>New FMEA</h2>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <input style={{ ...s.input, marginBottom: '12px', width: '100%' }} placeholder="FMEA Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            <select style={{ ...s.select, width: '100%', marginBottom: '16px' }} value={createForm.process_or_design} onChange={(e) => setCreateForm({ ...createForm, process_or_design: e.target.value })}>
              <option value="process">Process FMEA</option><option value="design">Design FMEA</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button style={s.btn('secondary')} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={s.btn('primary')} onClick={createFMEA}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FMEAWorksheet;
