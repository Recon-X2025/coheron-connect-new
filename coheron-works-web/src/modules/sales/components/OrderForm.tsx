import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { saleOrderService, partnerService, productService } from '../../../services/odooService';
import { showToast } from '../../../components/Toast';
import type { SaleOrder, Partner, Product } from '../../../types/odoo';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import './OrderForm.css';

interface OrderFormProps {
  order?: SaleOrder | null;
  onClose: () => void;
  onSave: () => void;
}

interface OrderLine {
  product_id: number;
  product_name: string;
  quantity: number;
  price_unit: number;
  subtotal: number;
}

export const OrderForm = ({ order, onClose, onSave }: OrderFormProps) => {
  useModalDismiss(true, onClose);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [formData, setFormData] = useState({
    partner_id: order?.partner_id || '',
    date_order: order?.date_order ? new Date(order.date_order).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    client_order_ref: (order as any)?.client_order_ref || '',
  });

  useEffect(() => {
    partnerService.getAll().then(setPartners);
    productService.getAll().then(setProducts);
  }, []);

  const handleAddLine = () => {
    setOrderLines([...orderLines, { product_id: 0, product_name: '', quantity: 1, price_unit: 0, subtotal: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    setOrderLines(prev => {
      const newLines = [...prev];
      const line = { ...newLines[index] };

      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        line.product_id = value;
        line.product_name = product?.name || '';
        line.price_unit = product?.list_price || 0;
        line.subtotal = line.quantity * line.price_unit;
      } else if (field === 'quantity') {
        line.quantity = parseFloat(value) || 0;
        line.subtotal = line.quantity * line.price_unit;
      } else if (field === 'price_unit') {
        line.price_unit = parseFloat(value) || 0;
        line.subtotal = line.quantity * line.price_unit;
      }

      newLines[index] = line;
      return newLines;
    });
  };

  const orderTotal = orderLines.reduce((sum, line) => sum + line.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData: Record<string, any> = {
        partner_id: parseInt(formData.partner_id as string),
        date_order: formData.date_order,
        state: 'draft',
        order_line: orderLines
          .filter(l => l.product_id > 0)
          .map(l => ({ product_id: l.product_id, product_uom_qty: l.quantity, price_unit: l.price_unit })),
      };

      if (formData.client_order_ref) {
        orderData.client_order_ref = formData.client_order_ref;
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
                  {partners.map((p, idx) => (
                    <option key={p.id || (p as any)._id || idx} value={p.id}>
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

          <div className="form-section line-items-section">
            <div className="line-items-header">
              <h3>Line Items</h3>
              <button type="button" className="btn-add-line" onClick={handleAddLine}>
                <Plus size={16} />
                Add Line
              </button>
            </div>

            {orderLines.length > 0 ? (
              <>
                <table className="line-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderLines.map((line, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            value={line.product_id}
                            onChange={(e) => handleLineChange(index, 'product_id', parseInt(e.target.value))}
                          >
                            <option value={0}>Select product</option>
                            {products.map((p, idx) => (
                              <option key={p.id || idx} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.price_unit}
                            onChange={(e) => handleLineChange(index, 'price_unit', e.target.value)}
                          />
                        </td>
                        <td className="subtotal-cell">
                          {'\u20B9'}{line.subtotal.toLocaleString()}
                        </td>
                        <td>
                          <button type="button" className="btn-remove-line" onClick={() => handleRemoveLine(index)} title="Remove line">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="line-items-total">
                  <strong>Total: {'\u20B9'}{orderTotal.toLocaleString()}</strong>
                </div>
              </>
            ) : (
              <div className="empty-lines">
                <p>No line items. Click "Add Line" to add products.</p>
              </div>
            )}
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

