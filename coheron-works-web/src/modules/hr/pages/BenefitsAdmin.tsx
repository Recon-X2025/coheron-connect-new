import { useState, useEffect } from 'react';
import { Heart, Shield, Eye, DollarSign, Plus, Users, Calendar, Activity } from 'lucide-react';

interface Plan { _id: string; name: string; type: string; provider: string; description: string; coverage_options: any[]; eligibility_rules: any; enrollment_start: string; enrollment_end: string; plan_year: number; is_active: boolean; }
interface Enrollment { _id: string; plan_id: any; employee_id: any; coverage_option_name: string; dependents: any[]; status: string; effective_date: string; employee_contribution: number; employer_contribution: number; }
interface CostSummary { plan_year: number; plans: any[]; totals: { employee_cost: number; employer_cost: number; total: number }; }

const API = '/api/hr/benefits';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` });

export const BenefitsAdmin = () => {
  const [tab, setTab] = useState<'plans' | 'enrollments' | 'costs'>('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', type: 'health', provider: '', description: '', plan_year: new Date().getFullYear(), is_active: true });
  const [enrollForm, setEnrollForm] = useState({ plan_id: '', employee_id: '', coverage_option_name: '', effective_date: '', employee_contribution: 0, employer_contribution: 0 });

  useEffect(() => { loadPlans(); loadEnrollments(); loadCosts(); }, []);

  const loadPlans = async () => { try { const r = await fetch(`${API}/plans`, { headers: headers() }); if (r.ok) setPlans(await r.json()); } catch (e) { console.error(e); } };
  const loadEnrollments = async () => { try { const r = await fetch(`${API}/enrollments`, { headers: headers() }); if (r.ok) setEnrollments(await r.json()); } catch (e) { console.error(e); } };
  const loadCosts = async () => { try { const r = await fetch(`${API}/cost-summary`, { headers: headers() }); if (r.ok) setCosts(await r.json()); } catch (e) { console.error(e); } };

  const createPlan = async () => { setLoading(true); try { const r = await fetch(`${API}/plans`, { method: 'POST', headers: headers(), body: JSON.stringify(planForm) }); if (r.ok) { setShowCreate(false); loadPlans(); } } catch (e) { console.error(e); } setLoading(false); };
  const createEnrollment = async () => { setLoading(true); try { const r = await fetch(`${API}/enrollments`, { method: 'POST', headers: headers(), body: JSON.stringify(enrollForm) }); if (r.ok) { setShowEnroll(false); loadEnrollments(); loadCosts(); } } catch (e) { console.error(e); } setLoading(false); };
  const deletePlan = async (id: string) => { if (!confirm('Delete?')) return; try { await fetch(`${API}/plans/${id}`, { method: 'DELETE', headers: headers() }); loadPlans(); } catch (e) { console.error(e); } };
  const openEnrollment = async () => { try { await fetch(`${API}/open-enrollment`, { method: 'POST', headers: headers(), body: JSON.stringify({ plan_year: new Date().getFullYear() }) }); loadPlans(); } catch (e) { console.error(e); } };

  const typeIcon = (t: string) => { switch (t) { case 'health': return <Heart size={16} />; case 'vision': return <Eye size={16} />; case 'life': return <Shield size={16} />; default: return <Activity size={16} />; } };
  const statusColor = (s: string) => s === 'active' ? '#00C971' : s === 'cancelled' || s === 'terminated' ? '#ef4444' : '#939393';

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Benefits Administration</h1>
            <p style={{ color: '#939393', margin: '4px 0 0' }}>Manage benefit plans, enrollments, and cost analysis</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openEnrollment} style={btnSecondary}><Calendar size={16} /> Open Enrollment</button>
            {tab === 'plans' && <button onClick={() => setShowCreate(true)} style={btnPrimary}><Plus size={16} /> New Plan</button>}
            {tab === 'enrollments' && <button onClick={() => setShowEnroll(true)} style={btnPrimary}><Plus size={16} /> New Enrollment</button>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Active Plans', value: plans.filter(p => p.is_active).length, icon: <Shield size={20} />, color: '#3b82f6' },
            { label: 'Total Enrollments', value: enrollments.filter(e => e.status === 'active').length, icon: <Users size={20} />, color: '#00C971' },
            { label: 'Employer Cost', value: costs ? `$${costs.totals.employer_cost.toLocaleString()}` : '$0', icon: <DollarSign size={20} />, color: '#f59e0b' },
            { label: 'Total Cost', value: costs ? `$${costs.totals.total.toLocaleString()}` : '$0', icon: <DollarSign size={20} />, color: '#8b5cf6' },
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
          {(['plans', 'enrollments', 'costs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: tab === t ? '#00C971' : '#939393', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderBottom: tab === t ? '2px solid #00C971' : '2px solid transparent', textTransform: 'capitalize' }}>{t === 'costs' ? 'Cost Analysis' : t}</button>
          ))}
        </div>

        {tab === 'plans' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {plans.length === 0 && <div style={{ background: '#141414', borderRadius: 8, padding: 40, border: '1px solid #262626', textAlign: 'center', color: '#939393' }}>No benefit plans yet.</div>}
            {plans.map(p => (
              <div key={p._id} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ color: '#00C971' }}>{typeIcon(p.type)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                      <div style={{ color: '#939393', fontSize: 13 }}>{p.provider} | {p.type} | Year: {p.plan_year}</div>
                      {p.description && <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{p.description}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: p.is_active ? '#00C971' : '#939393', fontSize: 13, fontWeight: 500 }}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    <button onClick={() => deletePlan(p._id)} style={{ ...smallBtn, color: '#ef4444' }}>Delete</button>
                  </div>
                </div>
                {p.coverage_options?.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {p.coverage_options.map((co: any, i: number) => (
                      <span key={i} style={{ ...tagStyle, background: '#1e1b4b', color: '#8b5cf6' }}>{co.name}: ${co.employee_cost}/mo</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'enrollments' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #262626' }}>
                {['Employee', 'Plan', 'Coverage', 'Dependents', 'Employee $', 'Employer $', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {enrollments.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No enrollments yet.</td></tr>}
                {enrollments.map(e => (
                  <tr key={e._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{e.employee_id?.name || e.employee_id || '-'}</td>
                    <td style={cellStyle}>{e.plan_id?.name || '-'}</td>
                    <td style={cellStyle}>{e.coverage_option_name}</td>
                    <td style={cellStyle}>{e.dependents?.length || 0}</td>
                    <td style={cellStyle}>${e.employee_contribution.toLocaleString()}</td>
                    <td style={cellStyle}>${e.employer_contribution.toLocaleString()}</td>
                    <td style={cellStyle}><span style={{ color: statusColor(e.status), fontWeight: 500 }}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'costs' && costs && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#141414', borderRadius: 8, padding: 24, border: '1px solid #262626', textAlign: 'center' }}>
                <div style={{ color: '#939393', fontSize: 13, marginBottom: 8 }}>Employee Cost</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>${costs.totals.employee_cost.toLocaleString()}</div>
              </div>
              <div style={{ background: '#141414', borderRadius: 8, padding: 24, border: '1px solid #262626', textAlign: 'center' }}>
                <div style={{ color: '#939393', fontSize: 13, marginBottom: 8 }}>Employer Cost</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>${costs.totals.employer_cost.toLocaleString()}</div>
              </div>
              <div style={{ background: '#141414', borderRadius: 8, padding: 24, border: '1px solid #262626', textAlign: 'center' }}>
                <div style={{ color: '#939393', fontSize: 13, marginBottom: 8 }}>Total Cost</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#00C971' }}>${costs.totals.total.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid #262626' }}>
                  {['Plan', 'Type', 'Enrollments', 'Employee Cost', 'Employer Cost', 'Total'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {costs.plans.map((p: any) => (
                    <tr key={p.plan_id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={cellStyle}>{p.name}</td>
                      <td style={cellStyle}>{p.type}</td>
                      <td style={cellStyle}>{p.enrollments}</td>
                      <td style={cellStyle}>${p.employee_cost.toLocaleString()}</td>
                      <td style={cellStyle}>${p.employer_cost.toLocaleString()}</td>
                      <td style={cellStyle}>${p.total_cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showCreate && (
          <div style={overlayStyle} onClick={() => setShowCreate(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Benefit Plan</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}><label style={labelStyle}>Name *</label><input style={inputStyle} value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Type</label><select style={inputStyle} value={planForm.type} onChange={e => setPlanForm({ ...planForm, type: e.target.value })}>{['health', 'dental', 'vision', 'life', 'retirement', 'wellness', 'other'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Provider</label><input style={inputStyle} value={planForm.provider} onChange={e => setPlanForm({ ...planForm, provider: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Plan Year</label><input style={inputStyle} type="number" value={planForm.plan_year} onChange={e => setPlanForm({ ...planForm, plan_year: parseInt(e.target.value) })} /></div>
                <div style={{ ...fieldStyle, gridColumn: 'span 2' }}><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createPlan} disabled={loading || !planForm.name} style={btnPrimary}>{loading ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {showEnroll && (
          <div style={overlayStyle} onClick={() => setShowEnroll(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Enrollment</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}><label style={labelStyle}>Plan</label><select style={inputStyle} value={enrollForm.plan_id} onChange={e => setEnrollForm({ ...enrollForm, plan_id: e.target.value })}><option value="">Select Plan</option>{plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Employee ID *</label><input style={inputStyle} value={enrollForm.employee_id} onChange={e => setEnrollForm({ ...enrollForm, employee_id: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Coverage Option</label><input style={inputStyle} value={enrollForm.coverage_option_name} onChange={e => setEnrollForm({ ...enrollForm, coverage_option_name: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Effective Date</label><input style={inputStyle} type="date" value={enrollForm.effective_date} onChange={e => setEnrollForm({ ...enrollForm, effective_date: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Employee Contribution</label><input style={inputStyle} type="number" value={enrollForm.employee_contribution} onChange={e => setEnrollForm({ ...enrollForm, employee_contribution: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Employer Contribution</label><input style={inputStyle} type="number" value={enrollForm.employer_contribution} onChange={e => setEnrollForm({ ...enrollForm, employer_contribution: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowEnroll(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createEnrollment} disabled={loading || !enrollForm.employee_id} style={btnPrimary}>{loading ? 'Enrolling...' : 'Enroll'}</button>
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

export default BenefitsAdmin;
