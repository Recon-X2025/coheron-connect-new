import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './RMAForm.css';

interface RMAFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const RMAForm = ({ onClose, onSave, initialData }: RMAFormProps) => {
  const [loading, setLoading] = useState(false);
  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    sale_order_id: '',
    partner_id: '',
    reason: 'defective',
    requested_date: new Date().toISOString().split('T')[0],
    refund_method: 'original_payment',
    notes: '',
  });

  useEffect(() => {
    loadData();
    if (initialData) {
      setFormData({
        sale_order_id: initialData.sale_order_id?.toString() || '',
        partner_id: initialData.partner_id?.toString() || '',
        reason: initialData.reason || 'defective',
        requested_date: initialData.requested_date ? initialData.requested_date.split('T')[0] : new Date().toISOString().split('T')[0],
        refund_method: initialData.refund_method || 'original_payment',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const loadData = async () => {
    try {
      const [ordersData, partnersData] = await Promise.all([
        apiService.get<any[]>('sale-orders').catch((err) => { console.error('Failed to load sale orders:', err.userMessage || err.message); return []; }),
        apiService.get<any[]>('partners').catch((err) => { console.error('Failed to load partners:', err.userMessage || err.message); return []; }),
      ]);
      setSaleOrders(ordersData);
      setPartners(partnersData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showToast(error.userMessage || 'Failed to load form data', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        sale_order_id: formData.sale_order_id ? parseInt(formData.sale_order_id) : null,
        partner_id: parseInt(formData.partner_id),
        reason: formData.reason,
        requested_date: formData.requested_date,
        refund_method: formData.refund_method,
        notes: formData.notes || null,
      };

      if (initialData?.id) {
        await apiService.update('sales/returns/rmas', initialData.id, submitData);
        showToast('RMA updated successfully', 'success');
      } else {
        await apiService.create('sales/returns/rmas', submitData);
        showToast('RMA created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving RMA:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save RMA', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content rma-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit RMA' : 'Create New RMA'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="partner_id">Customer *</label>
            <select
              id="partner_id"
              value={formData.partner_id}
              onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
              required
            >
              <option value="">Select Customer</option>
              {partners.map((partner, idx) => (
                <option key={partner.id || (partner as any)._id || idx} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="sale_order_id">Sale Order</label>
            <select
              id="sale_order_id"
              value={formData.sale_order_id}
              onChange={(e) => setFormData({ ...formData, sale_order_id: e.target.value })}
            >
              <option value="">Select Sale Order</option>
              {saleOrders
                .filter(order => !formData.partner_id || order.partner_id?.toString() === formData.partner_id)
                .map((order, idx) => (
                  <option key={order.id || (order as any)._id || idx} value={order.id}>
                    {order.name} - {order.partner_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reason">Return Reason *</label>
              <select
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              >
                <option value="defective">Defective</option>
                <option value="wrong_item">Wrong Item</option>
                <option value="damaged">Damaged</option>
                <option value="not_as_described">Not as Described</option>
                <option value="customer_change_mind">Customer Changed Mind</option>
                <option value="warranty">Warranty</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="requested_date">Requested Date *</label>
              <input
                id="requested_date"
                type="date"
                value={formData.requested_date}
                onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="refund_method">Refund Method</label>
            <select
              id="refund_method"
              value={formData.refund_method}
              onChange={(e) => setFormData({ ...formData, refund_method: e.target.value })}
            >
              <option value="original_payment">Original Payment Method</option>
              <option value="store_credit">Store Credit</option>
              <option value="replacement">Replacement</option>
              <option value="repair">Repair</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Additional notes about the return"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update RMA' : 'Create RMA'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

