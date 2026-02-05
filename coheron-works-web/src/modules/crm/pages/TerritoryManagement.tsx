import { useState, useEffect } from 'react';
import { MapPin, Plus, Users, Trash2, Edit, Search } from 'lucide-react';

const API_BASE = '/api/crm/territories';
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

export const TerritoryManagement: React.FC = () => {
  const [territories, setTerritories] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');

  const loadTerritories = async () => {
    setLoading(true);
    try { setTerritories(await apiFetch('/')); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadDetail = async (id: string) => {
    try { setSelected(await apiFetch(`/${id}`)); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadTerritories(); }, []);

  const handleSave = async () => {
    try {
      if (selected?._id && showModal) {
        await apiFetch(`/${selected._id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowModal(false);
      setForm({ name: '', description: '', is_active: true });
      await loadTerritories();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this territory?')) return;
    await apiFetch(`/${id}`, { method: 'DELETE' });
    setSelected(null);
    await loadTerritories();
  };

  const handleAssign = async () => {
    if (!selected?._id || !assignUserId) return;
    await apiFetch(`/${selected._id}/assign-user`, { method: 'POST', body: JSON.stringify({ user_id: assignUserId }) });
    setAssignUserId('');
    await loadDetail(selected._id);
  };

  const filtered = territories.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MapPin size={28} color="#f59e0b" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Territory Management</h1>
        </div>
        <button onClick={() => { setForm({ name: '', description: '', is_active: true }); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          <Plus size={16} /> New Territory
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* Left: List */}
        <div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', padding: '10px 10px 10px 36px', background: '#1a1a2e', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          {loading ? <div style={{ color: '#64748b', padding: 20 }}>Loading...</div> : filtered.map(t => (
            <div key={t._id} onClick={() => loadDetail(t._id)} style={{ padding: 16, background: selected?._id === t._id ? '#1e3a5f' : '#111827', borderRadius: 8, marginBottom: 8, cursor: 'pointer', border: selected?._id === t._id ? '1px solid #3b82f6' : '1px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: t.is_active ? '#14532d' : '#7f1d1d', color: t.is_active ? '#22c55e' : '#ef4444' }}>{t.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {t.description && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{t.description}</div>}
            </div>
          ))}
        </div>

        {/* Right: Detail */}
        <div style={{ background: '#111827', borderRadius: 12, padding: 24 }}>
          {selected ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{selected.name}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setForm({ name: selected.name, description: selected.description || '', is_active: selected.is_active }); setShowModal(true); }} style={{ padding: '8px 16px', background: '#1e3a5f', color: '#60a5fa', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Edit size={14} /> Edit</button>
                  <button onClick={() => handleDelete(selected._id)} style={{ padding: '8px 16px', background: '#7f1d1d', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
              {selected.description && <p style={{ color: '#94a3b8', marginBottom: 20 }}>{selected.description}</p>}

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> Assigned Users ({selected.users?.length || 0})</h3>
                {(selected.users || []).map((u: any, i: number) => (
                  <div key={i} style={{ padding: 12, background: '#0a0a0a', borderRadius: 8, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{u.user_id?.name || u.user_id?.email || 'Unknown'}</span>
                    {u.is_primary && <span style={{ fontSize: 11, background: '#14532d', color: '#22c55e', padding: '2px 8px', borderRadius: 4 }}>Primary</span>}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input value={assignUserId} onChange={e => setAssignUserId(e.target.value)} placeholder="User ID to assign" style={{ flex: 1, padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff' }} />
                  <button onClick={handleAssign} style={{ padding: '8px 16px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Assign</button>
                </div>
              </div>

              {selected.rules?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Rules ({selected.rules.length})</h3>
                  {selected.rules.map((r: any, i: number) => (
                    <div key={i} style={{ padding: 12, background: '#0a0a0a', borderRadius: 8, marginBottom: 6 }}>
                      <span style={{ color: '#60a5fa' }}>{r.rule_type}</span>: <span style={{ color: '#94a3b8' }}>{r.rule_value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Select a territory to view details</div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 32, width: 480 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>{selected?._id ? 'Edit' : 'New'} Territory</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 8, color: '#fff', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                <span style={{ color: '#94a3b8' }}>Active</span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerritoryManagement;
