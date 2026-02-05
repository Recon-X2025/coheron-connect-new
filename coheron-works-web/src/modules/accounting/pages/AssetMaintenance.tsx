import { useState, useEffect } from 'react';
import {
  Wrench, Plus, DollarSign, AlertTriangle, CheckCircle, Pause,
  X, Search,
} from 'lucide-react';

const TOKEN = localStorage.getItem('authToken') || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

interface MaintenanceSchedule {
  _id: string;
  asset_id: string;
  asset_name: string;
  maintenance_type: string;
  frequency: string;
  last_maintenance_date?: string;
  next_maintenance_date: string;
  estimated_cost: number;
  description: string;
  status: string;
  maintenance_history: { date: string; cost: number; performed_by: string; notes: string }[];
}

export const AssetMaintenance: React.FC = () => {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [upcoming, setUpcoming] = useState<MaintenanceSchedule[]>([]);
  const [overdue, setOverdue] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'upcoming' | 'overdue' | 'calendar'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showRecord, setShowRecord] = useState<string | null>(null);
  const [filter, setFilter] = useState({ type: '', status: '' });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ asset_name: '', asset_id: '', maintenance_type: 'preventive', frequency: 'quarterly', next_maintenance_date: '', estimated_cost: 0, description: '' });
  const [recordForm, setRecordForm] = useState({ cost: 0, performed_by: '', notes: '' });
  const [costSummary, setCostSummary] = useState<any[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [allRes, upRes, odRes, costRes] = await Promise.all([
        fetch('/api/accounting/asset-maintenance', { headers }),
        fetch('/api/accounting/asset-maintenance/upcoming?days=30', { headers }),
        fetch('/api/accounting/asset-maintenance/overdue', { headers }),
        fetch('/api/accounting/asset-maintenance/stats/cost-summary', { headers }),
      ]);
      if (allRes.ok) { const d = await allRes.json(); setSchedules(d.items || []); }
      if (upRes.ok) setUpcoming(await upRes.json());
      if (odRes.ok) setOverdue(await odRes.json());
      if (costRes.ok) setCostSummary(await costRes.json());
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const create = async () => {
    try {
      const res = await fetch('/api/accounting/asset-maintenance', {
        method: 'POST', headers, body: JSON.stringify(form),
      });
      if (res.ok) { setShowCreate(false); fetchAll(); }
    } catch { /* empty */ }
  };

  const recordMaintenance = async () => {
    if (!showRecord) return;
    try {
      const res = await fetch(`/api/accounting/asset-maintenance/${showRecord}/record`, {
        method: 'POST', headers, body: JSON.stringify(recordForm),
      });
      if (res.ok) { setShowRecord(null); setRecordForm({ cost: 0, performed_by: '', notes: '' }); fetchAll(); }
    } catch { /* empty */ }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : '-';
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const typeColor: Record<string, string> = { preventive: '#00C971', calibration: '#2196f3', inspection: '#ff9800', certification: '#9c27b0' };
  const statusIcon = (s: string) => s === 'active' ? <CheckCircle size={14} style={{ color: '#00C971' }} /> : s === 'paused' ? <Pause size={14} style={{ color: '#ff9800' }} /> : <CheckCircle size={14} style={{ color: '#666' }} />;

  const filtered = schedules.filter(s => {
    if (filter.type && s.maintenance_type !== filter.type) return false;
    if (filter.status && s.status !== filter.status) return false;
    if (search && !s.asset_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const S = {
    page: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: 24 } as React.CSSProperties,
    card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 20, marginBottom: 16 } as React.CSSProperties,
    input: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%' } as React.CSSProperties,
    select: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none' } as React.CSSProperties,
    btn: { background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnPrimary: { background: '#00C971', border: '1px solid #00C971', color: '#000', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    label: { fontSize: 12, color: '#939393', marginBottom: 4, display: 'block' } as React.CSSProperties,
    tab: (active: boolean): React.CSSProperties => ({ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, border: 'none', background: active ? '#00C971' : '#1e1e1e', color: active ? '#000' : '#fff', fontWeight: active ? 600 : 400 }),
    badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, background: `${color}22`, color }),
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#141414', border: '1px solid #333', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflow: 'auto' } as React.CSSProperties,
  };

  if (loading) return <div style={S.page}><div style={{ textAlign: 'center', padding: 60, color: '#939393' }}>Loading...</div></div>;

  // ── Calendar view helper ──────────────────────────────────────────

  const renderCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} style={{ width: 80, height: 70 }} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayItems = [...upcoming, ...overdue].filter(s => s.next_maintenance_date?.slice(0, 10) === dateStr);
      const isToday = d === now.getDate();
      cells.push(
        <div key={d} style={{ width: 80, height: 70, border: '1px solid #222', borderRadius: 4, padding: 4, background: isToday ? '#00C97111' : '#111' }}>
          <div style={{ fontSize: 11, color: isToday ? '#00C971' : '#939393', marginBottom: 2 }}>{d}</div>
          {dayItems.map(item => (
            <div key={item._id} style={{ fontSize: 9, padding: '1px 3px', borderRadius: 2, background: typeColor[item.maintenance_type] + '33', color: typeColor[item.maintenance_type], marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.asset_name}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          {now.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ width: 80, textAlign: 'center', fontSize: 10, color: '#666' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>{cells}</div>
      </div>
    );
  };

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wrench size={24} /> Asset Preventive Maintenance
        </h1>
        <button style={S.btnPrimary} onClick={() => setShowCreate(true)}><Plus size={14} /> New Schedule</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ ...S.card, flex: 1, textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{schedules.length}</div>
          <div style={{ fontSize: 12, color: '#939393' }}>Total Schedules</div>
        </div>
        <div style={{ ...S.card, flex: 1, textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2196f3' }}>{upcoming.length}</div>
          <div style={{ fontSize: 12, color: '#939393' }}>Upcoming (30d)</div>
        </div>
        <div style={{ ...S.card, flex: 1, textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4444' }}>{overdue.length}</div>
          <div style={{ fontSize: 12, color: '#939393' }}>Overdue</div>
        </div>
        <div style={{ ...S.card, flex: 1, textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#00C971' }}>
            {formatCurrency(costSummary.reduce((s, c) => s + (c.total_cost || 0), 0))}
          </div>
          <div style={{ fontSize: 12, color: '#939393' }}>Total Spent</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={S.tab(tab === 'all')} onClick={() => setTab('all')}>All Schedules</button>
        <button style={S.tab(tab === 'upcoming')} onClick={() => setTab('upcoming')}>
          Upcoming <span style={{ marginLeft: 4, fontSize: 11 }}>({upcoming.length})</span>
        </button>
        <button style={S.tab(tab === 'overdue')} onClick={() => setTab('overdue')}>
          Overdue <span style={{ marginLeft: 4, fontSize: 11, color: tab === 'overdue' ? '#000' : '#ff4444' }}>({overdue.length})</span>
        </button>
        <button style={S.tab(tab === 'calendar')} onClick={() => setTab('calendar')}>Calendar</button>
      </div>

      {/* Filters */}
      {tab === 'all' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#666' }} />
            <input style={{ ...S.input, paddingLeft: 30 }} placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={S.select} value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
            <option value="">All Types</option>
            <option value="preventive">Preventive</option>
            <option value="calibration">Calibration</option>
            <option value="inspection">Inspection</option>
            <option value="certification">Certification</option>
          </select>
          <select style={S.select} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}

      {/* Calendar view */}
      {tab === 'calendar' && <div style={S.card}>{renderCalendar()}</div>}

      {/* List view */}
      {tab !== 'calendar' && (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#939393', fontWeight: 500 }}>Asset</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#939393', fontWeight: 500 }}>Type</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#939393', fontWeight: 500 }}>Frequency</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#939393', fontWeight: 500 }}>Next Due</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#939393', fontWeight: 500 }}>Last Done</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#939393', fontWeight: 500 }}>Est. Cost</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#939393', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#939393', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'all' ? filtered : tab === 'upcoming' ? upcoming : overdue).map(s => {
                const isOverdue = new Date(s.next_maintenance_date) < new Date() && s.status === 'active';
                return (
                  <tr key={s._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.asset_name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={S.badge(typeColor[s.maintenance_type] || '#666')}>{s.maintenance_type}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#939393' }}>{s.frequency.replace('_', ' ')}</td>
                    <td style={{ padding: '10px 12px', color: isOverdue ? '#ff4444' : '#fff' }}>
                      {isOverdue && <AlertTriangle size={12} style={{ marginRight: 4 }} />}
                      {formatDate(s.next_maintenance_date)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#939393' }}>{formatDate(s.last_maintenance_date)}</td>
                    <td style={{ padding: '10px 12px' }}>{formatCurrency(s.estimated_cost)}</td>
                    <td style={{ padding: '10px 12px' }}>{statusIcon(s.status)} <span style={{ marginLeft: 4 }}>{s.status}</span></td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button style={{ ...S.btn, padding: '4px 10px', fontSize: 12 }}
                        onClick={() => setShowRecord(s._id)}>
                        Record
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(tab === 'all' ? filtered : tab === 'upcoming' ? upcoming : overdue).length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#666' }}>No maintenance schedules found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cost tracking */}
      {costSummary.length > 0 && tab === 'all' && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={16} /> Cost Tracking by Asset
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {costSummary.map((c, i) => (
              <div key={i} style={{ background: '#1a1a1a', borderRadius: 6, padding: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{c.asset_name}</div>
                <div style={{ fontSize: 12, color: '#939393' }}>{c.maintenance_count} maintenances</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#00C971', marginTop: 4 }}>{formatCurrency(c.total_cost)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={S.overlay} onClick={() => setShowCreate(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>New Maintenance Schedule</h3>
              <button style={{ background: 'none', border: 'none', color: '#939393', cursor: 'pointer' }} onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Asset Name *</label>
              <input style={S.input} value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Type</label>
                <select style={{ ...S.select, width: '100%' }} value={form.maintenance_type} onChange={e => setForm({ ...form, maintenance_type: e.target.value })}>
                  <option value="preventive">Preventive</option>
                  <option value="calibration">Calibration</option>
                  <option value="inspection">Inspection</option>
                  <option value="certification">Certification</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Frequency</label>
                <select style={{ ...S.select, width: '100%' }} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Next Maintenance Date *</label>
              <input type="date" style={S.input} value={form.next_maintenance_date} onChange={e => setForm({ ...form, next_maintenance_date: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Estimated Cost</label>
              <input type="number" style={S.input} value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: Number(e.target.value) })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Description</label>
              <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btn} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={S.btnPrimary} onClick={create}>Create Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Record maintenance modal */}
      {showRecord && (
        <div style={S.overlay} onClick={() => setShowRecord(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Record Maintenance</h3>
              <button style={{ background: 'none', border: 'none', color: '#939393', cursor: 'pointer' }} onClick={() => setShowRecord(null)}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Actual Cost</label>
              <input type="number" style={S.input} value={recordForm.cost} onChange={e => setRecordForm({ ...recordForm, cost: Number(e.target.value) })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Performed By</label>
              <input style={S.input} value={recordForm.performed_by} onChange={e => setRecordForm({ ...recordForm, performed_by: e.target.value })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Notes</label>
              <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' }} value={recordForm.notes} onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btn} onClick={() => setShowRecord(null)}>Cancel</button>
              <button style={S.btnPrimary} onClick={recordMaintenance}>Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetMaintenance;
