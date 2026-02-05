import { useState, useEffect } from 'react';
import {
  Store, Search, Download, Trash2, Star, CheckCircle, 
} from 'lucide-react';

const TOKEN = localStorage.getItem('authToken') || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
const apiFetch = (url: string, opts?: any) => fetch(url, { headers, ...opts });

interface App { _id: string; name: string; slug: string; description: string; long_description: string; category: string; developer_name: string; version: string; icon_url: string; pricing_type: string; price: number; currency: string; features: string[]; install_count: number; rating: number; rating_count: number; status: string; is_verified: boolean; }
interface Installation { _id: string; app_id: any; installed_by: any; status: string; config: any; installed_at: string; version_installed: string; }
interface CategoryCount { category: string; count: number; }

type Tab = 'browse' | 'installed' | 'featured';


export const Marketplace: React.FC = () => {
  const [tab, setTab] = useState<Tab>('browse');
  const [apps, setApps] = useState<App[]>([]);
  const [featured, setFeatured] = useState<App[]>([]);
  const [installed, setInstalled] = useState<Installation[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => { loadApps(); loadCategories(); loadInstalled(); }, []);

  const loadApps = async (category?: string, search?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category || filterCat) params.set('category', category || filterCat);
    if (search || searchQ) params.set('search', search || searchQ);
    params.set('limit', '50');
    try {
      const res = await apiFetch(`/api/marketplace/apps?${params}`);
      if (res.ok) { const d = await res.json(); setApps(d.apps || []); }
    } catch {}
    setLoading(false);
  };

  const loadCategories = async () => {
    try { const res = await apiFetch('/api/marketplace/categories'); if (res.ok) setCategories(await res.json()); } catch {}
  };

  const loadInstalled = async () => {
    try { const res = await apiFetch('/api/marketplace/installed'); if (res.ok) setInstalled(await res.json()); } catch {}
  };

  const loadFeatured = async () => {
    setLoading(true);
    try { const res = await apiFetch('/api/marketplace/featured'); if (res.ok) setFeatured(await res.json()); } catch {}
    setLoading(false);
  };

  const installApp = async (appId: string) => {
    setInstalling(appId);
    try {
      const res = await apiFetch(`/api/marketplace/install/${appId}`, { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) loadInstalled();
    } catch {}
    setInstalling(null);
  };

  const uninstallApp = async (appId: string) => {
    try {
      await apiFetch(`/api/marketplace/uninstall/${appId}`, { method: 'DELETE' });
      loadInstalled();
    } catch {}
  };

  const isInstalled = (appId: string) => installed.some(i => (i.app_id?._id || i.app_id) === appId);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === 'featured') loadFeatured();
    else if (t === 'installed') loadInstalled();
  };

  const S = {
    page: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: 24 } as React.CSSProperties,
    card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 16, marginBottom: 12 } as React.CSSProperties,
    input: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%' } as React.CSSProperties,
    select: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none' } as React.CSSProperties,
    btn: { background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnPrimary: { background: '#00C971', border: '1px solid #00C971', color: '#000', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnDanger: { background: '#1e1e1e', border: '1px solid #f44336', color: '#f44336', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    tab: (active: boolean) => ({ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, background: active ? '#00C971' : '#1e1e1e', color: active ? '#000' : '#fff', border: active ? '1px solid #00C971' : '1px solid #333' }) as React.CSSProperties,
    badge: (color: string) => ({ background: color + '22', color, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }) as React.CSSProperties,
    appGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 } as React.CSSProperties,
  };

  const pricingColor: Record<string, string> = { free: '#00C971', paid: '#ff9800', freemium: '#2196f3' };

  const renderAppCard = (app: App) => (
    <div key={app._id} style={{ ...S.card, cursor: 'pointer' }} onClick={() => setSelectedApp(app)}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {app.icon_url ? <img src={app.icon_url} alt="" style={{ width: 32, height: 32 }} /> : <Store size={24} style={{ color: '#00C971' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{app.name}</span>
            {app.is_verified && <CheckCircle size={14} style={{ color: '#00C971' }} />}
          </div>
          <div style={{ fontSize: 12, color: '#939393' }}>{app.developer_name} - v{app.version}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: '#ccc', marginBottom: 12, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {app.description}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={S.badge(pricingColor[app.pricing_type] || '#666')}>{app.pricing_type}{app.pricing_type === 'paid' ? ` $${app.price}` : ''}</span>
          <span style={{ fontSize: 11, color: '#939393' }}>{app.category}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Star size={12} style={{ color: '#ff9800' }} /> {app.rating.toFixed(1)}</span>
          <span style={{ color: '#666' }}>{app.install_count} installs</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Store size={24} /> Marketplace
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={S.tab(tab === 'browse')} onClick={() => switchTab('browse')}>Browse Apps</button>
        <button style={S.tab(tab === 'featured')} onClick={() => switchTab('featured')}>Featured</button>
        <button style={S.tab(tab === 'installed')} onClick={() => switchTab('installed')}>Installed ({installed.length})</button>
      </div>

      {/* Category pills */}
      {tab === 'browse' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button style={{ ...S.btn, ...(filterCat === '' ? { background: '#00C971', color: '#000', borderColor: '#00C971' } : {}) }} onClick={() => { setFilterCat(''); loadApps(''); }}>All</button>
            {categories.map(c => (
              <button key={c.category} style={{ ...S.btn, ...(filterCat === c.category ? { background: '#00C971', color: '#000', borderColor: '#00C971' } : {}) }}
                onClick={() => { setFilterCat(c.category); loadApps(c.category); }}>
                {c.category} ({c.count})
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input style={{ ...S.input, width: 300 }} placeholder="Search apps..." value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadApps()} />
            <button style={S.btn} onClick={() => loadApps()}><Search size={14} /></button>
          </div>
        </>
      )}

      {loading && <div style={{ textAlign: 'center', color: '#939393', padding: 40 }}>Loading...</div>}

      {/* App Detail Modal */}
      {selectedApp && (
        <div style={{ ...S.card, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 12, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Store size={32} style={{ color: '#00C971' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {selectedApp.name} {selectedApp.is_verified && <CheckCircle size={16} style={{ color: '#00C971' }} />}
                </h2>
                <div style={{ fontSize: 13, color: '#939393' }}>{selectedApp.developer_name} - v{selectedApp.version}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <span style={S.badge(pricingColor[selectedApp.pricing_type] || '#666')}>{selectedApp.pricing_type}{selectedApp.pricing_type === 'paid' ? ` $${selectedApp.price}` : ''}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}><Star size={12} style={{ color: '#ff9800' }} /> {selectedApp.rating.toFixed(1)} ({selectedApp.rating_count})</span>
                  <span style={{ fontSize: 12, color: '#666' }}><Download size={12} /> {selectedApp.install_count}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isInstalled(selectedApp._id)
                ? <button style={S.btnDanger} onClick={() => uninstallApp(selectedApp._id)}><Trash2 size={14} /> Uninstall</button>
                : <button style={S.btnPrimary} onClick={() => installApp(selectedApp._id)} disabled={installing === selectedApp._id}>
                    <Download size={14} /> {installing === selectedApp._id ? 'Installing...' : 'Install'}
                  </button>
              }
              <button style={S.btn} onClick={() => setSelectedApp(null)}>Close</button>
            </div>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#ccc', marginBottom: 16 }}>
            {selectedApp.long_description || selectedApp.description}
          </div>
          {selectedApp.features?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Features</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedApp.features.map((f, i) => <span key={i} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>{f}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Browse Grid */}
      {tab === 'browse' && !loading && (
        <div style={S.appGrid}>
          {apps.map(renderAppCard)}
          {apps.length === 0 && <div style={{ color: '#666', padding: 40 }}>No apps found</div>}
        </div>
      )}

      {/* Featured */}
      {tab === 'featured' && !loading && (
        <div style={S.appGrid}>
          {featured.map(renderAppCard)}
          {featured.length === 0 && <div style={{ color: '#666', padding: 40 }}>No featured apps</div>}
        </div>
      )}

      {/* Installed */}
      {tab === 'installed' && !loading && (
        <div>
          {installed.length === 0 && <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>No apps installed yet. Browse the marketplace to get started.</div>}
          {installed.map(inst => {
            const app = inst.app_id;
            return (
              <div key={inst._id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Store size={20} style={{ color: '#00C971' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{app?.name || 'Unknown App'}</div>
                    <div style={{ fontSize: 12, color: '#939393' }}>v{inst.version_installed} - Installed {new Date(inst.installed_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={S.btnDanger} onClick={() => uninstallApp(app?._id || inst.app_id)}>
                    <Trash2 size={14} /> Uninstall
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
