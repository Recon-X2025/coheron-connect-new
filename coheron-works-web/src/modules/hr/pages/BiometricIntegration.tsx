import { useState, useEffect } from 'react';
import { Fingerprint, Wifi, WifiOff, RefreshCw, Plus, Trash2, Clock, Server, Link } from 'lucide-react';

interface BiometricDevice {
  _id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  port: number;
  serial_number: string;
  location: string;
  status: string;
  protocol: string;
  last_sync_at?: string;
  sync_interval_minutes: number;
  auto_sync: boolean;
}

interface BiometricPunch {
  _id: string;
  employee_id: any;
  device_id: any;
  punch_time: string;
  punch_type: string;
  verification_method: string;
  attendance_linked: boolean;
}

const API_BASE = '/api/hr/biometric';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
});

export const BiometricIntegration = () => {
  const [activeTab, setActiveTab] = useState<'devices' | 'punches'>('devices');
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [punches, setPunches] = useState<BiometricPunch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_type: 'fingerprint' as string,
    ip_address: '',
    port: 4370,
    serial_number: '',
    location: '',
    protocol: 'zkteco' as string,
    sync_interval_minutes: 15,
    auto_sync: true,
  });

  useEffect(() => {
    loadDevices();
    loadPunches();
  }, []);

  const loadDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/devices`, { headers: getHeaders() });
      if (res.ok) setDevices(await res.json());
    } catch (e) { console.error('Failed to load devices', e); }
  };

  const loadPunches = async () => {
    try {
      const res = await fetch(`${API_BASE}/punches?limit=200`, { headers: getHeaders() });
      if (res.ok) setPunches(await res.json());
    } catch (e) { console.error('Failed to load punches', e); }
  };

  const addDevice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/devices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(deviceForm),
      });
      if (res.ok) {
        setShowAddDevice(false);
        setDeviceForm({ device_name: '', device_type: 'fingerprint', ip_address: '', port: 4370, serial_number: '', location: '', protocol: 'zkteco', sync_interval_minutes: 15, auto_sync: true });
        loadDevices();
      }
    } catch (e) { console.error('Failed to add device', e); }
    setLoading(false);
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Delete this device?')) return;
    try {
      await fetch(`${API_BASE}/devices/${id}`, { method: 'DELETE', headers: getHeaders() });
      loadDevices();
    } catch (e) { console.error('Failed to delete device', e); }
  };

  const syncDevice = async (id: string) => {
    setSyncing(id);
    try {
      await fetch(`${API_BASE}/devices/${id}/sync`, { method: 'POST', headers: getHeaders() });
      loadDevices();
    } catch (e) { console.error('Sync failed', e); }
    setSyncing(null);
  };

  const syncAll = async () => {
    setSyncing('all');
    try {
      await fetch(`${API_BASE}/sync-all`, { method: 'POST', headers: getHeaders() });
      loadDevices();
      loadPunches();
    } catch (e) { console.error('Sync all failed', e); }
    setSyncing(null);
  };

  const linkAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/link-attendance`, { method: 'POST', headers: getHeaders() });
      if (res.ok) {
        const result = await res.json();
        alert(`Linked ${result.punches_linked} punches to ${result.attendance_records} attendance records.`);
        loadPunches();
      }
    } catch (e) { console.error('Link attendance failed', e); }
    setLoading(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return '#00C971';
      case 'offline': return '#ef4444';
      case 'maintenance': return '#f59e0b';
      default: return '#939393';
    }
  };

  const tabs = [
    { id: 'devices' as const, label: 'Devices', icon: <Server size={18} /> },
    { id: 'punches' as const, label: 'Punch Logs', icon: <Clock size={18} /> },
  ];

  return (
    <div style={{ padding: '32px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Biometric Integration</h1>
            <p style={{ color: '#939393', margin: '4px 0 0' }}>Manage biometric devices and attendance syncing</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={syncAll} disabled={syncing === 'all'} style={btnSecondary}>
              <RefreshCw size={16} className={syncing === 'all' ? 'spin' : ''} /> Sync All
            </button>
            <button onClick={linkAttendance} disabled={loading} style={btnSecondary}>
              <Link size={16} /> Link Attendance
            </button>
            <button onClick={() => setShowAddDevice(true)} style={btnPrimary}>
              <Plus size={16} /> Add Device
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Devices', value: devices.length, icon: <Server size={20} />, color: '#3b82f6' },
            { label: 'Active', value: devices.filter(d => d.status === 'active').length, icon: <Wifi size={20} />, color: '#00C971' },
            { label: 'Offline', value: devices.filter(d => d.status === 'offline').length, icon: <WifiOff size={20} />, color: '#ef4444' },
            { label: 'Today Punches', value: punches.filter(p => new Date(p.punch_time).toDateString() === new Date().toDateString()).length, icon: <Fingerprint size={20} />, color: '#8b5cf6' },
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
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #262626', paddingBottom: 0 }}>
          {tabs.map((tab, idx) => (
            <button
              key={tab.id || (tab as any)._id || idx}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                background: 'transparent', border: 'none', color: activeTab === tab.id ? '#00C971' : '#939393',
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
                borderBottom: activeTab === tab.id ? '2px solid #00C971' : '2px solid transparent',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #262626' }}>
                  {['Device Name', 'Type', 'IP Address', 'Location', 'Protocol', 'Status', 'Last Sync', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#939393', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No devices configured. Add a biometric device to get started.</td></tr>
                )}
                {devices.map(device => (
                  <tr key={device._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{device.device_name}</td>
                    <td style={cellStyle}><span style={tagStyle}>{device.device_type}</span></td>
                    <td style={cellStyle}>{device.ip_address}:{device.port}</td>
                    <td style={cellStyle}>{device.location || '-'}</td>
                    <td style={cellStyle}><span style={tagStyle}>{device.protocol}</span></td>
                    <td style={cellStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(device.status) }} />
                        {device.status}
                      </span>
                    </td>
                    <td style={cellStyle}>{device.last_sync_at ? new Date(device.last_sync_at).toLocaleString() : 'Never'}</td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => syncDevice(device._id)} disabled={syncing === device._id} style={iconBtn} title="Sync">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={() => deleteDevice(device._id)} style={iconBtn} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Punches Tab */}
        {activeTab === 'punches' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #262626' }}>
                  {['Employee', 'Device', 'Punch Time', 'Type', 'Method', 'Linked'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#939393', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {punches.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No punch records found.</td></tr>
                )}
                {punches.map(punch => (
                  <tr key={punch._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{punch.employee_id?.name || punch.employee_id || '-'}</td>
                    <td style={cellStyle}>{punch.device_id?.device_name || punch.device_id || '-'}</td>
                    <td style={cellStyle}>{new Date(punch.punch_time).toLocaleString()}</td>
                    <td style={cellStyle}><span style={{ ...tagStyle, background: punch.punch_type === 'check_in' ? '#052e16' : '#1c1917', color: punch.punch_type === 'check_in' ? '#00C971' : '#f59e0b' }}>{punch.punch_type.replace('_', ' ')}</span></td>
                    <td style={cellStyle}>{punch.verification_method}</td>
                    <td style={cellStyle}>
                      {punch.attendance_linked
                        ? <span style={{ color: '#00C971' }}>Yes</span>
                        : <span style={{ color: '#939393' }}>No</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Device Dialog */}
        {showAddDevice && (
          <div style={overlayStyle} onClick={() => setShowAddDevice(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Add Biometric Device</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Device Name *</label>
                  <input style={inputStyle} value={deviceForm.device_name} onChange={e => setDeviceForm({ ...deviceForm, device_name: e.target.value })} placeholder="Main Entrance Reader" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Device Type *</label>
                  <select style={inputStyle} value={deviceForm.device_type} onChange={e => setDeviceForm({ ...deviceForm, device_type: e.target.value })}>
                    {['fingerprint', 'face', 'iris', 'card', 'multi'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>IP Address *</label>
                  <input style={inputStyle} value={deviceForm.ip_address} onChange={e => setDeviceForm({ ...deviceForm, ip_address: e.target.value })} placeholder="192.168.1.100" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Port</label>
                  <input style={inputStyle} type="number" value={deviceForm.port} onChange={e => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) || 4370 })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Serial Number *</label>
                  <input style={inputStyle} value={deviceForm.serial_number} onChange={e => setDeviceForm({ ...deviceForm, serial_number: e.target.value })} placeholder="SN-12345" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Location</label>
                  <input style={inputStyle} value={deviceForm.location} onChange={e => setDeviceForm({ ...deviceForm, location: e.target.value })} placeholder="Floor 1, Main Gate" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Protocol</label>
                  <select style={inputStyle} value={deviceForm.protocol} onChange={e => setDeviceForm({ ...deviceForm, protocol: e.target.value })}>
                    {['zkteco', 'hikvision', 'suprema', 'generic_api'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Sync Interval (min)</label>
                  <input style={inputStyle} type="number" value={deviceForm.sync_interval_minutes} onChange={e => setDeviceForm({ ...deviceForm, sync_interval_minutes: parseInt(e.target.value) || 15 })} />
                </div>
                <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 8, gridColumn: 'span 2' }}>
                  <input type="checkbox" checked={deviceForm.auto_sync} onChange={e => setDeviceForm({ ...deviceForm, auto_sync: e.target.checked })} />
                  <label style={{ color: '#939393', fontSize: 14 }}>Enable Auto Sync</label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowAddDevice(false)} style={btnSecondary}>Cancel</button>
                <button onClick={addDevice} disabled={loading || !deviceForm.device_name || !deviceForm.ip_address || !deviceForm.serial_number} style={btnPrimary}>
                  {loading ? 'Adding...' : 'Add Device'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Shared styles
const cellStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#e5e5e5' };
const tagStyle: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, padding: '2px 8px', fontSize: 12 };
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const btnSecondary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const iconBtn: React.CSSProperties = { background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: 6, cursor: 'pointer', color: '#939393' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const dialogStyle: React.CSSProperties = { background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle: React.CSSProperties = { color: '#939393', fontSize: 13, fontWeight: 500 };
const inputStyle: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' };

export default BiometricIntegration;
