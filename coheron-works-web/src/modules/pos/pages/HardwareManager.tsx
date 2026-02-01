import React, { useState, useEffect, FC } from 'react';
import { Monitor, Printer, Scan, DollarSign, CreditCard, Scale, Plus, Wifi, WifiOff, Settings, X, CheckCircle, AlertCircle } from 'lucide-react';

const API = '/api/pos/hardware';
const DEVICE_TYPES = ['terminal', 'receipt_printer', 'barcode_scanner', 'cash_drawer', 'card_reader', 'scale', 'customer_display', 'label_printer'] as const;
const CONN_TYPES = ['usb', 'bluetooth', 'network', 'serial'] as const;
const DRIVERS = ['epson', 'star', 'zebra', 'generic', 'browser'] as const;

const DEVICE_ICONS: Record<string, any> = { terminal: Monitor, receipt_printer: Printer, barcode_scanner: Scan, cash_drawer: DollarSign, card_reader: CreditCard, scale: Scale, customer_display: Monitor, label_printer: Printer };

const sCard: React.CSSProperties = { background: '#141414', borderRadius: 12, border: '1px solid #222', padding: 24 };
const sBtn: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const sBtnSm: React.CSSProperties = { ...sBtn, padding: '6px 14px', fontSize: 13 };
const sInput: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, width: '100%' };

const statusDot = (status: string): React.CSSProperties => ({ width: 10, height: 10, borderRadius: '50%', background: status === 'online' ? '#00C971' : status === 'error' ? '#ef4444' : '#666', display: 'inline-block' });

export const HardwareManager: FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [configDevice, setConfigDevice] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', device_type: 'receipt_printer', connection_type: 'network', ip_address: '', port: 9100, driver: 'epson', config: {} });

  const fetchDevices = () => fetch(API).then(r => r.json()).then(setDevices).catch(() => {});
  useEffect(() => { fetchDevices(); }, []);

  const saveDevice = async () => {
    await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowWizard(false); setWizardStep(0); fetchDevices();
  };

  const testDevice = async (id: string) => {
    setTestResult(null);
    const res = await fetch(`${API}/${id}/test`, { method: 'POST' }).then(r => r.json());
    setTestResult(res);
    fetchDevices();
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Remove this device?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    fetchDevices();
  };

  const printTest = async (id: string) => {
    await fetch(`${API}/print-receipt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: id, receipt_data: { title: 'Test Receipt', lines: ['--- TEST ---', new Date().toLocaleString()] } }) });
    alert('Test receipt sent');
  };

  const openDrawer = async (id: string) => {
    await fetch(`${API}/open-cash-drawer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: id }) });
    alert('Cash drawer opened');
  };

  const saveConfig = async () => {
    await fetch(`${API}/${configDevice.id || configDevice._id}/configure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: configDevice.config }) });
    setConfigDevice(null); fetchDevices();
  };

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}><Monitor size={28} style={{ marginRight: 10, verticalAlign: 'middle', color: '#00C971' }} />Hardware Manager</h1>
        <button style={sBtn} onClick={() => { setForm({ name: '', device_type: 'receipt_printer', connection_type: 'network', ip_address: '', port: 9100, driver: 'epson', config: {} }); setWizardStep(0); setShowWizard(true); }}><Plus size={16} style={{ marginRight: 6 }} />Add Device</button>
      </div>

      {testResult && (
        <div style={{ ...sCard, marginBottom: 16, borderColor: testResult.success ? '#00C971' : '#ef4444', display: 'flex', alignItems: 'center', gap: 12 }}>
          {testResult.success ? <CheckCircle size={20} color="#00C971" /> : <AlertCircle size={20} color="#ef4444" />}
          <span>{testResult.message} {testResult.latency_ms && `(${testResult.latency_ms}ms)`}</span>
          <button onClick={() => setTestResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {devices.map((dev: any) => {
          const Icon = DEVICE_ICONS[dev.device_type] || Monitor;
          return (
            <div key={dev.id || dev._id} style={sCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={20} color="#00C971" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{dev.name}</h3>
                    <span style={{ fontSize: 12, color: '#888' }}>{dev.device_type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={statusDot(dev.status)} />
                  <span style={{ fontSize: 12, color: dev.status === 'online' ? '#00C971' : '#888' }}>{dev.status}</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 4 }}>
                {dev.connection_type === 'network' ? <><Wifi size={12} /> {dev.ip_address}:{dev.port}</> : <><WifiOff size={12} /> {dev.connection_type}</>}
                {dev.driver && <span> | {dev.driver}</span>}
              </div>
              {dev.last_seen_at && <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>Last seen: {new Date(dev.last_seen_at).toLocaleString()}</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={sBtnSm} onClick={() => testDevice(dev.id || dev._id)}>Test</button>
                {['receipt_printer', 'label_printer'].includes(dev.device_type) && <button style={{ ...sBtnSm, background: '#3b82f6' }} onClick={() => printTest(dev.id || dev._id)}>Print Test</button>}
                {dev.device_type === 'cash_drawer' && <button style={{ ...sBtnSm, background: '#f59e0b', color: '#000' }} onClick={() => openDrawer(dev.id || dev._id)}>Open Drawer</button>}
                <button style={{ ...sBtnSm, background: '#333', color: '#fff' }} onClick={() => setConfigDevice({ ...dev })}><Settings size={14} /></button>
                <button style={{ ...sBtnSm, background: '#ef4444' }} onClick={() => deleteDevice(dev.id || dev._id)}><X size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {showWizard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...sCard, width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Add Device - Step {wizardStep + 1}/3</h3>
              <button onClick={() => setShowWizard(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {wizardStep === 0 && (
              <div>
                <p style={{ color: '#888', marginBottom: 16 }}>Select device type:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {DEVICE_TYPES.map(dt => {
                    const Icon = DEVICE_ICONS[dt] || Monitor;
                    return (
                      <button key={dt} onClick={() => { setForm({ ...form, device_type: dt }); setWizardStep(1); }}
                        style={{ ...sCard, cursor: 'pointer', textAlign: 'center', padding: 16, border: form.device_type === dt ? '2px solid #00C971' : '1px solid #333' }}>
                        <Icon size={24} color="#00C971" /><div style={{ fontSize: 13, marginTop: 6 }}>{dt.replace(/_/g, ' ')}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {wizardStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input style={sInput} placeholder="Device Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <select style={sInput} value={form.connection_type} onChange={e => setForm({ ...form, connection_type: e.target.value })}>
                  {CONN_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {form.connection_type === 'network' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                    <input style={sInput} placeholder="IP Address" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} />
                    <input style={sInput} type="number" placeholder="Port" value={form.port} onChange={e => setForm({ ...form, port: parseInt(e.target.value) })} />
                  </div>
                )}
                <select style={sInput} value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })}>
                  {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ ...sBtnSm, background: '#333', color: '#fff' }} onClick={() => setWizardStep(0)}>Back</button>
                  <button style={sBtnSm} onClick={() => setWizardStep(2)}>Next</button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: '#888' }}>Review and add device:</p>
                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16 }}>
                  <div><strong>Name:</strong> {form.name || '(unnamed)'}</div>
                  <div><strong>Type:</strong> {form.device_type}</div>
                  <div><strong>Connection:</strong> {form.connection_type}{form.connection_type === 'network' ? ` (${form.ip_address}:${form.port})` : ''}</div>
                  <div><strong>Driver:</strong> {form.driver}</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ ...sBtnSm, background: '#333', color: '#fff' }} onClick={() => setWizardStep(1)}>Back</button>
                  <button style={sBtn} onClick={saveDevice}>Add Device</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {configDevice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...sCard, width: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Configure: {configDevice.name}</h3>
              <button onClick={() => setConfigDevice(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {configDevice.device_type?.includes('printer') && (
                <>
                  <div><label style={{ fontSize: 12, color: '#888' }}>Paper Width (mm)</label><input style={sInput} type="number" value={configDevice.config?.paper_width || 80} onChange={e => setConfigDevice({ ...configDevice, config: { ...configDevice.config, paper_width: parseInt(e.target.value) } })} /></div>
                  <div><label style={{ fontSize: 12, color: '#888' }}>Print Copies</label><input style={sInput} type="number" value={configDevice.config?.print_copies || 1} onChange={e => setConfigDevice({ ...configDevice, config: { ...configDevice.config, print_copies: parseInt(e.target.value) } })} /></div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ccc', fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={configDevice.config?.auto_cut !== false} onChange={e => setConfigDevice({ ...configDevice, config: { ...configDevice.config, auto_cut: e.target.checked } })} />Auto Cut
                  </label>
                </>
              )}
              <button style={sBtn} onClick={saveConfig}>Save Configuration</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HardwareManager;
