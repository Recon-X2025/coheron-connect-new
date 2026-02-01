import React, { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle, Shield, Thermometer, FileText, Search } from 'lucide-react';

interface HazmatItem {
  _id: string;
  product_id: any;
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  packing_group: string;
  label_codes: string[];
  requires_placard: boolean;
  storage_requirements: any;
  transport_restrictions: any;
  emergency_contact: string;
  sds_url: string;
  is_active: boolean;
  created_at: string;
}

const API = '/api/inventory/hazmat';

const classColors: Record<string, string> = {
  '1': '#ee3333', '2': '#ee8833', '3': '#ee4444', '4': '#ee6633',
  '5': '#eeaa33', '6': '#bb44bb', '7': '#ffff44', '8': '#44aaee', '9': '#999999',
};

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const HazmatManagement: React.FC = () => {
  const [items, setItems] = useState<HazmatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compliance, setCompliance] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    product_id: '', un_number: '', proper_shipping_name: '', hazard_class: '', packing_group: '',
    label_codes: '', emergency_contact: '', sds_url: '',
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (classFilter) params.set('hazard_class', classFilter);
      const res = await fetch(`${API}?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, classFilter]);

  const fetchCompliance = async () => {
    try {
      const res = await fetch(`${API}/compliance-report`, { headers: getHeaders() });
      if (res.ok) setCompliance(await res.json());
    } catch (_) {}
  };

  useEffect(() => { fetchItems(); fetchCompliance(); }, [fetchItems]);

  const createClassification = async () => {
    try {
      const res = await fetch(API, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({
          ...formData,
          label_codes: formData.label_codes.split(',').map(s => s.trim()).filter(Boolean),
          storage_requirements: { temperature_min: -20, temperature_max: 40, ventilation_required: false },
          transport_restrictions: { air_allowed: true, sea_allowed: true, road_allowed: true, rail_allowed: true },
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowCreate(false);
      setFormData({ product_id: '', un_number: '', proper_shipping_name: '', hazard_class: '', packing_group: '', label_codes: '', emergency_contact: '', sds_url: '' });
      fetchItems();
      fetchCompliance();
    } catch (e: any) { setError(e.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Hazmat / Dangerous Goods</h1>
        <button onClick={() => setShowCreate(true)} style={greenBtnStyle}><Plus size={16} /> Add Classification</button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      {compliance && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Hazmat Products', value: compliance.total_hazmat_products, icon: <AlertTriangle size={18} /> },
            { label: 'Compliance Score', value: `${compliance.compliance_score}%`, icon: <Shield size={18} /> },
            { label: 'Missing SDS', value: compliance.missing_sds, icon: <FileText size={18} /> },
            { label: 'Missing Contact', value: compliance.missing_emergency_contact, icon: <AlertTriangle size={18} /> },
          ].map((s, i) => (
            <div key={i} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6e6e6e', fontSize: 13, marginBottom: 8 }}>{s.label} {s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={selectStyle}>
          <option value="">All Classes</option>
          {['1','2','3','4','5','6','7','8','9'].map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : (
        <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['Product', 'UN Number', 'Shipping Name', 'Class', 'Packing', 'Placard', 'SDS', 'Active'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={cellStyle}><span style={{ color: '#00C971' }}>{item.product_id?.name || item.product_id}</span></td>
                  <td style={cellStyle}><span style={{ fontFamily: 'monospace' }}>UN{item.un_number}</span></td>
                  <td style={cellStyle}>{item.proper_shipping_name}</td>
                  <td style={cellStyle}><span style={{ color: classColors[item.hazard_class] || '#999', fontWeight: 600 }}>{item.hazard_class}</span></td>
                  <td style={cellStyle}>{item.packing_group || '-'}</td>
                  <td style={cellStyle}>{item.requires_placard ? 'Yes' : 'No'}</td>
                  <td style={cellStyle}>{item.sds_url ? <a href={item.sds_url} target="_blank" rel="noreferrer" style={{ color: '#4488ee' }}>View</a> : '-'}</td>
                  <td style={cellStyle}><span style={{ color: item.is_active ? '#00C971' : '#666' }}>{item.is_active ? 'Yes' : 'No'}</span></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#6e6e6e' }}>No hazmat classifications found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>Prev</button>
          <span style={{ padding: '8px 12px', color: '#939393', fontSize: 14 }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Next</button>
        </div>
      )}

      {showCreate && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>Add Hazmat Classification</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>Product ID<input value={formData.product_id} onChange={e => setFormData({ ...formData, product_id: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>UN Number<input value={formData.un_number} onChange={e => setFormData({ ...formData, un_number: e.target.value })} style={inputStyle} placeholder="1234" /></label>
              <label style={labelStyle}>Proper Shipping Name<input value={formData.proper_shipping_name} onChange={e => setFormData({ ...formData, proper_shipping_name: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Hazard Class
                <select value={formData.hazard_class} onChange={e => setFormData({ ...formData, hazard_class: e.target.value })} style={inputStyle}>
                  <option value="">Select</option>
                  {['1','2','3','4','5','6','7','8','9'].map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </label>
              <label style={labelStyle}>Packing Group
                <select value={formData.packing_group} onChange={e => setFormData({ ...formData, packing_group: e.target.value })} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="I">I</option><option value="II">II</option><option value="III">III</option>
                </select>
              </label>
              <label style={labelStyle}>Label Codes (comma-separated)<input value={formData.label_codes} onChange={e => setFormData({ ...formData, label_codes: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Emergency Contact<input value={formData.emergency_contact} onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>SDS URL<input value={formData.sds_url} onChange={e => setFormData({ ...formData, sds_url: e.target.value })} style={inputStyle} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreate(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={createClassification} style={{ ...greenBtnStyle, padding: '8px 16px' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#ccc' };
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' };
const selectStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const greenBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#939393', cursor: 'pointer', fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };

export default HazmatManagement;
