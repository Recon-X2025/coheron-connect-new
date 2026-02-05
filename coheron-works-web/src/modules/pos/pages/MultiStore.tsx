import { useState, useEffect } from 'react';
import { Store, Plus, MapPin, Settings, BarChart3, Clock } from 'lucide-react';

const API_BASE = '/api/pos/stores';
const getToken = () => localStorage.getItem('authToken') || '';
let _csrf: string | null = null;
const getCsrf = async () => { if (_csrf) return _csrf; try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { _csrf = (await r.json()).token; } } catch {} return _csrf; };
const apiFetch = async (path: string, options?: RequestInit) => {
  const method = (options?.method || 'GET').toUpperCase();
  const hdrs: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...((options?.headers as any) || {}) };
  if (!['GET','HEAD','OPTIONS'].includes(method)) { const c = await getCsrf(); if (c) hdrs['x-csrf-token'] = c; }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: hdrs, credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export const MultiStore: React.FC = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showConfig, setShowConfig] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', phone: '', email: '', timezone: 'UTC', address: { street: '', city: '', state: '', postal_code: '', country: '' } });

  const load = async () => {
    try {
      const data = await apiFetch('?limit=50');
      setStores(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try { await apiFetch('', { method: 'POST', body: JSON.stringify(form) }); setShowModal(false); load(); } catch (e) { console.error(e); }
  };

  const viewConfig = async (store: any) => {
    setShowConfig(store);
    try { const c = await apiFetch(`/${store._id}/config`); setConfig(c); } catch { setConfig(null); }
  };

  const cardStyle = { background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #222' };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Store size={28} color="#00C971" /> Multi-Store Management
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>Manage all your store locations and configurations</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={18} /> Add Store
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Stores', value: total, icon: <Store size={20} color="#00C971" /> },
          { label: 'Active', value: stores.filter(s => s.is_active).length, icon: <MapPin size={20} color="#00C971" /> },
          { label: 'Inactive', value: stores.filter(s => !s.is_active).length, icon: <Clock size={20} color="#888" /> },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#888', fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              </div>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Store cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {stores.map((store: any) => (
          <div key={store._id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{store.name}</h3>
                <span style={{ color: '#888', fontSize: 13 }}>Code: {store.code}</span>
              </div>
              <span style={{ background: store.is_active ? '#00C97122' : '#66666622', color: store.is_active ? '#00C971' : '#666', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {store.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {store.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: '#aaa', fontSize: 13, marginBottom: 8 }}>
                <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{[store.address.street, store.address.city, store.address.state, store.address.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#888', marginBottom: 12 }}>
              {store.phone && <span>{store.phone}</span>}
              {store.email && <span>{store.email}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#666', marginBottom: 14 }}>
              <Clock size={13} /> {store.timezone}
              {store.manager_id?.name && <span> | Manager: {store.manager_id.name}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => viewConfig(store)} style={{ flex: 1, padding: '8px', background: '#222', border: 'none', borderRadius: 6, color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Settings size={14} /> Config
              </button>
              <button style={{ flex: 1, padding: '8px', background: '#222', border: 'none', borderRadius: 6, color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <BarChart3 size={14} /> Performance
              </button>
            </div>
          </div>
        ))}
        {stores.length === 0 && <div style={{ gridColumn: '1 / -1', color: '#666', padding: 40, textAlign: 'center' }}>No stores yet</div>}
      </div>

      {/* Config sidebar */}
      {showConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div style={{ background: '#141414', width: 420, height: '100vh', padding: 24, overflowY: 'auto', borderLeft: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Config: {showConfig.name}</h2>
              <button onClick={() => setShowConfig(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>X</button>
            </div>
            {config ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Receipt Header</div>
                  <div style={{ background: '#0a0a0a', borderRadius: 6, padding: 10, color: '#aaa', fontSize: 13 }}>{config.receipt_header || 'Not set'}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Tax Config</div>
                  <div style={{ background: '#0a0a0a', borderRadius: 6, padding: 10, color: '#aaa', fontSize: 13 }}>
                    Inclusive: {config.tax_config?.tax_inclusive ? 'Yes' : 'No'} | Rate: {config.tax_config?.default_tax_rate}%
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>POS Settings</div>
                  <div style={{ background: '#0a0a0a', borderRadius: 6, padding: 10, color: '#aaa', fontSize: 13 }}>
                    Discounts: {config.pos_settings?.allow_discount ? 'Yes' : 'No'} | Max: {config.pos_settings?.max_discount_pct}% | Require Customer: {config.pos_settings?.require_customer ? 'Yes' : 'No'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Payment Methods</div>
                  {(config.payment_methods || []).map((pm: any, i: number) => (
                    <div key={i} style={{ background: '#0a0a0a', borderRadius: 6, padding: 8, marginBottom: 6, color: '#aaa', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{pm.type}</span>
                      <span style={{ color: pm.enabled ? '#00C971' : '#666' }}>{pm.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#666' }}>No configuration found. Configure this store to get started.</p>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#141414', borderRadius: 12, padding: 24, width: 480, border: '1px solid #333', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600 }}>Add Store</h2>
            {[
              { label: 'Store Name', key: 'name' },
              { label: 'Code', key: 'code' },
              { label: 'Phone', key: 'phone' },
              { label: 'Email', key: 'email' },
              { label: 'Timezone', key: 'timezone' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, color: '#aaa', fontSize: 13 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={{ width: '100%', padding: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, color: '#fff' }} />
              </div>
            ))}
            <div style={{ color: '#888', fontSize: 13, marginBottom: 8, marginTop: 10 }}>Address</div>
            {['street', 'city', 'state', 'postal_code', 'country'].map(f => (
              <div key={f} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 12, textTransform: 'capitalize' }}>{f.replace('_', ' ')}</label>
                <input value={(form.address as any)[f]} onChange={e => setForm({ ...form, address: { ...form.address, [f]: e.target.value } })} style={{ width: '100%', padding: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, color: '#fff' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', background: '#333', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} style={{ padding: '8px 18px', background: '#00C971', border: 'none', borderRadius: 6, color: '#000', fontWeight: 600, cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiStore;
