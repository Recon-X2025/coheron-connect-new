import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Link2,
  Trash2,
  
  Activity,
  ArrowRight,
  Globe,
  Package,
  ShoppingCart,
  Warehouse,
  X,
} from 'lucide-react';

const API_BASE = '/api/sales/ecommerce';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

interface Channel {
  _id: string;
  channel_name: string;
  platform: string;
  store_url: string;
  status: string;
  sync_products: boolean;
  sync_orders: boolean;
  sync_inventory: boolean;
  last_sync_at?: string;
  created_at: string;
}

interface SyncLog {
  _id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  records_failed: number;
  errors: string[];
  started_at: string;
  completed_at?: string;
}


const statusColors: Record<string, string> = {
  active: '#00C971',
  inactive: '#939393',
  error: '#ef4444',
  pending: '#f59e0b',
  running: '#3b82f6',
  completed: '#00C971',
  failed: '#ef4444',
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'active': case 'completed': return <CheckCircle size={14} color={statusColors[status]} />;
    case 'error': case 'failed': return <XCircle size={14} color={statusColors[status]} />;
    case 'pending': return <AlertTriangle size={14} color={statusColors[status]} />;
    case 'running': return <RefreshCw size={14} color={statusColors[status]} className="spin" />;
    default: return <Clock size={14} color="#939393" />;
  }
};

export const ECommerceIntegration: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState({
    channel_name: '', platform: 'shopify', api_key: '', api_secret: '', store_url: '',
    webhook_secret: '', sync_products: true, sync_orders: true, sync_inventory: true,
  });

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/channels');
      setChannels(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncLogs = async (channelId: string) => {
    try {
      const data = await apiFetch(`/channels/${channelId}/sync-logs`);
      setSyncLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadChannels(); }, []);
  useEffect(() => { if (selectedChannel) loadSyncLogs(selectedChannel._id); }, [selectedChannel]);

  const handleCreateChannel = async () => {
    try {
      await apiFetch('/channels', { method: 'POST', body: JSON.stringify(form) });
      setShowWizard(false);
      setWizardStep(0);
      setForm({ channel_name: '', platform: 'shopify', api_key: '', api_secret: '', store_url: '', webhook_secret: '', sync_products: true, sync_orders: true, sync_inventory: true });
      loadChannels();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSync = async (channelId: string, syncType = 'full') => {
    try {
      await apiFetch(`/channels/${channelId}/sync`, { method: 'POST', body: JSON.stringify({ sync_type: syncType }) });
      loadChannels();
      if (selectedChannel?._id === channelId) loadSyncLogs(channelId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm('Delete this channel?')) return;
    try {
      await apiFetch(`/channels/${channelId}`, { method: 'DELETE' });
      if (selectedChannel?._id === channelId) setSelectedChannel(null);
      loadChannels();
    } catch (e) {
      console.error(e);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #333',
    background: '#1a1a1a', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, color: '#939393', marginBottom: 6, fontWeight: 500 };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>eCommerce Integration</h1>
          <p style={{ color: '#939393', margin: '4px 0 0', fontSize: 14 }}>Connect your online stores and sync products, orders, and inventory</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          <Plus size={16} /> Add Channel
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Connected Channels', value: channels.filter(c => c.status === 'active').length, icon: <Link2 size={20} color="#00C971" /> },
          { label: 'Products Synced', value: '-', icon: <Package size={20} color="#3b82f6" /> },
          { label: 'Orders Today', value: '-', icon: <ShoppingCart size={20} color="#f59e0b" /> },
          { label: 'Inventory Alerts', value: '-', icon: <Warehouse size={20} color="#ef4444" /> },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #222' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>{stat.icon}<span style={{ color: '#939393', fontSize: 13 }}>{stat.label}</span></div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Channel List */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Channels</h2>
          {loading ? (
            <div style={{ color: '#939393', padding: 40, textAlign: 'center' }}>Loading...</div>
          ) : channels.length === 0 ? (
            <div style={{ background: '#141414', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #222' }}>
              <Globe size={40} color="#333" />
              <p style={{ color: '#939393', marginTop: 12 }}>No channels connected. Add your first eCommerce channel.</p>
            </div>
          ) : (
            channels.map(channel => (
              <div
                key={channel._id}
                onClick={() => setSelectedChannel(channel)}
                style={{
                  background: selectedChannel?._id === channel._id ? '#1a2a20' : '#141414',
                  borderRadius: 12, padding: 16, marginBottom: 10,
                  border: selectedChannel?._id === channel._id ? '1px solid #00C971' : '1px solid #222',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingBag size={20} color="#00C971" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{channel.channel_name}</div>
                      <div style={{ fontSize: 12, color: '#939393' }}>{channel.platform.charAt(0).toUpperCase() + channel.platform.slice(1)} &middot; {channel.store_url}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusIcon status={channel.status} />
                    <span style={{ fontSize: 12, color: statusColors[channel.status], fontWeight: 600 }}>{channel.status}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#939393' }}>
                  {channel.sync_products && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Package size={12} /> Products</span>}
                  {channel.sync_orders && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ShoppingCart size={12} /> Orders</span>}
                  {channel.sync_inventory && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Warehouse size={12} /> Inventory</span>}
                  {channel.last_sync_at && <span>Last sync: {new Date(channel.last_sync_at).toLocaleString()}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={e => { e.stopPropagation(); handleSync(channel._id); }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={12} /> Sync Now
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(channel._id); }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ef4444', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sync Logs Panel */}
        <div style={{ width: 380 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            {selectedChannel ? `Sync Logs - ${selectedChannel.channel_name}` : 'Sync Logs'}
          </h2>
          {!selectedChannel ? (
            <div style={{ background: '#141414', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #222' }}>
              <Activity size={32} color="#333" />
              <p style={{ color: '#939393', fontSize: 13, marginTop: 8 }}>Select a channel to view sync logs</p>
            </div>
          ) : syncLogs.length === 0 ? (
            <div style={{ background: '#141414', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #222' }}>
              <p style={{ color: '#939393', fontSize: 13 }}>No sync logs yet</p>
            </div>
          ) : (
            syncLogs.map(log => (
              <div key={log._id} style={{ background: '#141414', borderRadius: 10, padding: 14, marginBottom: 8, border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusIcon status={log.status} />
                    <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{log.sync_type}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#939393' }}>{new Date(log.started_at).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#939393' }}>
                  <span style={{ color: '#00C971' }}>{log.records_synced} synced</span>
                  {log.records_failed > 0 && <span style={{ color: '#ef4444' }}>{log.records_failed} failed</span>}
                </div>
                {log.errors.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444' }}>
                    {log.errors.slice(0, 2).map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Channel Setup Wizard Modal */}
      {showWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#141414', borderRadius: 16, padding: 32, width: 520, border: '1px solid #222', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                {wizardStep === 0 ? 'Choose Platform' : wizardStep === 1 ? 'Connection Details' : 'Sync Settings'}
              </h2>
              <button onClick={() => { setShowWizard(false); setWizardStep(0); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#939393" /></button>
            </div>

            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {[0, 1, 2].map(s => (
                <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= wizardStep ? '#00C971' : '#333' }} />
              ))}
            </div>

            {wizardStep === 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(['shopify', 'woocommerce', 'magento', 'custom'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setForm(f => ({ ...f, platform: p })); setWizardStep(1); }}
                    style={{
                      padding: 24, borderRadius: 12,
                      border: form.platform === p ? '2px solid #00C971' : '1px solid #333',
                      background: form.platform === p ? '#0a2a18' : '#1a1a1a',
                      color: '#fff', cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    <ShoppingBag size={28} color="#00C971" />
                    <div style={{ marginTop: 8, fontWeight: 600, fontSize: 15, textTransform: 'capitalize' }}>{p}</div>
                  </button>
                ))}
              </div>
            )}

            {wizardStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Channel Name</label>
                  <input style={inputStyle} value={form.channel_name} onChange={e => setForm(f => ({ ...f, channel_name: e.target.value }))} placeholder="My Store" />
                </div>
                <div>
                  <label style={labelStyle}>Store URL</label>
                  <input style={inputStyle} value={form.store_url} onChange={e => setForm(f => ({ ...f, store_url: e.target.value }))} placeholder="https://mystore.myshopify.com" />
                </div>
                <div>
                  <label style={labelStyle}>API Key</label>
                  <input style={inputStyle} value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} placeholder="API Key" />
                </div>
                <div>
                  <label style={labelStyle}>API Secret</label>
                  <input style={inputStyle} type="password" value={form.api_secret} onChange={e => setForm(f => ({ ...f, api_secret: e.target.value }))} placeholder="API Secret" />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setWizardStep(0)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', cursor: 'pointer' }}>Back</button>
                  <button onClick={() => setWizardStep(2)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(['sync_products', 'sync_orders', 'sync_inventory'] as const).map(key => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', borderRadius: 10, background: '#1a1a1a', border: '1px solid #333' }}>
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: '#00C971' }}
                    />
                    <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{key.replace('sync_', 'Sync ')}</span>
                  </label>
                ))}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button onClick={() => setWizardStep(1)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleCreateChannel} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, cursor: 'pointer' }}>
                    Connect Channel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ECommerceIntegration;
