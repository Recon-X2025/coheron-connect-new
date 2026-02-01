import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Package, Layers, Box } from 'lucide-react';

interface PackagingLevel {
  _id: string;
  name: string;
  level: number;
  parent_level_id?: any;
  dimensions: { length: number; width: number; height: number; unit: string };
  max_weight: number;
  barcode_prefix: string;
  is_shippable: boolean;
  items_per_pack: number;
  children?: PackagingLevel[];
}

const API = '/api/inventory/packaging';

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const PackagingConfig: React.FC = () => {
  const [levels, setLevels] = useState<PackagingLevel[]>([]);
  const [hierarchy, setHierarchy] = useState<PackagingLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('hierarchy');

  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    parent_level_id: '',
    length: 0,
    width: 0,
    height: 0,
    unit: 'cm',
    max_weight: 0,
    barcode_prefix: '',
    is_shippable: false,
    items_per_pack: 1,
  });

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, hierRes] = await Promise.all([
        fetch(API, { headers: getHeaders() }),
        fetch(`${API}/hierarchy`, { headers: getHeaders() }),
      ]);
      if (!listRes.ok || !hierRes.ok) throw new Error('Failed to fetch');
      setLevels(await listRes.json());
      setHierarchy(await hierRes.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const resetForm = () => {
    setFormData({ name: '', level: 1, parent_level_id: '', length: 0, width: 0, height: 0, unit: 'cm', max_weight: 0, barcode_prefix: '', is_shippable: false, items_per_pack: 1 });
    setEditingId(null);
  };

  const openEdit = (l: PackagingLevel) => {
    setFormData({
      name: l.name,
      level: l.level,
      parent_level_id: l.parent_level_id?._id || l.parent_level_id || '',
      length: l.dimensions?.length || 0,
      width: l.dimensions?.width || 0,
      height: l.dimensions?.height || 0,
      unit: l.dimensions?.unit || 'cm',
      max_weight: l.max_weight,
      barcode_prefix: l.barcode_prefix,
      is_shippable: l.is_shippable,
      items_per_pack: l.items_per_pack,
    });
    setEditingId(l._id);
    setShowForm(true);
  };

  const saveLevel = async () => {
    try {
      const body = {
        name: formData.name,
        level: formData.level,
        parent_level_id: formData.parent_level_id || undefined,
        dimensions: { length: formData.length, width: formData.width, height: formData.height, unit: formData.unit },
        max_weight: formData.max_weight,
        barcode_prefix: formData.barcode_prefix,
        is_shippable: formData.is_shippable,
        items_per_pack: formData.items_per_pack,
      };

      const url = editingId ? `${API}/${editingId}` : API;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to save');
      setShowForm(false);
      resetForm();
      fetchLevels();
    } catch (e: any) { setError(e.message); }
  };

  const deleteLevel = async (id: string) => {
    if (!confirm('Delete this packaging level?')) return;
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      fetchLevels();
    } catch (e: any) { setError(e.message); }
  };

  const renderHierarchyNode = (node: PackagingLevel, depth: number = 0): React.ReactNode => {
    return (
      <div key={node._id}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          marginLeft: depth * 32, backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', marginBottom: 8,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: node.is_shippable ? '#1a2a1a' : '#1a1a2e',
            color: node.is_shippable ? '#00C971' : '#4488ee',
          }}>
            <Box size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{node.name}</div>
            <div style={{ color: '#6e6e6e', fontSize: 12 }}>
              Level {node.level} | {node.dimensions?.length}x{node.dimensions?.width}x{node.dimensions?.height} {node.dimensions?.unit} | {node.items_per_pack} items/pack
              {node.is_shippable && <span style={{ color: '#00C971', marginLeft: 8 }}>Shippable</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => openEdit(node)} style={iconBtnStyle}><Edit2 size={14} /></button>
            <button onClick={() => deleteLevel(node._id)} style={{ ...iconBtnStyle, color: '#bb4444' }}><Trash2 size={14} /></button>
          </div>
        </div>
        {node.children?.map(child => <React.Fragment key={child._id}>{renderHierarchyNode(child, depth + 1)}</React.Fragment>)}
      </div>
    );
  };

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Multi-level Packaging</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', backgroundColor: '#141414', borderRadius: 6, overflow: 'hidden', border: '1px solid #222' }}>
            <button onClick={() => setViewMode('hierarchy')} style={{ padding: '8px 14px', backgroundColor: viewMode === 'hierarchy' ? '#1a1a1a' : 'transparent', color: viewMode === 'hierarchy' ? '#fff' : '#6e6e6e', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              <Layers size={14} />
            </button>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 14px', backgroundColor: viewMode === 'list' ? '#1a1a1a' : 'transparent', color: viewMode === 'list' ? '#fff' : '#6e6e6e', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              <Package size={14} />
            </button>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
            <Plus size={16} /> Add Level
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : viewMode === 'hierarchy' ? (
        hierarchy.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>No packaging levels configured. Add your first level.</div>
        ) : (
          <div>{hierarchy.map(node => <React.Fragment key={node._id}>{renderHierarchyNode(node)}</React.Fragment>)}</div>
        )
      ) : (
        levels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>No packaging levels</div>
        ) : (
          <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Name', 'Level', 'Dimensions', 'Max Weight', 'Items/Pack', 'Barcode Prefix', 'Shippable', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {levels.map(l => (
                  <tr key={l._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}><span style={{ fontWeight: 500 }}>{l.name}</span></td>
                    <td style={cellStyle}>{l.level}</td>
                    <td style={cellStyle}>{l.dimensions?.length}x{l.dimensions?.width}x{l.dimensions?.height} {l.dimensions?.unit}</td>
                    <td style={cellStyle}>{l.max_weight} kg</td>
                    <td style={cellStyle}>{l.items_per_pack}</td>
                    <td style={cellStyle}>{l.barcode_prefix || '-'}</td>
                    <td style={cellStyle}>
                      <span style={{ color: l.is_shippable ? '#00C971' : '#6e6e6e' }}>{l.is_shippable ? 'Yes' : 'No'}</span>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => openEdit(l)} style={iconBtnStyle}><Edit2 size={14} /></button>
                        <button onClick={() => deleteLevel(l._id)} style={{ ...iconBtnStyle, color: '#bb4444' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>
              {editingId ? 'Edit' : 'Add'} Packaging Level
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>Name<input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>Level (1=innermost)<input type="number" min={1} value={formData.level} onChange={e => setFormData({ ...formData, level: Number(e.target.value) })} style={inputStyle} /></label>
                <label style={labelStyle}>Parent Level
                  <select value={formData.parent_level_id} onChange={e => setFormData({ ...formData, parent_level_id: e.target.value })} style={inputStyle}>
                    <option value="">None (root)</option>
                    {levels.filter(l => l._id !== editingId).map(l => (
                      <option key={l._id} value={l._id}>{l.name} (Level {l.level})</option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ fontSize: 13, color: '#939393', marginBottom: -8 }}>Dimensions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8 }}>
                <label style={labelStyle}>Length<input type="number" value={formData.length} onChange={e => setFormData({ ...formData, length: Number(e.target.value) })} style={inputStyle} /></label>
                <label style={labelStyle}>Width<input type="number" value={formData.width} onChange={e => setFormData({ ...formData, width: Number(e.target.value) })} style={inputStyle} /></label>
                <label style={labelStyle}>Height<input type="number" value={formData.height} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })} style={inputStyle} /></label>
                <label style={labelStyle}>Unit
                  <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} style={inputStyle}>
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                    <option value="mm">mm</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>Max Weight (kg)<input type="number" value={formData.max_weight} onChange={e => setFormData({ ...formData, max_weight: Number(e.target.value) })} style={inputStyle} /></label>
                <label style={labelStyle}>Items Per Pack<input type="number" min={1} value={formData.items_per_pack} onChange={e => setFormData({ ...formData, items_per_pack: Number(e.target.value) })} style={inputStyle} /></label>
                <label style={labelStyle}>Barcode Prefix<input value={formData.barcode_prefix} onChange={e => setFormData({ ...formData, barcode_prefix: e.target.value })} style={inputStyle} /></label>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#939393' }}>
                <input type="checkbox" checked={formData.is_shippable} onChange={e => setFormData({ ...formData, is_shippable: e.target.checked })} />
                Shippable
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={saveLevel} style={{ padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#ccc' };
const iconBtnStyle: React.CSSProperties = { padding: 6, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#939393', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 560, maxHeight: '85vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };

export default PackagingConfig;
