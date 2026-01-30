import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { saleOrderService, partnerService } from '../../../services/odooService';
import { showToast } from '../../../components/Toast';
import type { SaleOrder, Partner } from '../../../types/odoo';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import './OrderForm.css';

interface OrderFormProps {
  order?: SaleOrder | null;
  onClose: () => void;
  onSave: () => void;
}

export const OrderForm = ({ order, onClose, onSave }: OrderFormProps) => {
  useModalDismiss(true, onClose);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [formData, setFormData] = useState({
    partner_id: order?.partner_id || '',
    date_order: order?.date_order ? new Date(order.date_order).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    client_order_ref: (order as any)?.client_order_ref || '',
  });

  useEffect(() => {
    partnerService.getAll().then(setPartners);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData: Partial<SaleOrder> = {
        partner_id: parseInt(formData.partner_id as string),
        date_order: formData.date_order,
        state: 'draft' as const,
      };
      
      if (formData.client_order_ref) {
        (orderData as any).client_order_ref = formData.client_order_ref;
      }

      if (order) {
        await saleOrderService.update(order.id, orderData);
        showToast('Order updated successfully', 'success');
      } else {
        await saleOrderService.create(orderData);
        showToast('Order created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving order:', error);
      showToast(error?.message || 'Failed to save order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content order-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{order ? 'Edit Order' : 'New Sales Order'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Customer *</label>
                <select
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                  required
                >
                  <option value="">Select Customer</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Order Date *</label>
                <input
                  type="date"
                  value={formData.date_order}
                  onChange={(e) => setFormData({ ...formData, date_order: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group full-width">
                <label>Customer Reference</label>
                <input
                  type="text"
                  value={formData.client_order_ref}
                  onChange={(e) => setFormData({ ...formData, client_order_ref: e.target.value })}
                  placeholder="Optional customer reference"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : order ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

