import { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Plus, CheckCircle2, Clock } from 'lucide-react';

interface Plan { _id: string; name: string; fiscal_year: number; total_budget: number; allocated_budget: number; status: string; guidelines: any; pay_bands: any[]; created_at: string; }
interface Review { _id: string; plan_id: string; employee_id: any; current_salary: number; proposed_salary: number; increase_pct: number; increase_type: string; justification: string; status: string; effective_date: string; }
interface BudgetUtil { plan_id: string; name: string; total_budget: number; used_budget: number; remaining: number; utilization_pct: number; }

const API = '/api/hr/compensation';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` });

export const CompensationPlanning = () => {
  const [tab, setTab] = useState<'plans' | 'reviews' | 'budget'>('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [budget, setBudget] = useState<BudgetUtil[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', fiscal_year: new Date().getFullYear(), total_budget: 0, status: 'draft', guidelines: { min_increase_pct: 0, max_increase_pct: 15, merit_pool_pct: 70, promotion_pool_pct: 30 } });
  const [reviewForm, setReviewForm] = useState({ plan_id: '', employee_id: '', current_salary: 0, proposed_salary: 0, increase_pct: 0, increase_type: 'merit', justification: '', effective_date: '' });

  useEffect(() => { loadPlans(); loadReviews(); loadBudget(); }, []);

  const loadPlans = async () => { try { const r = await fetch(`${API}/plans`, { headers: headers() }); if (r.ok) setPlans(await r.json()); } catch (e) { console.error(e); } };
  const loadReviews = async () => { try { const r = await fetch(`${API}/reviews`, { headers: headers() }); if (r.ok) setReviews(await r.json()); } catch (e) { console.error(e); } };
  const loadBudget = async () => { try { const r = await fetch(`${API}/budget-utilization`, { headers: headers() }); if (r.ok) setBudget(await r.json()); } catch (e) { console.error(e); } };

  const createPlan = async () => { setLoading(true); try { const r = await fetch(`${API}/plans`, { method: 'POST', headers: headers(), body: JSON.stringify(planForm) }); if (r.ok) { setShowCreate(false); loadPlans(); } } catch (e) { console.error(e); } setLoading(false); };
  const createReview = async () => { setLoading(true); try { const r = await fetch(`${API}/reviews`, { method: 'POST', headers: headers(), body: JSON.stringify(reviewForm) }); if (r.ok) { setShowReview(false); loadReviews(); } } catch (e) { console.error(e); } setLoading(false); };
  const approveReview = async (id: string, status: string) => { try { await fetch(`${API}/reviews/${id}/approve`, { method: 'POST', headers: headers(), body: JSON.stringify({ status }) }); loadReviews(); } catch (e) { console.error(e); } };
  const deletePlan = async (id: string) => { if (!confirm('Delete this plan?')) return; try { await fetch(`${API}/plans/${id}`, { method: 'DELETE', headers: headers() }); loadPlans(); } catch (e) { console.error(e); } };

  const statusColor = (s: string) => s === 'approved' || s === 'active' ? '#00C971' : s === 'rejected' ? '#ef4444' : s === 'pending' || s === 'draft' ? '#939393' : '#3b82f6';

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Compensation Planning</h1>
            <p style={{ color: '#939393', margin: '4px 0 0' }}>Manage compensation plans, reviews, and budget utilization</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tab === 'plans' && <button onClick={() => setShowCreate(true)} style={btnPrimary}><Plus size={16} /> New Plan</button>}
            {tab === 'reviews' && <button onClick={() => setShowReview(true)} style={btnPrimary}><Plus size={16} /> New Review</button>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Active Plans', value: plans.filter(p => p.status === 'active').length, icon: <PieChart size={20} />, color: '#3b82f6' },
            { label: 'Pending Reviews', value: reviews.filter(r => r.status === 'pending').length, icon: <Clock size={20} />, color: '#f59e0b' },
            { label: 'Approved Reviews', value: reviews.filter(r => r.status === 'approved').length, icon: <CheckCircle2 size={20} />, color: '#00C971' },
            { label: 'Avg Increase %', value: reviews.length ? `${(reviews.filter(r => r.status === 'approved').reduce((s, r) => s + r.increase_pct, 0) / Math.max(reviews.filter(r => r.status === 'approved').length, 1)).toFixed(1)}%` : '0%', icon: <TrendingUp size={20} />, color: '#8b5cf6' },
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
          {(['plans', 'reviews', 'budget'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: tab === t ? '#00C971' : '#939393', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderBottom: tab === t ? '2px solid #00C971' : '2px solid transparent', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        {tab === 'plans' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #262626' }}>
                {['Name', 'Year', 'Budget', 'Allocated', 'Status', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {plans.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No plans yet.</td></tr>}
                {plans.map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{p.name}</td>
                    <td style={cellStyle}>{p.fiscal_year}</td>
                    <td style={cellStyle}>${p.total_budget.toLocaleString()}</td>
                    <td style={cellStyle}>${p.allocated_budget.toLocaleString()}</td>
                    <td style={cellStyle}><span style={{ color: statusColor(p.status), fontWeight: 500 }}>{p.status}</span></td>
                    <td style={cellStyle}><button onClick={() => deletePlan(p._id)} style={{ ...smallBtn, color: '#ef4444' }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'reviews' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #262626' }}>
                {['Employee', 'Current', 'Proposed', 'Increase %', 'Type', 'Status', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {reviews.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No reviews yet.</td></tr>}
                {reviews.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{r.employee_id?.name || r.employee_id || '-'}</td>
                    <td style={cellStyle}>${r.current_salary.toLocaleString()}</td>
                    <td style={cellStyle}>${r.proposed_salary.toLocaleString()}</td>
                    <td style={cellStyle}>{r.increase_pct.toFixed(1)}%</td>
                    <td style={cellStyle}><span style={{ ...tagStyle, background: '#1e1b4b', color: '#8b5cf6' }}>{r.increase_type}</span></td>
                    <td style={cellStyle}><span style={{ color: statusColor(r.status), fontWeight: 500 }}>{r.status}</span></td>
                    <td style={cellStyle}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => approveReview(r._id, 'approved')} style={{ ...smallBtn, color: '#00C971' }}>Approve</button>
                          <button onClick={() => approveReview(r._id, 'rejected')} style={{ ...smallBtn, color: '#ef4444' }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'budget' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {budget.length === 0 && <div style={{ background: '#141414', borderRadius: 8, padding: 40, border: '1px solid #262626', textAlign: 'center', color: '#939393' }}>No active plans with budget data.</div>}
            {budget.map(b => (
              <div key={b.plan_id} style={{ background: '#141414', borderRadius: 8, padding: 24, border: '1px solid #262626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{b.name}</h3>
                  <span style={{ color: '#00C971', fontWeight: 600 }}>{b.utilization_pct}% utilized</span>
                </div>
                <div style={{ background: '#262626', borderRadius: 4, height: 8, marginBottom: 12 }}>
                  <div style={{ background: b.utilization_pct > 90 ? '#ef4444' : '#00C971', borderRadius: 4, height: 8, width: `${Math.min(b.utilization_pct, 100)}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 24, color: '#939393', fontSize: 13 }}>
                  <span>Total: ${b.total_budget.toLocaleString()}</span>
                  <span>Used: ${b.used_budget.toLocaleString()}</span>
                  <span>Remaining: ${b.remaining.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreate && (
          <div style={overlayStyle} onClick={() => setShowCreate(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Compensation Plan</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}><label style={labelStyle}>Plan Name *</label><input style={inputStyle} value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Fiscal Year</label><input style={inputStyle} type="number" value={planForm.fiscal_year} onChange={e => setPlanForm({ ...planForm, fiscal_year: parseInt(e.target.value) })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Total Budget</label><input style={inputStyle} type="number" value={planForm.total_budget} onChange={e => setPlanForm({ ...planForm, total_budget: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Status</label><select style={inputStyle} value={planForm.status} onChange={e => setPlanForm({ ...planForm, status: e.target.value })}><option value="draft">Draft</option><option value="active">Active</option></select></div>
                <div style={fieldStyle}><label style={labelStyle}>Min Increase %</label><input style={inputStyle} type="number" value={planForm.guidelines.min_increase_pct} onChange={e => setPlanForm({ ...planForm, guidelines: { ...planForm.guidelines, min_increase_pct: parseFloat(e.target.value) || 0 } })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Max Increase %</label><input style={inputStyle} type="number" value={planForm.guidelines.max_increase_pct} onChange={e => setPlanForm({ ...planForm, guidelines: { ...planForm.guidelines, max_increase_pct: parseFloat(e.target.value) || 0 } })} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createPlan} disabled={loading || !planForm.name} style={btnPrimary}>{loading ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {showReview && (
          <div style={overlayStyle} onClick={() => setShowReview(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Compensation Review</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}><label style={labelStyle}>Plan</label><select style={inputStyle} value={reviewForm.plan_id} onChange={e => setReviewForm({ ...reviewForm, plan_id: e.target.value })}><option value="">Select Plan</option>{plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Employee ID *</label><input style={inputStyle} value={reviewForm.employee_id} onChange={e => setReviewForm({ ...reviewForm, employee_id: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Current Salary</label><input style={inputStyle} type="number" value={reviewForm.current_salary} onChange={e => setReviewForm({ ...reviewForm, current_salary: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Proposed Salary</label><input style={inputStyle} type="number" value={reviewForm.proposed_salary} onChange={e => setReviewForm({ ...reviewForm, proposed_salary: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Increase %</label><input style={inputStyle} type="number" value={reviewForm.increase_pct} onChange={e => setReviewForm({ ...reviewForm, increase_pct: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Type</label><select style={inputStyle} value={reviewForm.increase_type} onChange={e => setReviewForm({ ...reviewForm, increase_type: e.target.value })}><option value="merit">Merit</option><option value="promotion">Promotion</option><option value="market_adjustment">Market Adjustment</option><option value="equity">Equity</option></select></div>
                <div style={{ ...fieldStyle, gridColumn: 'span 2' }}><label style={labelStyle}>Justification</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={reviewForm.justification} onChange={e => setReviewForm({ ...reviewForm, justification: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Effective Date</label><input style={inputStyle} type="date" value={reviewForm.effective_date} onChange={e => setReviewForm({ ...reviewForm, effective_date: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowReview(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createReview} disabled={loading || !reviewForm.employee_id} style={btnPrimary}>{loading ? 'Creating...' : 'Create'}</button>
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

export default CompensationPlanning;
