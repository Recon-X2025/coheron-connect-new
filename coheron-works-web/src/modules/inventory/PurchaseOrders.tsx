import { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle, Truck, FileText, Download } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { showToast } from '../../components/Toast';
import { confirmAction } from '../../components/ConfirmDialog';
import './PurchaseOrders.css';

interface POLine {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  received_qty: number;
  billed_qty: number;
}

interface PurchaseOrder {
  _id: string;
  po_number: string;
  vendor_id: any;
  date: string;
  lines: POLine[];
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  state: string;
  created_at: string;
}

export const PurchaseOrders = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ vendor_id: '', lines: [{ product_name: '', quantity: 1, unit_price: 0 }] });
  const ax = apiService.getAxiosInstance();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ax.get('/purchase-orders');
      setOrders(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (e: any) { showToast(e.userMessage || 'Failed to load purchase orders', 'error'); }
    finally { setLoading(false); }
  };

  const createPO = async () => {
    try {
      const lines = formData.lines.map(l => ({ ...l, quantity: Number(l.quantity), unit_price: Number(l.unit_price), received_qty: 0, billed_qty: 0 }));
      await ax.post('/purchase-orders', { vendor_id: formData.vendor_id, lines, amount_total: lines.reduce((s, l) => s + l.quantity * l.unit_price, 0) });
      showToast('Purchase order created', 'success');
      setShowForm(false);
      setFormData({ vendor_id: '', lines: [{ product_name: '', quantity: 1, unit_price: 0 }] });
      loadData();
    } catch (e: any) { showToast(e.userMessage || 'Failed to create PO', 'error'); }
  };

  const confirmPO = async (id: string) => {
    const ok = await confirmAction({ title: 'Confirm PO', message: 'Confirm this purchase order?', confirmLabel: 'Confirm' });
    if (!ok) return;
    try {
      await ax.post('/purchase-orders/' + id + '/confirm');
      showToast('PO confirmed', 'success');
      loadData();
    } catch (e: any) { showToast(e.userMessage || 'Failed', 'error'); }
  };

  const receivePO = async (id: string, po: PurchaseOrder) => {
    const ok = await confirmAction({ title: 'Receive Goods', message: 'Mark all items as received?', confirmLabel: 'Receive' });
    if (!ok) return;
    try {
      const lines = (po.lines || []).map((l, i) => ({ line_index: i, received_qty: l.quantity - (l.received_qty || 0) }));
      await ax.post('/purchase-orders/' + id + '/receive', { lines });
      showToast('Goods received', 'success');
      loadData();
    } catch (e: any) { showToast(e.userMessage || 'Failed', 'error'); }
  };

  const createBill = async (id: string) => {
    try {
      const res = await ax.post('/purchase-orders/' + id + '/create-bill');
      showToast('Bill created: ' + (res.data.bill_number || ''), 'success');
      loadData();
    } catch (e: any) { showToast(e.userMessage || 'Failed', 'error'); }
  };

  const downloadPDF = (id: string) => {
    window.open('/api/pdf/purchase-order/' + id, '_blank');
  };

  const getStateBadge = (state: string) => {
    const map: Record<string, { label: string; color: string }> = {
      draft: { label: 'Draft', color: '#6b7280' },
      confirmed: { label: 'Confirmed', color: '#3b82f6' },
      partially_received: { label: 'Partial', color: '#f59e0b' },
      received: { label: 'Received', color: '#10b981' },
      billed: { label: 'Billed', color: '#8b5cf6' },
      cancelled: { label: 'Cancelled', color: '#ef4444' },
    };
    const s = map[state] || { label: state, color: '#6b7280' };
    return <span className="po-status-badge" style={{ background: s.color + '20', color: s.color }}>{s.label}</span>;
  };

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.state !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (o.po_number || '').toLowerCase().includes(term) || (o.vendor_id?.name || '').toLowerCase().includes(term);
    }
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="po-page">
      <div className="po-header">
        <div>
          <h1>Purchase Orders</h1>
          <p className="po-subtitle">{orders.length} orders</p>
        </div>
        <button className="po-btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> New Purchase Order</button>
      </div>

      <div className="po-toolbar">
        <div className="po-search">
          <Search size={18} />
          <input placeholder="Search POs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="po-filters">
          {['all','draft','confirmed','partially_received','received','billed'].map(s => (
            <button key={s} className={'po-filter-btn' + (statusFilter === s ? ' active' : '')} onClick={() => setStatusFilter(s)}>{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <div className="po-table-wrap">
        <table className="po-table">
          <thead>
            <tr><th>PO Number</th><th>Vendor</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o._id}>
                <td className="po-number">{o.po_number || o._id.slice(-6)}</td>
                <td>{o.vendor_id?.name || '-'}</td>
                <td>{o.date ? new Date(o.date).toLocaleDateString() : '-'}</td>
                <td className="po-amount">{(o.amount_total || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                <td>{getStateBadge(o.state)}</td>
                <td className="po-actions">
                  {o.state === 'draft' && <button onClick={() => confirmPO(o._id)} title="Confirm"><CheckCircle size={16} /></button>}
                  {(o.state === 'confirmed' || o.state === 'partially_received') && <button onClick={() => receivePO(o._id, o)} title="Receive"><Truck size={16} /></button>}
                  {(o.state === 'received' || o.state === 'partially_received') && <button onClick={() => createBill(o._id)} title="Create Bill"><FileText size={16} /></button>}
                  <button onClick={() => downloadPDF(o._id)} title="Download PDF"><Download size={16} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="po-empty">No purchase orders found</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Purchase Order</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={e => { e.preventDefault(); createPO(); }}>
              <div className="form-group">
                <label>Vendor ID</label>
                <input value={formData.vendor_id} onChange={e => setFormData({ ...formData, vendor_id: e.target.value })} placeholder="Enter vendor ID" required />
              </div>
              <div className="form-group">
                <label>Line Items</label>
                {formData.lines.map((line, i) => (
                  <div key={i} className="form-row" style={{ marginBottom: '0.5rem' }}>
                    <input placeholder="Product" value={line.product_name} onChange={e => { const lines = [...formData.lines]; lines[i] = { ...lines[i], product_name: e.target.value }; setFormData({ ...formData, lines }); }} />
                    <input type="number" placeholder="Qty" value={line.quantity} onChange={e => { const lines = [...formData.lines]; lines[i] = { ...lines[i], quantity: Number(e.target.value) }; setFormData({ ...formData, lines }); }} />
                    <input type="number" placeholder="Price" value={line.unit_price} onChange={e => { const lines = [...formData.lines]; lines[i] = { ...lines[i], unit_price: Number(e.target.value) }; setFormData({ ...formData, lines }); }} />
                  </div>
                ))}
                <button type="button" className="po-btn-add-line" onClick={() => setFormData({ ...formData, lines: [...formData.lines, { product_name: '', quantity: 1, unit_price: 0 }] })}>+ Add Line</button>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="po-btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
