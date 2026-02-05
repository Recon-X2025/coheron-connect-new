import { useState, useEffect } from 'react';
import { Users, AlertTriangle, Shield, Star, Plus, Target } from 'lucide-react';

interface Plan { _id: string; position_title: string; department: string; incumbent_id: any; criticality: string; risk_of_loss: string; impact_of_loss: string; status: string; notes: string; }
interface Candidate { _id: string; plan_id: string; candidate_id: any; readiness: string; strengths: string[]; development_areas: string[]; development_actions: any[]; overall_rating: number; mentor_id: any; }
interface RiskItem { plan_id: string; position_title: string; department: string; criticality: string; risk_of_loss: string; impact_of_loss: string; total_candidates: number; ready_now: number; risk_score: number; }
interface BenchStrength { total_positions: number; positions_with_ready_candidates: number; bench_strength_pct: number; total_candidates: number; avg_candidates_per_position: number; }

const API = '/api/hr/succession';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` });

export const SuccessionPlanning = () => {
  const [tab, setTab] = useState<'plans' | 'candidates' | 'risk' | 'bench'>('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [risk, setRisk] = useState<RiskItem[]>([]);
  const [bench, setBench] = useState<BenchStrength | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCandidate, setShowCandidate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planForm, setPlanForm] = useState({ position_title: '', department: '', incumbent_id: '', criticality: 'medium', risk_of_loss: 'medium', impact_of_loss: 'medium', notes: '' });
  const [candForm, setCandForm] = useState({ plan_id: '', candidate_id: '', readiness: 'development_needed', strengths: '', development_areas: '', overall_rating: 3 });

  useEffect(() => { loadAll(); }, []);
  const loadAll = () => { loadPlans(); loadCandidates(); loadRisk(); loadBench(); };
  const loadPlans = async () => { try { const r = await fetch(`${API}/plans`, { headers: headers() }); if (r.ok) setPlans(await r.json()); } catch (e) { console.error(e); } };
  const loadCandidates = async () => { try { const r = await fetch(`${API}/candidates`, { headers: headers() }); if (r.ok) setCandidates(await r.json()); } catch (e) { console.error(e); } };
  const loadRisk = async () => { try { const r = await fetch(`${API}/risk-report`, { headers: headers() }); if (r.ok) setRisk(await r.json()); } catch (e) { console.error(e); } };
  const loadBench = async () => { try { const r = await fetch(`${API}/bench-strength`, { headers: headers() }); if (r.ok) setBench(await r.json()); } catch (e) { console.error(e); } };

  const createPlan = async () => { setLoading(true); try { const r = await fetch(`${API}/plans`, { method: 'POST', headers: headers(), body: JSON.stringify(planForm) }); if (r.ok) { setShowCreate(false); loadAll(); } } catch (e) { console.error(e); } setLoading(false); };
  const createCandidate = async () => { setLoading(true); try { const body = { ...candForm, strengths: candForm.strengths.split(',').map(s => s.trim()).filter(Boolean), development_areas: candForm.development_areas.split(',').map(s => s.trim()).filter(Boolean) }; const r = await fetch(`${API}/candidates`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }); if (r.ok) { setShowCandidate(false); loadAll(); } } catch (e) { console.error(e); } setLoading(false); };
  const deletePlan = async (id: string) => { if (!confirm('Delete?')) return; try { await fetch(`${API}/plans/${id}`, { method: 'DELETE', headers: headers() }); loadAll(); } catch (e) { console.error(e); } };

  const critColor = (c: string) => c === 'critical' ? '#ef4444' : c === 'high' ? '#f59e0b' : c === 'medium' ? '#3b82f6' : '#939393';
  const readinessLabel = (r: string) => r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Succession Planning</h1>
            <p style={{ color: '#939393', margin: '4px 0 0' }}>Identify and develop future leaders for critical positions</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tab === 'plans' && <button onClick={() => setShowCreate(true)} style={btnPrimary}><Plus size={16} /> New Plan</button>}
            {tab === 'candidates' && <button onClick={() => setShowCandidate(true)} style={btnPrimary}><Plus size={16} /> Add Candidate</button>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Active Plans', value: plans.filter(p => p.status === 'active').length, icon: <Target size={20} />, color: '#3b82f6' },
            { label: 'Total Candidates', value: candidates.length, icon: <Users size={20} />, color: '#00C971' },
            { label: 'High Risk Positions', value: risk.filter(r => r.risk_score >= 6).length, icon: <AlertTriangle size={20} />, color: '#ef4444' },
            { label: 'Bench Strength', value: bench ? `${bench.bench_strength_pct}%` : '-', icon: <Shield size={20} />, color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <div><div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div><div style={{ color: '#939393', fontSize: 13 }}>{s.label}</div></div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #262626' }}>
          {(['plans', 'candidates', 'risk', 'bench'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: tab === t ? '#00C971' : '#939393', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderBottom: tab === t ? '2px solid #00C971' : '2px solid transparent', textTransform: 'capitalize' }}>{t === 'bench' ? 'Bench Strength' : t === 'risk' ? 'Risk Report' : t}</button>
          ))}
        </div>

        {tab === 'plans' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #262626' }}>
                {['Position', 'Department', 'Incumbent', 'Criticality', 'Risk', 'Impact', 'Status', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {plans.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No plans yet.</td></tr>}
                {plans.map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{p.position_title}</td>
                    <td style={cellStyle}>{p.department}</td>
                    <td style={cellStyle}>{p.incumbent_id?.name || '-'}</td>
                    <td style={cellStyle}><span style={{ color: critColor(p.criticality), fontWeight: 500 }}>{p.criticality}</span></td>
                    <td style={cellStyle}><span style={{ color: critColor(p.risk_of_loss === 'high' ? 'critical' : p.risk_of_loss) }}>{p.risk_of_loss}</span></td>
                    <td style={cellStyle}><span style={{ color: critColor(p.impact_of_loss === 'high' ? 'critical' : p.impact_of_loss) }}>{p.impact_of_loss}</span></td>
                    <td style={cellStyle}><span style={{ color: p.status === 'active' ? '#00C971' : '#939393' }}>{p.status}</span></td>
                    <td style={cellStyle}><button onClick={() => deletePlan(p._id)} style={{ ...smallBtn, color: '#ef4444' }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'candidates' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #262626' }}>
                {['Candidate', 'Readiness', 'Rating', 'Strengths', 'Dev Areas', 'Mentor'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {candidates.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No candidates yet.</td></tr>}
                {candidates.map(c => (
                  <tr key={c._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{c.candidate_id?.name || '-'}</td>
                    <td style={cellStyle}><span style={{ ...tagStyle, background: c.readiness === 'ready_now' ? '#052e16' : '#1e1b4b', color: c.readiness === 'ready_now' ? '#00C971' : '#8b5cf6' }}>{readinessLabel(c.readiness)}</span></td>
                    <td style={cellStyle}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} style={{ color: i < c.overall_rating ? '#f59e0b' : '#333' }} />)}</td>
                    <td style={cellStyle}>{c.strengths.slice(0, 2).join(', ')}</td>
                    <td style={cellStyle}>{c.development_areas.slice(0, 2).join(', ')}</td>
                    <td style={cellStyle}>{c.mentor_id?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'risk' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {risk.length === 0 && <div style={{ background: '#141414', borderRadius: 8, padding: 40, border: '1px solid #262626', textAlign: 'center', color: '#939393' }}>No risk data.</div>}
            {risk.map(r => (
              <div key={r.plan_id} style={{ background: '#141414', borderRadius: 8, padding: 20, border: `1px solid ${r.risk_score >= 6 ? '#7f1d1d' : '#262626'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{r.position_title}</div>
                  <div style={{ color: '#939393', fontSize: 13 }}>{r.department}</div>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ color: critColor(r.criticality), fontWeight: 600 }}>{r.criticality}</div><div style={{ color: '#939393', fontSize: 11 }}>Criticality</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 600 }}>{r.total_candidates}</div><div style={{ color: '#939393', fontSize: 11 }}>Candidates</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: r.ready_now > 0 ? '#00C971' : '#ef4444', fontWeight: 600 }}>{r.ready_now}</div><div style={{ color: '#939393', fontSize: 11 }}>Ready Now</div></div>
                  <div style={{ background: r.risk_score >= 6 ? '#7f1d1d' : r.risk_score >= 4 ? '#78350f' : '#052e16', borderRadius: 6, padding: '4px 12px', color: r.risk_score >= 6 ? '#ef4444' : r.risk_score >= 4 ? '#f59e0b' : '#00C971', fontWeight: 700 }}>Risk: {r.risk_score}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bench' && bench && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Total Positions Tracked', value: bench.total_positions },
              { label: 'Positions with Ready Candidates', value: bench.positions_with_ready_candidates },
              { label: 'Bench Strength', value: `${bench.bench_strength_pct}%` },
              { label: 'Total Candidates in Pipeline', value: bench.total_candidates },
              { label: 'Avg Candidates per Position', value: bench.avg_candidates_per_position },
            ].map((item, i) => (
              <div key={i} style={{ background: '#141414', borderRadius: 8, padding: 24, border: '1px solid #262626' }}>
                <div style={{ color: '#939393', fontSize: 13, marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {showCreate && (
          <div style={overlayStyle} onClick={() => setShowCreate(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Succession Plan</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}><label style={labelStyle}>Position Title *</label><input style={inputStyle} value={planForm.position_title} onChange={e => setPlanForm({ ...planForm, position_title: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Department *</label><input style={inputStyle} value={planForm.department} onChange={e => setPlanForm({ ...planForm, department: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Incumbent ID</label><input style={inputStyle} value={planForm.incumbent_id} onChange={e => setPlanForm({ ...planForm, incumbent_id: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Criticality</label><select style={inputStyle} value={planForm.criticality} onChange={e => setPlanForm({ ...planForm, criticality: e.target.value })}>{['critical', 'high', 'medium', 'low'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Risk of Loss</label><select style={inputStyle} value={planForm.risk_of_loss} onChange={e => setPlanForm({ ...planForm, risk_of_loss: e.target.value })}>{['high', 'medium', 'low'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Impact of Loss</label><select style={inputStyle} value={planForm.impact_of_loss} onChange={e => setPlanForm({ ...planForm, impact_of_loss: e.target.value })}>{['high', 'medium', 'low'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div style={{ ...fieldStyle, gridColumn: 'span 2' }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createPlan} disabled={loading || !planForm.position_title} style={btnPrimary}>{loading ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {showCandidate && (
          <div style={overlayStyle} onClick={() => setShowCandidate(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Add Succession Candidate</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}><label style={labelStyle}>Plan</label><select style={inputStyle} value={candForm.plan_id} onChange={e => setCandForm({ ...candForm, plan_id: e.target.value })}><option value="">Select Plan</option>{plans.map(p => <option key={p._id} value={p._id}>{p.position_title}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Candidate ID *</label><input style={inputStyle} value={candForm.candidate_id} onChange={e => setCandForm({ ...candForm, candidate_id: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Readiness</label><select style={inputStyle} value={candForm.readiness} onChange={e => setCandForm({ ...candForm, readiness: e.target.value })}>{['ready_now', 'ready_1_year', 'ready_2_years', 'development_needed'].map(o => <option key={o} value={o}>{readinessLabel(o)}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Rating (1-5)</label><input style={inputStyle} type="number" min={1} max={5} value={candForm.overall_rating} onChange={e => setCandForm({ ...candForm, overall_rating: parseInt(e.target.value) || 3 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Strengths (comma-sep)</label><input style={inputStyle} value={candForm.strengths} onChange={e => setCandForm({ ...candForm, strengths: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Dev Areas (comma-sep)</label><input style={inputStyle} value={candForm.development_areas} onChange={e => setCandForm({ ...candForm, development_areas: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowCandidate(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createCandidate} disabled={loading || !candForm.candidate_id} style={btnPrimary}>{loading ? 'Adding...' : 'Add'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13, color: '#e5e5e5' };
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#939393', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' };
const tagStyle: React.CSSProperties = { borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 500 };
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const btnSecondary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const smallBtn: React.CSSProperties = { background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#939393', fontSize: 12 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const dialogStyle: React.CSSProperties = { background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle: React.CSSProperties = { color: '#939393', fontSize: 13, fontWeight: 500 };
const inputStyle: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' };

export default SuccessionPlanning;
