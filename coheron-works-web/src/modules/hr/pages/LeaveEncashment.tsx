import { useState, useEffect } from 'react';
import { DollarSign, ArrowRightLeft, XCircle, Plus, Calendar } from 'lucide-react';

interface EncashmentRecord {
  _id: string;
  employee_id: any;
  leave_type: string;
  encashment_type: string;
  period_year: number;
  days_available: number;
  days_encashed: number;
  days_carried_forward: number;
  days_lapsed: number;
  encashment_amount: number;
  daily_rate: number;
  status: string;
  approved_by?: any;
  remarks?: string;
  created_at: string;
}

const API_BASE = '/api/hr/leave-encashment';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const LeaveEncashment = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'encashment' | 'carry_forward'>('all');
  const [records, setRecords] = useState<EncashmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({
    employee_id: '',
    leave_type: 'earned_leave',
    encashment_type: 'encashment' as string,
    period_year: new Date().getFullYear(),
    days_available: 0,
    days_encashed: 0,
    days_carried_forward: 0,
    daily_rate: 0,
    remarks: '',
  });

  useEffect(() => { loadRecords(); }, [selectedYear]);

  const loadRecords = async () => {
    try {
      const res = await fetch(`${API_BASE}?period_year=${selectedYear}`, { headers: getHeaders() });
      if (res.ok) setRecords(await res.json());
    } catch (e) { console.error('Failed to load records', e); }
  };

  const createRecord = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ employee_id: '', leave_type: 'earned_leave', encashment_type: 'encashment', period_year: new Date().getFullYear(), days_available: 0, days_encashed: 0, days_carried_forward: 0, daily_rate: 0, remarks: '' });
        loadRecords();
      }
    } catch (e) { console.error('Failed to create record', e); }
    setLoading(false);
  };

  const updateStatus = async (id: string, action: string, body?: any) => {
    try {
      const res = await fetch(`${API_BASE}/${id}/${action}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body || {}),
      });
      if (res.ok) loadRecords();
    } catch (e) { console.error(`Failed to ${action}`, e); }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders() });
      loadRecords();
    } catch (e) { console.error('Failed to delete', e); }
  };

  const filtered = records.filter(r => activeTab === 'all' || r.encashment_type === activeTab);

  const totalEncashmentAmount = filtered.filter(r => r.encashment_type === 'encashment').reduce((s, r) => s + r.encashment_amount, 0);
  const totalCarriedDays = filtered.reduce((s, r) => s + r.days_carried_forward, 0);
  const totalLapsed = filtered.reduce((s, r) => s + r.days_lapsed, 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': case 'processed': return '#00C971';
      case 'rejected': return '#ef4444';
      case 'submitted': return '#3b82f6';
      default: return '#939393';
    }
  };

  const tabs = [
    { id: 'all' as const, label: 'All Records' },
    { id: 'encashment' as const, label: 'Encashments' },
    { id: 'carry_forward' as const, label: 'Carry Forward' },
  ];

  return (
    <div style={{ padding: '32px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Leave Encashment & Carry Forward</h1>
            <p style={{ color: '#939393', margin: '4px 0 0' }}>Year-end leave processing, encashment, and carry forward management</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select style={{ ...inputStyle, width: 120 }} value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setShowCreate(true)} style={btnPrimary}>
              <Plus size={16} /> New Request
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Records', value: filtered.length, icon: <Calendar size={20} />, color: '#3b82f6' },
            { label: 'Encashment Amount', value: `$${totalEncashmentAmount.toLocaleString()}`, icon: <DollarSign size={20} />, color: '#00C971' },
            { label: 'Days Carried Forward', value: totalCarriedDays, icon: <ArrowRightLeft size={20} />, color: '#8b5cf6' },
            { label: 'Days Lapsed', value: totalLapsed, icon: <XCircle size={20} />, color: '#ef4444' },
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #262626' }}>
          {tabs.map((tab, idx) => (
            <button
              key={tab.id || (tab as any)._id || idx}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px', background: 'transparent', border: 'none',
                color: activeTab === tab.id ? '#00C971' : '#939393', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                borderBottom: activeTab === tab.id ? '2px solid #00C971' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #262626' }}>
                {['Employee', 'Leave Type', 'Type', 'Year', 'Available', 'Encashed', 'Carried Fwd', 'Lapsed', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#939393', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No records found for {selectedYear}.</td></tr>
              )}
              {filtered.map(rec => (
                <tr key={rec._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={cellStyle}>{rec.employee_id?.name || rec.employee_id || '-'}</td>
                  <td style={cellStyle}>{rec.leave_type}</td>
                  <td style={cellStyle}>
                    <span style={{ ...tagStyle, background: rec.encashment_type === 'encashment' ? '#052e16' : '#1e1b4b', color: rec.encashment_type === 'encashment' ? '#00C971' : '#8b5cf6' }}>
                      {rec.encashment_type === 'carry_forward' ? 'Carry Forward' : 'Encashment'}
                    </span>
                  </td>
                  <td style={cellStyle}>{rec.period_year}</td>
                  <td style={cellStyle}>{rec.days_available}</td>
                  <td style={cellStyle}>{rec.days_encashed}</td>
                  <td style={cellStyle}>{rec.days_carried_forward}</td>
                  <td style={cellStyle}>{rec.days_lapsed}</td>
                  <td style={cellStyle}>${rec.encashment_amount.toLocaleString()}</td>
                  <td style={cellStyle}>
                    <span style={{ color: statusColor(rec.status), fontWeight: 500 }}>{rec.status}</span>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {rec.status === 'draft' && (
                        <>
                          <button onClick={() => updateStatus(rec._id, 'submit')} style={smallBtn} title="Submit">Submit</button>
                          <button onClick={() => deleteRecord(rec._id)} style={{ ...smallBtn, color: '#ef4444' }} title="Delete">Del</button>
                        </>
                      )}
                      {rec.status === 'submitted' && (
                        <>
                          <button onClick={() => updateStatus(rec._id, 'approve', { status: 'approved' })} style={{ ...smallBtn, color: '#00C971' }}>Approve</button>
                          <button onClick={() => updateStatus(rec._id, 'approve', { status: 'rejected' })} style={{ ...smallBtn, color: '#ef4444' }}>Reject</button>
                        </>
                      )}
                      {rec.status === 'approved' && (
                        <button onClick={() => updateStatus(rec._id, 'process')} style={{ ...smallBtn, color: '#3b82f6' }}>Process</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Dialog */}
        {showCreate && (
          <div style={overlayStyle} onClick={() => setShowCreate(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Leave Encashment / Carry Forward</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Employee ID *</label>
                  <input style={inputStyle} value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="Employee ObjectId" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Leave Type</label>
                  <input style={inputStyle} value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Type *</label>
                  <select style={inputStyle} value={form.encashment_type} onChange={e => setForm({ ...form, encashment_type: e.target.value })}>
                    <option value="encashment">Encashment</option>
                    <option value="carry_forward">Carry Forward</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Period Year *</label>
                  <input style={inputStyle} type="number" value={form.period_year} onChange={e => setForm({ ...form, period_year: parseInt(e.target.value) })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Days Available</label>
                  <input style={inputStyle} type="number" value={form.days_available} onChange={e => setForm({ ...form, days_available: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Days to Encash</label>
                  <input style={inputStyle} type="number" value={form.days_encashed} onChange={e => setForm({ ...form, days_encashed: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Days to Carry Forward</label>
                  <input style={inputStyle} type="number" value={form.days_carried_forward} onChange={e => setForm({ ...form, days_carried_forward: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Daily Rate</label>
                  <input style={inputStyle} type="number" value={form.daily_rate} onChange={e => setForm({ ...form, daily_rate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Remarks</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
                </div>
                {form.days_encashed > 0 && form.daily_rate > 0 && (
                  <div style={{ gridColumn: 'span 2', background: '#052e16', border: '1px solid #065f46', borderRadius: 8, padding: 16 }}>
                    <span style={{ color: '#00C971', fontWeight: 600 }}>Encashment Amount: ${(form.days_encashed * form.daily_rate).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createRecord} disabled={loading || !form.employee_id} style={btnPrimary}>
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13, color: '#e5e5e5' };
const tagStyle: React.CSSProperties = { borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 500 };
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const btnSecondary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const smallBtn: React.CSSProperties = { background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#939393', fontSize: 12 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const dialogStyle: React.CSSProperties = { background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle: React.CSSProperties = { color: '#939393', fontSize: 13, fontWeight: 500 };
const inputStyle: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' };

export default LeaveEncashment;
