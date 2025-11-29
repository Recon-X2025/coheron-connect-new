import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './DeliveryOrderForm.css';

interface DeliveryOrderFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const DeliveryOrderForm = ({ onClose, onSave, initialData }: DeliveryOrderFormProps) => {
  const [loading, setLoading] = useState(false);
  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    sale_order_id: '',
    warehouse_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    carrier_id: '',
    tracking_number: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
    if (initialData) {
      setFormData({
        sale_order_id: initialData.sale_order_id?.toString() || '',
        warehouse_id: initialData.warehouse_id?.toString() || '',
        scheduled_date: initialData.scheduled_date ? initialData.scheduled_date.split('T')[0] : new Date().toISOString().split('T')[0],
        carrier_id: initialData.carrier_id?.toString() || '',
        tracking_number: initialData.tracking_number || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const loadData = async () => {
    try {
      const [ordersData, warehousesData] = await Promise.all([
        apiService.get<any[]>('sale-orders').catch(() => []),
        apiService.get<any[]>('inventory/warehouses').catch(() => []),
      ]);
      setSaleOrders(ordersData);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        sale_order_id: formData.sale_order_id ? parseInt(formData.sale_order_id) : null,
        warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : null,
        scheduled_date: formData.scheduled_date,
        carrier_id: formData.carrier_id ? parseInt(formData.carrier_id) : null,
        tracking_number: formData.tracking_number || null,
        notes: formData.notes || null,
      };

      if (initialData?.id) {
        await apiService.update('sales/delivery', initialData.id, submitData);
        showToast('Delivery order updated successfully', 'success');
      } else {
        await apiService.create('sales/delivery', submitData);
        showToast('Delivery order created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving delivery order:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save delivery order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content delivery-order-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Delivery Order' : 'Create New Delivery Order'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sale_order_id">Sale Order</label>
            <select
              id="sale_order_id"
              value={formData.sale_order_id}
              onChange={(e) => setFormData({ ...formData, sale_order_id: e.target.value })}
            >
              <option value="">Select Sale Order</option>
              {saleOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name} - {order.partner_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="warehouse_id">Warehouse</label>
              <select
                id="warehouse_id"
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="scheduled_date">Scheduled Date *</label>
              <input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="carrier_id">Carrier</label>
              <input
                id="carrier_id"
                type="text"
                value={formData.carrier_id}
                onChange={(e) => setFormData({ ...formData, carrier_id: e.target.value })}
                placeholder="Carrier ID"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tracking_number">Tracking Number</label>
              <input
                id="tracking_number"
                type="text"
                value={formData.tracking_number}
                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                placeholder="Tracking number"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Optional notes"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Delivery Order' : 'Create Delivery Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

