import { useState, useEffect } from 'react';
import { DollarSign, FileText, Clock, Plus, Trash2, CreditCard } from 'lucide-react';

interface SettlementComponent {
  component: string;
  type: 'earning' | 'deduction';
  amount: number;
  remarks?: string;
}

interface Settlement {
  _id: string;
  employee_id: any;
  settlement_number: string;
  resignation_date: string;
  last_working_date: string;
  settlement_date?: string;
  status: string;
  components: SettlementComponent[];
  leave_encashment_days: number;
  leave_encashment_amount: number;
  notice_period_days: number;
  notice_period_recovery: number;
  gratuity_amount: number;
  gratuity_eligible: boolean;
  bonus_amount: number;
  total_earnings: number;
  total_deductions: number;
  net_settlement_amount: number;
  payment_mode?: string;
  payment_reference?: string;
  paid_at?: string;
  remarks?: string;
  created_at: string;
}

const API_BASE = '/api/hr/full-final-settlement';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const FullFinalSettlement = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    employee_id: '',
    resignation_date: '',
    last_working_date: '',
    leave_encashment_days: 0,
    leave_encashment_amount: 0,
    notice_period_days: 0,
    notice_period_recovery: 0,
    gratuity_eligible: false,
    gratuity_amount: 0,
    bonus_amount: 0,
    components: [] as SettlementComponent[],
    remarks: '',
  });

  useEffect(() => { loadSettlements(); }, [statusFilter]);

  const loadSettlements = async () => {
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`${API_BASE}${qs}`, { headers: getHeaders() });
      if (res.ok) setSettlements(await res.json());
    } catch (e) { console.error('Failed to load settlements', e); }
  };

  const createSettlement = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowCreate(false);
        resetForm();
        loadSettlements();
      }
    } catch (e) { console.error('Failed to create settlement', e); }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ employee_id: '', resignation_date: '', last_working_date: '', leave_encashment_days: 0, leave_encashment_amount: 0, notice_period_days: 0, notice_period_recovery: 0, gratuity_eligible: false, gratuity_amount: 0, bonus_amount: 0, components: [], remarks: '' });
  };

  const performAction = async (id: string, action: string, body?: any) => {
    try {
      const res = await fetch(`${API_BASE}/${id}/${action}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body || {}),
      });
      if (res.ok) {
        loadSettlements();
        if (selectedSettlement?._id === id) {
          setSelectedSettlement(await res.json());
        }
      }
    } catch (e) { console.error(`Failed to ${action}`, e); }
  };

  const deleteSettlement = async (id: string) => {
    if (!confirm('Delete this settlement?')) return;
    try {
      await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (selectedSettlement?._id === id) setSelectedSettlement(null);
      loadSettlements();
    } catch (e) { console.error('Failed to delete', e); }
  };

  const addComponent = () => {
    setForm({ ...form, components: [...form.components, { component: '', type: 'earning', amount: 0, remarks: '' }] });
  };

  const updateComponent = (index: number, field: string, value: any) => {
    const updated = [...form.components];
    (updated[index] as any)[field] = value;
    setForm({ ...form, components: updated });
  };

  const removeComponent = (index: number) => {
    setForm({ ...form, components: form.components.filter((_, i) => i !== index) });
  };

  const calcEarnings = form.components.filter(c => c.type === 'earning').reduce((s, c) => s + (c.amount || 0), 0) + form.leave_encashment_amount + form.gratuity_amount + form.bonus_amount;
  const calcDeductions = form.components.filter(c => c.type === 'deduction').reduce((s, c) => s + (c.amount || 0), 0) + form.notice_period_recovery;
  const calcNet = calcEarnings - calcDeductions;

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#00C971';
      case 'approved': case 'processed': return '#3b82f6';
      case 'pending_approval': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#939393';
    }
  };

  const statusFilters = ['', 'draft', 'pending_approval', 'approved', 'processed', 'paid', 'cancelled'];

  return (
    <div style={{ padding: '32px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Full & Final Settlement</h1>
            <p style={{ color: '#939393', margin: '4px 0 0' }}>Process employee exit settlements with component breakdown</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...inputStyle, width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {statusFilters.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button onClick={() => setShowCreate(true)} style={btnPrimary}>
              <Plus size={16} /> New Settlement
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Settlements', value: settlements.length, icon: <FileText size={20} />, color: '#3b82f6' },
            { label: 'Pending Approval', value: settlements.filter(s => s.status === 'pending_approval').length, icon: <Clock size={20} />, color: '#f59e0b' },
            { label: 'Total Paid Out', value: `$${settlements.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.net_settlement_amount, 0).toLocaleString()}`, icon: <DollarSign size={20} />, color: '#00C971' },
            { label: 'Pending Payment', value: settlements.filter(s => ['approved', 'processed'].includes(s.status)).length, icon: <CreditCard size={20} />, color: '#8b5cf6' },
          ].map((stat, i) => (
            <div key={i} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: stat.color }}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{stat.value}</div>
                  <div style={{ color: '#939393', fontSize: 13 }}>{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column layout: list + detail */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedSettlement ? '1fr 1fr' : '1fr', gap: 16 }}>
          {/* List */}
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #262626' }}>
                  {['Settlement #', 'Employee', 'LWD', 'Net Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 12px', textAlign: 'left', color: '#939393', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No settlements found.</td></tr>
                )}
                {settlements.map(s => (
                  <tr key={s._id} style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer', background: selectedSettlement?._id === s._id ? '#1a1a1a' : 'transparent' }} onClick={() => setSelectedSettlement(s)}>
                    <td style={cellStyle}>{s.settlement_number}</td>
                    <td style={cellStyle}>{s.employee_id?.name || '-'}</td>
                    <td style={cellStyle}>{new Date(s.last_working_date).toLocaleDateString()}</td>
                    <td style={{ ...cellStyle, fontWeight: 600 }}>${s.net_settlement_amount.toLocaleString()}</td>
                    <td style={cellStyle}><span style={{ color: statusColor(s.status), fontWeight: 500, fontSize: 12 }}>{s.status.replace('_', ' ')}</span></td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        {s.status === 'draft' && (
                          <>
                            <button onClick={() => performAction(s._id, 'submit')} style={smallBtn}>Submit</button>
                            <button onClick={() => deleteSettlement(s._id)} style={{ ...smallBtn, color: '#ef4444' }}>
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        {s.status === 'pending_approval' && (
                          <>
                            <button onClick={() => performAction(s._id, 'approve')} style={{ ...smallBtn, color: '#00C971' }}>Approve</button>
                            <button onClick={() => performAction(s._id, 'reject')} style={{ ...smallBtn, color: '#ef4444' }}>Reject</button>
                          </>
                        )}
                        {s.status === 'approved' && (
                          <button onClick={() => performAction(s._id, 'pay', { payment_mode: 'bank_transfer' })} style={{ ...smallBtn, color: '#00C971' }}>Pay</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selectedSettlement && (
            <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{selectedSettlement.settlement_number}</h3>
                <button onClick={() => setSelectedSettlement(null)} style={{ background: 'transparent', border: 'none', color: '#939393', cursor: 'pointer', fontSize: 18 }}>x</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div><span style={detailLabel}>Employee</span><br />{selectedSettlement.employee_id?.name || '-'}</div>
                <div><span style={detailLabel}>Status</span><br /><span style={{ color: statusColor(selectedSettlement.status) }}>{selectedSettlement.status.replace('_', ' ')}</span></div>
                <div><span style={detailLabel}>Resignation Date</span><br />{new Date(selectedSettlement.resignation_date).toLocaleDateString()}</div>
                <div><span style={detailLabel}>Last Working Date</span><br />{new Date(selectedSettlement.last_working_date).toLocaleDateString()}</div>
              </div>

              <h4 style={{ fontSize: 14, color: '#939393', marginBottom: 8 }}>Settlement Breakdown</h4>
              <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={breakdownRow}><span>Leave Encashment ({selectedSettlement.leave_encashment_days} days)</span><span style={{ color: '#00C971' }}>+${selectedSettlement.leave_encashment_amount.toLocaleString()}</span></div>
                {selectedSettlement.gratuity_eligible && (
                  <div style={breakdownRow}><span>Gratuity</span><span style={{ color: '#00C971' }}>+${selectedSettlement.gratuity_amount.toLocaleString()}</span></div>
                )}
                {selectedSettlement.bonus_amount > 0 && (
                  <div style={breakdownRow}><span>Bonus</span><span style={{ color: '#00C971' }}>+${selectedSettlement.bonus_amount.toLocaleString()}</span></div>
                )}
                {selectedSettlement.components.filter(c => c.type === 'earning').map((c, i) => (
                  <div key={i} style={breakdownRow}><span>{c.component}</span><span style={{ color: '#00C971' }}>+${c.amount.toLocaleString()}</span></div>
                ))}
                {selectedSettlement.notice_period_recovery > 0 && (
                  <div style={breakdownRow}><span>Notice Period Recovery</span><span style={{ color: '#ef4444' }}>-${selectedSettlement.notice_period_recovery.toLocaleString()}</span></div>
                )}
                {selectedSettlement.components.filter(c => c.type === 'deduction').map((c, i) => (
                  <div key={i} style={breakdownRow}><span>{c.component}</span><span style={{ color: '#ef4444' }}>-${c.amount.toLocaleString()}</span></div>
                ))}
                <div style={{ ...breakdownRow, borderTop: '1px solid #333', paddingTop: 12, marginTop: 8 }}>
                  <span style={{ fontWeight: 700 }}>Total Earnings</span><span style={{ color: '#00C971', fontWeight: 700 }}>${selectedSettlement.total_earnings.toLocaleString()}</span>
                </div>
                <div style={breakdownRow}>
                  <span style={{ fontWeight: 700 }}>Total Deductions</span><span style={{ color: '#ef4444', fontWeight: 700 }}>${selectedSettlement.total_deductions.toLocaleString()}</span>
                </div>
                <div style={{ ...breakdownRow, borderTop: '1px solid #333', paddingTop: 12, marginTop: 8, fontSize: 16 }}>
                  <span style={{ fontWeight: 700 }}>Net Settlement</span><span style={{ fontWeight: 700, color: '#00C971' }}>${selectedSettlement.net_settlement_amount.toLocaleString()}</span>
                </div>
              </div>

              {selectedSettlement.paid_at && (
                <div style={{ background: '#052e16', border: '1px solid #065f46', borderRadius: 8, padding: 12 }}>
                  <span style={{ color: '#00C971', fontSize: 13 }}>Paid on {new Date(selectedSettlement.paid_at).toLocaleDateString()} via {selectedSettlement.payment_mode?.replace('_', ' ')}</span>
                  {selectedSettlement.payment_reference && <span style={{ color: '#939393', fontSize: 12, marginLeft: 8 }}>Ref: {selectedSettlement.payment_reference}</span>}
                </div>
              )}
              {selectedSettlement.remarks && (
                <div style={{ marginTop: 12, color: '#939393', fontSize: 13 }}>Remarks: {selectedSettlement.remarks}</div>
              )}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        {showCreate && (
          <div style={overlayStyle} onClick={() => setShowCreate(false)}>
            <div style={{ ...dialogStyle, width: 700 }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Full & Final Settlement</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Employee ID *</label>
                  <input style={inputStyle} value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="Employee ObjectId" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Resignation Date *</label>
                  <input style={inputStyle} type="date" value={form.resignation_date} onChange={e => setForm({ ...form, resignation_date: e.target.value })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Last Working Date *</label>
                  <input style={inputStyle} type="date" value={form.last_working_date} onChange={e => setForm({ ...form, last_working_date: e.target.value })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notice Period (days)</label>
                  <input style={inputStyle} type="number" value={form.notice_period_days} onChange={e => setForm({ ...form, notice_period_days: parseInt(e.target.value) || 0 })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Leave Encashment Days</label>
                  <input style={inputStyle} type="number" value={form.leave_encashment_days} onChange={e => setForm({ ...form, leave_encashment_days: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Leave Encashment Amount</label>
                  <input style={inputStyle} type="number" value={form.leave_encashment_amount} onChange={e => setForm({ ...form, leave_encashment_amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notice Period Recovery</label>
                  <input style={inputStyle} type="number" value={form.notice_period_recovery} onChange={e => setForm({ ...form, notice_period_recovery: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Bonus Amount</label>
                  <input style={inputStyle} type="number" value={form.bonus_amount} onChange={e => setForm({ ...form, bonus_amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={{ ...fieldStyle, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.gratuity_eligible} onChange={e => setForm({ ...form, gratuity_eligible: e.target.checked })} />
                  <label style={{ color: '#939393', fontSize: 14 }}>Gratuity Eligible</label>
                </div>
                {form.gratuity_eligible && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Gratuity Amount</label>
                    <input style={inputStyle} type="number" value={form.gratuity_amount} onChange={e => setForm({ ...form, gratuity_amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                )}
              </div>

              {/* Components */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 14, margin: 0, color: '#939393' }}>Additional Components</h3>
                  <button onClick={addComponent} style={smallBtn}><Plus size={12} /> Add</button>
                </div>
                {form.components.map((comp, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input style={{ ...inputStyle, flex: 2 }} placeholder="Component name" value={comp.component} onChange={e => updateComponent(idx, 'component', e.target.value)} />
                    <select style={{ ...inputStyle, flex: 1 }} value={comp.type} onChange={e => updateComponent(idx, 'type', e.target.value)}>
                      <option value="earning">Earning</option>
                      <option value="deduction">Deduction</option>
                    </select>
                    <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Amount" value={comp.amount} onChange={e => updateComponent(idx, 'amount', parseFloat(e.target.value) || 0)} />
                    <button onClick={() => removeComponent(idx)} style={{ ...iconBtn, padding: 6 }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>

              {/* Calculated totals */}
              <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 16, marginTop: 16 }}>
                <div style={breakdownRow}><span>Earnings</span><span style={{ color: '#00C971' }}>${calcEarnings.toLocaleString()}</span></div>
                <div style={breakdownRow}><span>Deductions</span><span style={{ color: '#ef4444' }}>${calcDeductions.toLocaleString()}</span></div>
                <div style={{ ...breakdownRow, borderTop: '1px solid #333', paddingTop: 8, marginTop: 4, fontWeight: 700, fontSize: 16 }}>
                  <span>Net Settlement</span><span style={{ color: calcNet >= 0 ? '#00C971' : '#ef4444' }}>${calcNet.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ ...fieldStyle, marginTop: 16 }}>
                <label style={labelStyle}>Remarks</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => { setShowCreate(false); resetForm(); }} style={btnSecondary}>Cancel</button>
                <button onClick={createSettlement} disabled={loading || !form.employee_id || !form.resignation_date || !form.last_working_date} style={btnPrimary}>
                  {loading ? 'Creating...' : 'Create Settlement'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 13, color: '#e5e5e5' };
const breakdownRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 };
const detailLabel: React.CSSProperties = { color: '#939393', fontSize: 12 };
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const btnSecondary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const smallBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#939393', fontSize: 12 };
const iconBtn: React.CSSProperties = { background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: 6, cursor: 'pointer', color: '#939393' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const dialogStyle: React.CSSProperties = { background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 32, maxHeight: '90vh', overflowY: 'auto' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle: React.CSSProperties = { color: '#939393', fontSize: 13, fontWeight: 500 };
const inputStyle: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' };

export default FullFinalSettlement;
