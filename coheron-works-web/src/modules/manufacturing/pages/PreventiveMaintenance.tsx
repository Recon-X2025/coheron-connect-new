import { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Plus,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  X,
  
  
  
  
} from 'lucide-react';

interface Schedule {
  _id: string;
  schedule_name: string;
  equipment_id: string;
  equipment_name: string;
  maintenance_type: string;
  frequency: string;
  next_maintenance_date: string;
  last_maintenance_date?: string;
  status: string;
  mtbf_hours?: number;
  mttr_hours?: number;
  total_breakdowns: number;
  total_downtime_hours: number;
  estimated_duration_hours: number;
  cost_per_maintenance: number;
  checklist: { task: string; is_critical: boolean }[];
  is_overdue?: boolean;
}

interface MaintenanceLogEntry {
  _id: string;
  schedule_id: any;
  equipment_id: string;
  log_type: string;
  title: string;
  description: string;
  started_at: string;
  completed_at?: string;
  downtime_hours: number;
  performed_by: any[];
  total_cost: number;
  status: string;
}

interface HealthItem {
  equipment_id: string;
  equipment_name: string;
  mtbf_hours: number;
  mttr_hours: number;
  availability_percent: number;
  next_maintenance_date: string;
  days_until_next: number;
  is_overdue: boolean;
  total_breakdowns: number;
  health_status: string;
}

const API_BASE = '/api/manufacturing/maintenance';
const getToken = () => localStorage.getItem('authToken') || '';

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

const healthColors: Record<string, string> = {
  good: '#00C971',
  warning: '#f59e0b',
  critical: '#ef4444',
};

const typeColors: Record<string, string> = {
  preventive: '#3b82f6',
  predictive: '#8b5cf6',
  condition_based: '#06b6d4',
  corrective: '#f59e0b',
  breakdown: '#ef4444',
  inspection: '#939393',
};

export const PreventiveMaintenance: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<MaintenanceLogEntry[]>([]);
  const [health, setHealth] = useState<HealthItem[]>([]);
  const [upcoming, setUpcoming] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'logs' | 'create_schedule' | 'log_maintenance'>('dashboard');
  const [error, setError] = useState('');

  const [scheduleForm, setScheduleForm] = useState({
    schedule_name: '',
    equipment_id: '',
    equipment_name: '',
    maintenance_type: 'preventive',
    frequency: 'monthly',
    next_maintenance_date: '',
    estimated_duration_hours: 1,
    cost_per_maintenance: 0,
    checklist: '' as string,
  });

  const [logForm, setLogForm] = useState({
    schedule_id: '',
    equipment_id: '',
    log_type: 'preventive',
    title: '',
    description: '',
    started_at: new Date().toISOString().slice(0, 16),
    downtime_hours: 0,
    total_cost: 0,
    root_cause: '',
    corrective_action: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedRes, logRes, healthRes, upcomingRes] = await Promise.all([
        apiFetch(`${API_BASE}/schedules`),
        apiFetch(`${API_BASE}/logs?limit=50`),
        apiFetch(`${API_BASE}/health`),
        apiFetch(`${API_BASE}/upcoming`),
      ]);
      setSchedules(schedRes.data || []);
      setLogs(logRes.data || []);
      setHealth(healthRes.data || []);
      setUpcoming(upcomingRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSchedule = async () => {
    try {
      if (!scheduleForm.schedule_name || !scheduleForm.equipment_name || !scheduleForm.next_maintenance_date) {
        setError('Please fill required fields');
        return;
      }
      const checklist = scheduleForm.checklist
        .split('\n')
        .filter(t => t.trim())
        .map(t => ({ task: t.trim(), is_critical: t.trim().startsWith('!') }));

      await apiFetch(`${API_BASE}/schedules`, {
        method: 'POST',
        body: JSON.stringify({
          ...scheduleForm,
          checklist,
          next_maintenance_date: new Date(scheduleForm.next_maintenance_date).toISOString(),
        }),
      });
      setScheduleForm({
        schedule_name: '', equipment_id: '', equipment_name: '', maintenance_type: 'preventive',
        frequency: 'monthly', next_maintenance_date: '', estimated_duration_hours: 1, cost_per_maintenance: 0, checklist: '',
      });
      setActiveTab('schedules');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogMaintenance = async () => {
    try {
      if (!logForm.title || !logForm.equipment_id) {
        setError('Please fill required fields');
        return;
      }
      await apiFetch(`${API_BASE}/logs`, {
        method: 'POST',
        body: JSON.stringify({
          ...logForm,
          started_at: new Date(logForm.started_at).toISOString(),
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      });
      setLogForm({
        schedule_id: '', equipment_id: '', log_type: 'preventive', title: '', description: '',
        started_at: new Date().toISOString().slice(0, 16), downtime_hours: 0, total_cost: 0,
        root_cause: '', corrective_action: '',
      });
      setActiveTab('logs');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const overdueCount = upcoming.filter(s => s.is_overdue).length;
  const avgAvailability = health.length > 0
    ? Math.round(health.reduce((sum, h) => sum + h.availability_percent, 0) / health.length * 100) / 100
    : 100;
  const totalBreakdowns = health.reduce((sum, h) => sum + h.total_breakdowns, 0);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0a', color: '#fff',
    border: '1px solid #333', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Preventive Maintenance</h1>
          <p style={{ color: '#939393', margin: '4px 0 0' }}>MTBF/MTTR tracking and equipment health monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('log_maintenance')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
              backgroundColor: '#262626', color: '#fff', border: '1px solid #333', borderRadius: '8px',
              fontWeight: 600, cursor: 'pointer', fontSize: '13px',
            }}
          >
            <Wrench size={14} /> Log Maintenance
          </button>
          <button
            onClick={() => setActiveTab('create_schedule')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
              backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: '8px',
              fontWeight: 600, cursor: 'pointer', fontSize: '13px',
            }}
          >
            <Plus size={14} /> New Schedule
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', backgroundColor: '#1a0a0a', border: '1px solid #ef4444',
          borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#ef4444' }}>{error}</span>
          <X size={16} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => setError('')} />
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Active Schedules', value: schedules.filter(s => s.status === 'active').length, icon: Calendar, color: '#3b82f6' },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: overdueCount > 0 ? '#ef4444' : '#939393' },
          { label: 'Avg Availability', value: `${avgAvailability}%`, icon: TrendingUp, color: '#00C971' },
          { label: 'Total Breakdowns', value: totalBreakdowns, icon: Activity, color: '#f59e0b' },
          { label: 'Logs This Month', value: logs.filter(l => new Date(l.started_at) > new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length, icon: CheckCircle, color: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '20px', backgroundColor: '#141414', borderRadius: '12px', border: '1px solid #262626',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#939393', fontSize: '13px' }}>{s.label}</span>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #262626' }}>
        {(['dashboard', 'schedules', 'logs', 'create_schedule', 'log_maintenance'] as const).map(tab => {
          const labels: Record<string, string> = {
            dashboard: 'Equipment Health', schedules: 'Schedules', logs: 'Maintenance Logs',
            create_schedule: 'New Schedule', log_maintenance: 'Log Maintenance',
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px', border: 'none',
                borderBottom: activeTab === tab ? '2px solid #00C971' : '2px solid transparent',
                backgroundColor: 'transparent', color: activeTab === tab ? '#fff' : '#939393',
                cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 400, fontSize: '14px',
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#939393' }}>Loading...</div>
      ) : (
        <>
          {/* Equipment Health Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              {health.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#939393' }}>
                  No equipment data. Create maintenance schedules first.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                  {health.map((h, i) => (
                    <div key={i} style={{
                      padding: '20px', backgroundColor: '#141414', borderRadius: '12px',
                      border: `1px solid ${h.is_overdue ? '#ef4444' : '#262626'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            backgroundColor: healthColors[h.health_status],
                          }} />
                          <span style={{ fontWeight: 700, fontSize: '15px' }}>{h.equipment_name}</span>
                        </div>
                        <span style={{
                          padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: `${healthColors[h.health_status]}20`,
                          color: healthColors[h.health_status],
                        }}>
                          {h.health_status.toUpperCase()}
                        </span>
                      </div>

                      {/* MTBF / MTTR bars */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#0a0a0a', borderRadius: '8px' }}>
                          <div style={{ color: '#939393', fontSize: '11px' }}>MTBF</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#00C971' }}>{h.mtbf_hours}h</div>
                        </div>
                        <div style={{ padding: '10px', backgroundColor: '#0a0a0a', borderRadius: '8px' }}>
                          <div style={{ color: '#939393', fontSize: '11px' }}>MTTR</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{h.mttr_hours}h</div>
                        </div>
                      </div>

                      {/* Availability bar */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#939393', fontSize: '12px' }}>Availability</span>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{h.availability_percent}%</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#262626', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${Math.min(h.availability_percent, 100)}%`,
                            backgroundColor: h.availability_percent >= 95 ? '#00C971' : h.availability_percent >= 85 ? '#f59e0b' : '#ef4444',
                            borderRadius: '3px', transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#939393' }}>
                        <span>Breakdowns: {h.total_breakdowns}</span>
                        <span>
                          Next: {h.is_overdue
                            ? <span style={{ color: '#ef4444' }}>OVERDUE</span>
                            : `${h.days_until_next}d`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Maintenance */}
              {upcoming.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                    Upcoming Maintenance (Next 30 Days)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {upcoming.map((s, i) => (
                      <div key={i} style={{
                        padding: '12px 16px', backgroundColor: '#141414', borderRadius: '8px',
                        border: `1px solid ${s.is_overdue ? '#ef4444' : '#262626'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {s.is_overdue ? <AlertTriangle size={16} color="#ef4444" /> : <Clock size={16} color="#939393" />}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.equipment_name}</div>
                            <div style={{ color: '#939393', fontSize: '12px' }}>{s.schedule_name}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: '13px', fontWeight: 600,
                            color: s.is_overdue ? '#ef4444' : '#fff',
                          }}>
                            {new Date(s.next_maintenance_date).toLocaleDateString()}
                          </div>
                          <div style={{ color: '#939393', fontSize: '11px' }}>
                            {s.estimated_duration_hours}h est.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedules Tab */}
          {activeTab === 'schedules' && (
            <div>
              {schedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#939393' }}>
                  No maintenance schedules. Create one to get started.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #262626' }}>
                        {['Equipment', 'Schedule', 'Type', 'Frequency', 'Next Due', 'MTBF', 'MTTR', 'Status'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#939393', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map(s => {
                        const isOverdue = new Date(s.next_maintenance_date) < new Date();
                        return (
                          <tr key={s._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: 600 }}>{s.equipment_name}</div>
                            </td>
                            <td style={{ padding: '12px', color: '#939393' }}>{s.schedule_name}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
                                backgroundColor: `${typeColors[s.maintenance_type] || '#939393'}20`,
                                color: typeColors[s.maintenance_type] || '#939393',
                              }}>
                                {s.maintenance_type}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: '#939393' }}>{s.frequency}</td>
                            <td style={{ padding: '12px', color: isOverdue ? '#ef4444' : '#fff', fontWeight: isOverdue ? 600 : 400 }}>
                              {new Date(s.next_maintenance_date).toLocaleDateString()}
                              {isOverdue && ' (OVERDUE)'}
                            </td>
                            <td style={{ padding: '12px', color: '#00C971' }}>{s.mtbf_hours ? `${s.mtbf_hours}h` : '-'}</td>
                            <td style={{ padding: '12px', color: '#f59e0b' }}>{s.mttr_hours ? `${s.mttr_hours}h` : '-'}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                                backgroundColor: s.status === 'active' ? '#00C97120' : '#93939320',
                                color: s.status === 'active' ? '#00C971' : '#939393',
                              }}>
                                {s.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#939393' }}>
                  No maintenance logs recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {logs.map(log => (
                    <div key={log._id} style={{
                      padding: '14px 18px', backgroundColor: '#141414', borderRadius: '10px',
                      border: '1px solid #262626', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
                            backgroundColor: `${typeColors[log.log_type] || '#939393'}20`,
                            color: typeColors[log.log_type] || '#939393',
                          }}>
                            {log.log_type}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{log.title}</span>
                        </div>
                        <div style={{ color: '#939393', fontSize: '12px', display: 'flex', gap: '16px' }}>
                          <span>{new Date(log.started_at).toLocaleDateString()}</span>
                          <span>Downtime: {log.downtime_hours}h</span>
                          <span>Cost: ${log.total_cost.toFixed(2)}</span>
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                        backgroundColor: log.status === 'completed' ? '#00C97120' : '#f59e0b20',
                        color: log.status === 'completed' ? '#00C971' : '#f59e0b',
                      }}>
                        {log.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Schedule Form */}
          {activeTab === 'create_schedule' && (
            <div style={{
              maxWidth: '700px', padding: '24px', backgroundColor: '#141414', borderRadius: '12px',
              border: '1px solid #262626',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '20px' }}>
                Create Maintenance Schedule
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Schedule Name *</label>
                  <input value={scheduleForm.schedule_name} onChange={e => setScheduleForm(f => ({ ...f, schedule_name: e.target.value }))} placeholder="e.g. CNC Machine Monthly PM" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Equipment Name *</label>
                    <input value={scheduleForm.equipment_name} onChange={e => setScheduleForm(f => ({ ...f, equipment_name: e.target.value }))} placeholder="Equipment name" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Equipment ID *</label>
                    <input value={scheduleForm.equipment_id} onChange={e => setScheduleForm(f => ({ ...f, equipment_id: e.target.value }))} placeholder="Equipment ObjectId" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Type</label>
                    <select value={scheduleForm.maintenance_type} onChange={e => setScheduleForm(f => ({ ...f, maintenance_type: e.target.value }))} style={inputStyle}>
                      <option value="preventive">Preventive</option>
                      <option value="predictive">Predictive</option>
                      <option value="condition_based">Condition Based</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Frequency</label>
                    <select value={scheduleForm.frequency} onChange={e => setScheduleForm(f => ({ ...f, frequency: e.target.value }))} style={inputStyle}>
                      {['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'usage_based'].map(f => (
                        <option key={f} value={f}>{f.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Next Maintenance Date *</label>
                  <input type="datetime-local" value={scheduleForm.next_maintenance_date} onChange={e => setScheduleForm(f => ({ ...f, next_maintenance_date: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Est. Duration (hours)</label>
                    <input type="number" value={scheduleForm.estimated_duration_hours} onChange={e => setScheduleForm(f => ({ ...f, estimated_duration_hours: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Cost per Maintenance</label>
                    <input type="number" value={scheduleForm.cost_per_maintenance} onChange={e => setScheduleForm(f => ({ ...f, cost_per_maintenance: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Checklist (one task per line, prefix with ! for critical)</label>
                  <textarea value={scheduleForm.checklist} onChange={e => setScheduleForm(f => ({ ...f, checklist: e.target.value }))} rows={4} placeholder={"Check oil levels\n!Inspect safety guards\nClean filters"} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <button onClick={handleCreateSchedule} style={{
                  padding: '12px', backgroundColor: '#00C971', color: '#000', border: 'none',
                  borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', marginTop: '8px',
                }}>
                  Create Schedule
                </button>
              </div>
            </div>
          )}

          {/* Log Maintenance Form */}
          {activeTab === 'log_maintenance' && (
            <div style={{
              maxWidth: '700px', padding: '24px', backgroundColor: '#141414', borderRadius: '12px',
              border: '1px solid #262626',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '20px' }}>
                Log Maintenance Activity
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Title *</label>
                  <input value={logForm.title} onChange={e => setLogForm(f => ({ ...f, title: e.target.value }))} placeholder="Maintenance title" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Equipment ID *</label>
                    <input value={logForm.equipment_id} onChange={e => setLogForm(f => ({ ...f, equipment_id: e.target.value }))} placeholder="Equipment ObjectId" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Log Type</label>
                    <select value={logForm.log_type} onChange={e => setLogForm(f => ({ ...f, log_type: e.target.value }))} style={inputStyle}>
                      <option value="preventive">Preventive</option>
                      <option value="corrective">Corrective</option>
                      <option value="breakdown">Breakdown</option>
                      <option value="inspection">Inspection</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Schedule (optional)</label>
                  <select value={logForm.schedule_id} onChange={e => setLogForm(f => ({ ...f, schedule_id: e.target.value }))} style={inputStyle}>
                    <option value="">None</option>
                    {schedules.map(s => (
                      <option key={s._id} value={s._id}>{s.schedule_name} - {s.equipment_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Description</label>
                  <textarea value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe the maintenance work..." style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Started At</label>
                    <input type="datetime-local" value={logForm.started_at} onChange={e => setLogForm(f => ({ ...f, started_at: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Downtime (hours)</label>
                    <input type="number" value={logForm.downtime_hours} onChange={e => setLogForm(f => ({ ...f, downtime_hours: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Total Cost</label>
                    <input type="number" value={logForm.total_cost} onChange={e => setLogForm(f => ({ ...f, total_cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                  </div>
                </div>
                {(logForm.log_type === 'breakdown' || logForm.log_type === 'corrective') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Root Cause</label>
                      <input value={logForm.root_cause} onChange={e => setLogForm(f => ({ ...f, root_cause: e.target.value }))} placeholder="Root cause analysis" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Corrective Action</label>
                      <input value={logForm.corrective_action} onChange={e => setLogForm(f => ({ ...f, corrective_action: e.target.value }))} placeholder="Actions taken" style={inputStyle} />
                    </div>
                  </div>
                )}
                <button onClick={handleLogMaintenance} style={{
                  padding: '12px', backgroundColor: '#00C971', color: '#000', border: 'none',
                  borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', marginTop: '8px',
                }}>
                  Save Log
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PreventiveMaintenance;
