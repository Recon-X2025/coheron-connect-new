import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { LayoutGrid, Plus, Trash2, Users, Globe, User } from 'lucide-react';

const API = '/api/support/views';
const OPERATORS = ['is', 'is_not', 'contains', 'not_contains', 'greater_than', 'less_than'];
const FIELDS = ['status', 'priority', 'assignee', 'type', 'channel', 'tags', 'created_at', 'updated_at', 'requester', 'group'];
const AVAILABLE_COLUMNS = ['subject', 'status', 'priority', 'assignee', 'requester', 'type', 'channel', 'created_at', 'updated_at', 'tags', 'sla_status'];

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 } as React.CSSProperties,
  sidebar: { background: '#141414', borderRadius: 10, border: '1px solid #222', padding: 16 } as React.CSSProperties,
  card: { background: '#141414', borderRadius: 10, border: '1px solid #222', padding: 16, marginBottom: 12 } as React.CSSProperties,
  btn: (v: string = 'primary') => ({ padding: '8px 16px', borderRadius: 6, border: v === 'ghost' ? '1px solid #333' : 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: v === 'primary' ? '#00C971' : v === 'danger' ? '#DC2626' : 'transparent', color: v === 'primary' ? '#000' : '#e0e0e0', display: 'inline-flex', alignItems: 'center', gap: 6 }) as React.CSSProperties,
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#e0e0e0', fontSize: 13, width: '100%' } as React.CSSProperties,
  select: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#e0e0e0', fontSize: 13 } as React.CSSProperties,
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 } as React.CSSProperties,
  label: { fontSize: 12, color: '#888', marginBottom: 4, display: 'block' } as React.CSSProperties,
  muted: { fontSize: 12, color: '#666' } as React.CSSProperties,
  sectionTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#555', marginBottom: 8, marginTop: 16 },
  viewItem: (active: boolean) => ({ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', background: active ? '#00C97122' : 'transparent', borderLeft: active ? '3px solid #00C971' : '3px solid transparent', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }) as React.CSSProperties,
};

const visIcon = (v: string) => v === 'global' ? <Globe size={12} color="#888" /> : v === 'shared' ? <Users size={12} color="#888" /> : <User size={12} color="#888" />;

const emptyCondition = () => ({ field: 'status', operator: 'is', value: '' });

export const ViewsBuilder: FC = () => {
  const [views, setViews] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const load = () => fetch(API).then(r => r.json()).then(d => setViews(d.data || []));
  useEffect(() => { load(); }, []);

  const selectView = async (v: any) => {
    setSelected(v);
    setEditing({ ...v });
    const id = v._id || v.id;
    const [countRes, ticketsRes] = await Promise.all([
      fetch(`${API}/${id}/count`).then(r => r.json()),
      fetch(`${API}/${id}/tickets?limit=10`).then(r => r.json()),
    ]);
    setTicketCount(countRes.data?.count ?? null);
    setPreview(ticketsRes.data || []);
  };

  const saveView = async () => {
    if (!editing) return;
    const method = editing._id ? 'PUT' : 'POST';
    const url = editing._id ? `${API}/${editing._id}` : API;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    load();
  };

  const deleteView = async (id: string) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setSelected(null); setEditing(null);
    load();
  };

  const newView = () => {
    const v = { name: 'New View', visibility: 'personal', conditions: { all: [emptyCondition()], any: [] }, columns: ['subject', 'status', 'priority', 'assignee'], sort_by: 'created_at', sort_order: 'desc', is_default: false, position: views.length };
    setEditing(v);
    setSelected(null);
    setTicketCount(null);
    setPreview([]);
  };

  const grouped = { personal: views.filter(v => v.visibility === 'personal'), shared: views.filter(v => v.visibility === 'shared'), global: views.filter(v => v.visibility === 'global') };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}><LayoutGrid size={22} color="#00C971" /> Ticket Views</h1>
        <button style={s.btn()} onClick={newView}><Plus size={14} /> New View</button>
      </div>

      <div style={s.layout}>
        <div style={s.sidebar}>
          {(['personal', 'shared', 'global'] as const).map(section => (
            <div key={section}>
              <div style={s.sectionTitle}>{visIcon(section)} {section} views</div>
              {(grouped[section] || []).map(v => (
                <div key={v._id || v.id} style={s.viewItem(selected?._id === v._id)} onClick={() => selectView(v)}>
                  <span style={{ fontSize: 13, color: '#e0e0e0' }}>{v.name}</span>
                </div>
              ))}
              {(grouped[section] || []).length === 0 && <div style={s.muted}>None</div>}
            </div>
          ))}
        </div>

        <div>
          {!editing && <div style={{ ...s.card, textAlign: 'center' as const, color: '#666', padding: 60 }}>Select a view or create a new one</div>}

          {editing && (
            <div style={s.card}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={s.label}>Name</label>
                  <input style={s.input} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Visibility</label>
                  <select style={{ ...s.select, width: '100%' }} value={editing.visibility} onChange={e => setEditing({ ...editing, visibility: e.target.value })}>
                    <option value="personal">Personal</option>
                    <option value="shared">Shared</option>
                    <option value="global">Global</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Auto-refresh (sec)</label>
                  <input style={s.input} type="number" value={editing.auto_refresh_seconds || ''} onChange={e => setEditing({ ...editing, auto_refresh_seconds: parseInt(e.target.value) || undefined })} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>Conditions (ALL)</span>
                  <button style={s.btn('ghost')} onClick={() => setEditing({ ...editing, conditions: { ...editing.conditions, all: [...(editing.conditions?.all || []), emptyCondition()] } })}><Plus size={12} /></button>
                </div>
                {(editing.conditions?.all || []).map((c: any, i: number) => (
                  <div key={i} style={s.row}>
                    <select style={s.select} value={c.field} onChange={e => { const all = [...editing.conditions.all]; all[i] = { ...c, field: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, all } }); }}>
                      {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select style={s.select} value={c.operator} onChange={e => { const all = [...editing.conditions.all]; all[i] = { ...c, operator: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, all } }); }}>
                      {OPERATORS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                    <input style={{ ...s.input, flex: 1 }} value={c.value} onChange={e => { const all = [...editing.conditions.all]; all[i] = { ...c, value: e.target.value }; setEditing({ ...editing, conditions: { ...editing.conditions, all } }); }} />
                    <button style={s.btn('ghost')} onClick={() => { const all = editing.conditions.all.filter((_: any, j: number) => j !== i); setEditing({ ...editing, conditions: { ...editing.conditions, all } }); }}><Trash2 size={12} color="#DC2626" /></button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={s.label}>Sort by</label>
                  <select style={{ ...s.select, width: '100%' }} value={editing.sort_by} onChange={e => setEditing({ ...editing, sort_by: e.target.value })}>
                    {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Order</label>
                  <select style={{ ...s.select, width: '100%' }} value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: e.target.value })}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Group by</label>
                  <select style={{ ...s.select, width: '100%' }} value={editing.group_by || ''} onChange={e => setEditing({ ...editing, group_by: e.target.value || undefined })}>
                    <option value="">None</option>
                    {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Columns</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AVAILABLE_COLUMNS.map(col => {
                    const active = (editing.columns || []).includes(col);
                    return (
                      <button key={col} style={{ padding: '4px 10px', borderRadius: 4, border: active ? '1px solid #00C971' : '1px solid #333', background: active ? '#00C97122' : 'transparent', color: active ? '#00C971' : '#888', fontSize: 12, cursor: 'pointer' }}
                        onClick={() => setEditing({ ...editing, columns: active ? editing.columns.filter((c: string) => c !== col) : [...(editing.columns || []), col] })}>
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btn()} onClick={saveView}>{editing._id ? 'Update' : 'Create'} View</button>
                {editing._id && <button style={s.btn('danger')} onClick={() => deleteView(editing._id)}><Trash2 size={12} /> Delete</button>}
              </div>
            </div>
          )}

          {ticketCount !== null && (
            <div style={{ ...s.card, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>Preview ({ticketCount} tickets match)</span>
              </div>
              {preview.length === 0 && <div style={s.muted}>No matching tickets.</div>}
              {preview.map((t: any, i: number) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#e0e0e0', fontSize: 13 }}>{t.subject || t.title || `Ticket #${t._id?.slice(-6)}`}</span>
                  <span style={{ fontSize: 12, color: '#888' }}>{t.status} / {t.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewsBuilder;
