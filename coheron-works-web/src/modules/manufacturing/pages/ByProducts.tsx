import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Package, ArrowDownToLine, PieChart } from 'lucide-react';

interface ByProductItem {
  _id: string;
  manufacturing_order_id: any;
  product_id: any;
  type: string;
  planned_quantity: number;
  actual_quantity: number;
  uom: string;
  cost_allocation_method: string;
  cost_allocation_percentage: number;
  warehouse_id: any;
  status: string;
  notes: string;
  created_at: string;
}

const API = '/api/manufacturing/byproducts';

const statusColors: Record<string, { bg: string; text: string }> = {
  planned: { bg: '#1a1a2e', text: '#8888aa' },
  produced: { bg: '#1a2a1a', text: '#00C971' },
  scrapped: { bg: '#2a1a1a', text: '#bb4444' },
};

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const ByProducts: React.FC = () => {
  const [items, setItems] = useState<ByProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    manufacturing_order_id: '', product_id: '', type: 'byproduct', planned_quantity: '', uom: 'kg',
    cost_allocation_method: 'none', cost_allocation_percentage: '0',
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, typeFilter, statusFilter]);

  const fetchCostAnalysis = async () => {
    try {
      const res = await fetch(`${API}/cost-analysis`, { headers: getHeaders() });
      if (res.ok) setCostAnalysis(await res.json());
    } catch (_) {}
  };

  useEffect(() => { fetchItems(); fetchCostAnalysis(); }, [fetchItems]);

  const createItem = async () => {
    try {
      const res = await fetch(API, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ ...formData, planned_quantity: Number(formData.planned_quantity), cost_allocation_percentage: Number(formData.cost_allocation_percentage) }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowCreate(false);
      setFormData({ manufacturing_order_id: '', product_id: '', type: 'byproduct', planned_quantity: '', uom: 'kg', cost_allocation_method: 'none', cost_allocation_percentage: '0' });
      fetchItems();
    } catch (e: any) { setError(e.message); }
  };

  const receiveItem = async (id: string) => {
    try {
      const res = await fetch(`${API}/${id}/receive`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({}) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      fetchItems();
    } catch (e: any) { setError(e.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>By-Products & Co-Products</h1>
        <button onClick={() => setShowCreate(true)} style={greenBtnStyle}><Plus size={16} /> Add By-Product</button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      {costAnalysis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total', value: costAnalysis.total, icon: <Package size={18} /> },
            { label: 'By-Products', value: costAnalysis.by_type?.byproduct || 0, icon: <ArrowDownToLine size={18} /> },
            { label: 'Co-Products', value: costAnalysis.by_type?.coproduct || 0, icon: <PieChart size={18} /> },
            { label: 'Avg Allocation %', value: `${costAnalysis.avg_allocation_percentage}%`, icon: <PieChart size={18} /> },
          ].map((s, i) => (
            <div key={i} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6e6e6e', fontSize: 13, marginBottom: 8 }}>{s.label} {s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All Types</option>
          <option value="byproduct">By-Product</option>
          <option value="coproduct">Co-Product</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="produced">Produced</option>
          <option value="scrapped">Scrapped</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : (
        <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #222' }}>
              {['Product', 'Type', 'Order', 'Planned', 'Actual', 'UOM', 'Cost Method', 'Alloc %', 'Status', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={cellStyle}><span style={{ color: '#00C971' }}>{item.product_id?.name || item.product_id}</span></td>
                  <td style={cellStyle}><span style={{ color: item.type === 'coproduct' ? '#4488ee' : '#939393' }}>{item.type}</span></td>
                  <td style={cellStyle}>{item.manufacturing_order_id?.order_number || '-'}</td>
                  <td style={cellStyle}>{item.planned_quantity}</td>
                  <td style={cellStyle}>{item.actual_quantity || '-'}</td>
                  <td style={cellStyle}>{item.uom}</td>
                  <td style={cellStyle}>{item.cost_allocation_method}</td>
                  <td style={cellStyle}>{item.cost_allocation_percentage}%</td>
                  <td style={cellStyle}><span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, backgroundColor: statusColors[item.status]?.bg, color: statusColors[item.status]?.text }}>{item.status}</span></td>
                  <td style={cellStyle}>
                    {item.status === 'produced' && <button onClick={() => receiveItem(item._id)} style={smallBtnStyle} title="Receive"><ArrowDownToLine size={13} /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={10} style={{ ...cellStyle, textAlign: 'center', color: '#6e6e6e' }}>No by-products found</td></tr>}
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
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>Add By-Product / Co-Product</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>Manufacturing Order ID<input value={formData.manufacturing_order_id} onChange={e => setFormData({ ...formData, manufacturing_order_id: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Product ID<input value={formData.product_id} onChange={e => setFormData({ ...formData, product_id: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Type
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={inputStyle}>
                  <option value="byproduct">By-Product</option><option value="coproduct">Co-Product</option>
                </select>
              </label>
              <label style={labelStyle}>Planned Quantity<input type="number" value={formData.planned_quantity} onChange={e => setFormData({ ...formData, planned_quantity: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>UOM<input value={formData.uom} onChange={e => setFormData({ ...formData, uom: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Cost Allocation Method
                <select value={formData.cost_allocation_method} onChange={e => setFormData({ ...formData, cost_allocation_method: e.target.value })} style={inputStyle}>
                  <option value="none">None</option><option value="physical">Physical</option><option value="market_value">Market Value</option><option value="manual">Manual</option>
                </select>
              </label>
              <label style={labelStyle}>Allocation %<input type="number" value={formData.cost_allocation_percentage} onChange={e => setFormData({ ...formData, cost_allocation_percentage: e.target.value })} style={inputStyle} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreate(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={createItem} style={{ ...greenBtnStyle, padding: '8px 16px' }}>Create</button>
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
const smallBtnStyle: React.CSSProperties = { padding: 6, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#939393', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#939393', cursor: 'pointer', fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };

export default ByProducts;
