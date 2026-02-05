import { useState, useEffect } from 'react';
import {
  Server, Plus, Search, AlertTriangle, X, GitBranch, 
} from 'lucide-react';

const getToken = () => localStorage.getItem('authToken') || '';
let _csrf: string | null = null;
const getCsrf = async () => { if (_csrf) return _csrf; try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { _csrf = (await r.json()).token; } } catch {} return _csrf; };
const apiFetch = async (url: string, options?: RequestInit) => {
  const method = (options?.method || 'GET').toUpperCase();
  const hdrs: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...((options?.headers as any) || {}) };
  if (!['GET','HEAD','OPTIONS'].includes(method)) { const c = await getCsrf(); if (c) hdrs['x-csrf-token'] = c; }
  const res = await fetch(url, { ...options, headers: hdrs, credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

interface CI { _id: string; name: string; ci_type: string; status: string; environment: string; owner_id?: any; department: string; location: string; ip_address: string; serial_number: string; manufacturer: string; model: string; purchase_date?: string; warranty_expiry?: string; criticality: string; tags: string[]; attributes: any; }
interface Relationship { _id: string; source_ci_id: any; target_ci_id: any; relationship_type: string; description: string; is_active: boolean; }
interface TypeCount { type: string; count: number; }

type Tab = 'items' | 'topology' | 'impact' | 'warranty';

const CI_TYPES = ['server', 'network', 'application', 'database', 'storage', 'workstation', 'mobile', 'cloud_service', 'other'];
const STATUSES = ['active', 'inactive', 'maintenance', 'retired', 'planned'];
const ENVIRONMENTS = ['production', 'staging', 'development', 'testing'];
const CRITICALITIES = ['critical', 'high', 'medium', 'low'];
const REL_TYPES = ['depends_on', 'supports', 'connects_to', 'runs_on', 'part_of', 'managed_by'];

const criticalityColor: Record<string, string> = { critical: '#f44336', high: '#ff9800', medium: '#2196f3', low: '#4caf50' };
const statusColor: Record<string, string> = { active: '#00C971', inactive: '#666', maintenance: '#ff9800', retired: '#f44336', planned: '#2196f3' };

export const CMDB: React.FC = () => {
  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<CI[]>([]);
  const [typeCounts, setTypeCounts] = useState<TypeCount[]>([]);
  const [warrantyItems, setWarrantyItems] = useState<CI[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [impactResult, setImpactResult] = useState<any>(null);
  const [impactCiId, setImpactCiId] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showRelForm, setShowRelForm] = useState(false);
  const [form, setForm] = useState<Partial<CI>>({ ci_type: 'server', status: 'active', environment: 'production', criticality: 'medium' });
  const [relForm, setRelForm] = useState({ source_ci_id: '', target_ci_id: '', relationship_type: 'depends_on', description: '' });
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { loadItems(); loadTypeCounts(); }, [filterType, filterStatus]);

  const loadItems = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('ci_type', filterType);
    if (filterStatus) params.set('status', filterStatus);
    if (searchQ) params.set('search', searchQ);
    params.set('limit', '50');
    try {
      const res = await apiFetch(`/api/support/cmdb?${params}`);
      if (res.ok) { const d = await res.json(); setItems(d.items || []); setTotal(d.total || 0); }
    } catch {}
    setLoading(false);
  };

  const loadTypeCounts = async () => {
    try { const res = await apiFetch('/api/support/cmdb/by-type'); if (res.ok) setTypeCounts(await res.json()); } catch {}
  };

  const loadTopology = async () => {
    setLoading(true);
    try { const res = await apiFetch('/api/support/cmdb/topology'); if (res.ok) { const d = await res.json(); setItems(d.nodes || []); setRelationships(d.edges || []); } } catch {}
    setLoading(false);
  };

  const loadWarranty = async () => {
    setLoading(true);
    try { const res = await apiFetch('/api/support/cmdb/warranty-expiring?days=90'); if (res.ok) setWarrantyItems(await res.json()); } catch {}
    setLoading(false);
  };

  const runImpactAnalysis = async () => {
    if (!impactCiId) return;
    setLoading(true);
    try { const res = await apiFetch(`/api/support/cmdb/impact-analysis/${impactCiId}`); if (res.ok) setImpactResult(await res.json()); } catch {}
    setLoading(false);
  };

  const saveCI = async () => {
    try {
      const url = editId ? `/api/support/cmdb/${editId}` : '/api/support/cmdb';
      const method = editId ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(form) });
      if (res.ok) { setShowForm(false); setEditId(null); setForm({ ci_type: 'server', status: 'active', environment: 'production', criticality: 'medium' }); loadItems(); loadTypeCounts(); }
    } catch {}
  };

  const deleteCI = async (id: string) => {
    try { await apiFetch(`/api/support/cmdb/${id}`, { method: 'DELETE' }); loadItems(); loadTypeCounts(); } catch {}
  };

  const saveRelationship = async () => {
    try {
      const res = await apiFetch('/api/support/cmdb/relationships', { method: 'POST', body: JSON.stringify(relForm) });
      if (res.ok) { setShowRelForm(false); setRelForm({ source_ci_id: '', target_ci_id: '', relationship_type: 'depends_on', description: '' }); if (tab === 'topology') loadTopology(); }
    } catch {}
  };

  const editCI = (ci: CI) => { setForm(ci); setEditId(ci._id); setShowForm(true); };

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === 'topology') loadTopology();
    else if (t === 'warranty') loadWarranty();
    else if (t === 'items') loadItems();
  };

  const S = {
    page: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: 24 } as React.CSSProperties,
    card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 16, marginBottom: 12 } as React.CSSProperties,
    input: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%' } as React.CSSProperties,
    select: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none' } as React.CSSProperties,
    btn: { background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnPrimary: { background: '#00C971', border: '1px solid #00C971', color: '#000', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    tab: (active: boolean) => ({ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, background: active ? '#00C971' : '#1e1e1e', color: active ? '#000' : '#fff', border: active ? '1px solid #00C971' : '1px solid #333' }) as React.CSSProperties,
    badge: (color: string) => ({ background: color + '22', color, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }) as React.CSSProperties,
    th: { textAlign: 'left' as const, padding: '8px 12px', fontSize: 12, color: '#939393', borderBottom: '1px solid #222' },
    td: { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #1a1a1a' },
  };

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={24} /> CMDB
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btnPrimary} onClick={() => { setShowForm(true); setEditId(null); }}><Plus size={14} /> Add CI</button>
          <button style={S.btn} onClick={() => setShowRelForm(true)}><GitBranch size={14} /> Add Relationship</button>
        </div>
      </div>

      {/* Type counts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {typeCounts.map(tc => (
          <div key={tc.type} style={{ background: '#1a1a1a', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>{tc.count}</span> <span style={{ color: '#939393' }}>{tc.type}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['items', 'topology', 'impact', 'warranty'] as Tab[]).map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => switchTab(t)}>
            {t === 'items' ? 'All Items' : t === 'topology' ? 'Topology' : t === 'impact' ? 'Impact Analysis' : 'Warranty Expiring'}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === 'items' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input style={{ ...S.input, width: 200 }} placeholder="Search..." value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadItems()} />
          <select style={S.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {CI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={S.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button style={S.btn} onClick={loadItems}><Search size={14} /></button>
        </div>
      )}

      {/* CI Form */}
      {showForm && (
        <div style={{ ...S.card, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>{editId ? 'Edit' : 'New'} Configuration Item</h3>
            <button style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }} onClick={() => { setShowForm(false); setEditId(null); }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input style={S.input} placeholder="Name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select style={{ ...S.select, width: '100%' }} value={form.ci_type} onChange={e => setForm({ ...form, ci_type: e.target.value })}>
              {CI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={{ ...S.select, width: '100%' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={{ ...S.select, width: '100%' }} value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value })}>
              {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select style={{ ...S.select, width: '100%' }} value={form.criticality} onChange={e => setForm({ ...form, criticality: e.target.value })}>
              {CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={S.input} placeholder="IP Address" value={form.ip_address || ''} onChange={e => setForm({ ...form, ip_address: e.target.value })} />
            <input style={S.input} placeholder="Serial Number" value={form.serial_number || ''} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
            <input style={S.input} placeholder="Manufacturer" value={form.manufacturer || ''} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
            <input style={S.input} placeholder="Model" value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} />
            <input style={S.input} placeholder="Department" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} />
            <input style={S.input} placeholder="Location" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} />
            <input style={S.input} type="date" placeholder="Warranty Expiry" value={form.warranty_expiry?.split('T')[0] || ''} onChange={e => setForm({ ...form, warranty_expiry: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnPrimary} onClick={saveCI}>{editId ? 'Update' : 'Create'}</button>
            <button style={S.btn} onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Relationship Form */}
      {showRelForm && (
        <div style={{ ...S.card, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>New Relationship</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <select style={{ ...S.select, width: '100%' }} value={relForm.source_ci_id} onChange={e => setRelForm({ ...relForm, source_ci_id: e.target.value })}>
              <option value="">Source CI...</option>
              {items.map(ci => <option key={ci._id} value={ci._id}>{ci.name}</option>)}
            </select>
            <select style={{ ...S.select, width: '100%' }} value={relForm.relationship_type} onChange={e => setRelForm({ ...relForm, relationship_type: e.target.value })}>
              {REL_TYPES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
            <select style={{ ...S.select, width: '100%' }} value={relForm.target_ci_id} onChange={e => setRelForm({ ...relForm, target_ci_id: e.target.value })}>
              <option value="">Target CI...</option>
              {items.map(ci => <option key={ci._id} value={ci._id}>{ci.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnPrimary} onClick={saveRelationship}>Create</button>
            <button style={S.btn} onClick={() => setShowRelForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', color: '#939393', padding: 40 }}>Loading...</div>}

      {/* Items Table */}
      {tab === 'items' && !loading && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Name</th><th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Environment</th><th style={S.th}>Criticality</th><th style={S.th}>IP</th><th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {items.map(ci => (
                <tr key={ci._id}>
                  <td style={S.td}><span style={{ fontWeight: 600 }}>{ci.name}</span></td>
                  <td style={S.td}>{ci.ci_type}</td>
                  <td style={S.td}><span style={S.badge(statusColor[ci.status] || '#666')}>{ci.status}</span></td>
                  <td style={S.td}>{ci.environment}</td>
                  <td style={S.td}><span style={S.badge(criticalityColor[ci.criticality] || '#666')}>{ci.criticality}</span></td>
                  <td style={S.td}>{ci.ip_address}</td>
                  <td style={S.td}>
                    <button style={{ ...S.btn, padding: '4px 8px', fontSize: 11, marginRight: 4 }} onClick={() => editCI(ci)}>Edit</button>
                    <button style={{ ...S.btn, padding: '4px 8px', fontSize: 11, color: '#f44336' }} onClick={() => deleteCI(ci._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>{total} total items</div>
        </div>
      )}

      {/* Topology */}
      {tab === 'topology' && !loading && (
        <div>
          <div style={{ fontSize: 13, color: '#939393', marginBottom: 12 }}>{items.length} nodes, {relationships.length} edges</div>
          {relationships.map(r => (
            <div key={r._id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>{r.source_ci_id?.name || r.source_ci_id}</span>
              <span style={{ color: '#00C971', fontSize: 12 }}>--{r.relationship_type.replace(/_/g, ' ')}--&gt;</span>
              <span style={{ fontWeight: 600 }}>{r.target_ci_id?.name || r.target_ci_id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Impact Analysis */}
      {tab === 'impact' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select style={{ ...S.select, width: 300 }} value={impactCiId} onChange={e => setImpactCiId(e.target.value)}>
              <option value="">Select a CI for impact analysis...</option>
              {items.map(ci => <option key={ci._id} value={ci._id}>{ci.name} ({ci.ci_type})</option>)}
            </select>
            <button style={S.btnPrimary} onClick={runImpactAnalysis}><AlertTriangle size={14} /> Analyze</button>
          </div>
          {impactResult && (
            <div>
              <div style={S.card}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Source: {impactResult.ci?.name}</div>
                <div style={{ fontSize: 13, color: '#ff9800' }}>Total impacted: {impactResult.total_impacted} items</div>
              </div>
              {impactResult.impacted?.map((ci: any, i: number) => (
                <div key={i} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{ci.name}</span>
                    <span style={{ color: '#939393', fontSize: 12, marginLeft: 8 }}>{ci.ci_type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={S.badge(criticalityColor[ci.criticality] || '#666')}>{ci.criticality}</span>
                    <span style={S.badge(statusColor[ci.status] || '#666')}>{ci.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warranty */}
      {tab === 'warranty' && !loading && (
        <div>
          <div style={{ fontSize: 13, color: '#939393', marginBottom: 12 }}>Items with warranty expiring within 90 days</div>
          {warrantyItems.length === 0 && <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>No items with expiring warranty</div>}
          {warrantyItems.map(ci => (
            <div key={ci._id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600 }}>{ci.name}</span>
                <span style={{ color: '#939393', fontSize: 12, marginLeft: 8 }}>{ci.ci_type} - {ci.manufacturer} {ci.model}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#ff9800', fontSize: 12 }}>Expires: {ci.warranty_expiry ? new Date(ci.warranty_expiry).toLocaleDateString() : 'N/A'}</span>
                <span style={S.badge(criticalityColor[ci.criticality] || '#666')}>{ci.criticality}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CMDB;
