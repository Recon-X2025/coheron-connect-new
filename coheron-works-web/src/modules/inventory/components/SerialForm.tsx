import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { inventoryService, type StockSerial, type StockLot } from '../../../services/inventoryService';
import { productService } from '../../../services/odooService';
import { showToast } from '../../../components/Toast';
import type { Product } from '../../../types/odoo';
import './SerialForm.css';

interface SerialFormProps {
  serial?: StockSerial;
  onClose: () => void;
  onSave: () => void;
}

export const SerialForm = ({ serial, onClose, onSave }: SerialFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    product_id: 0,
    lot_id: undefined as number | undefined,
    warranty_start_date: '',
    warranty_end_date: '',
    notes: '',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<StockLot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
    if (serial) {
      setFormData({
        name: serial.name || '',
        product_id: serial.product_id || 0,
        lot_id: serial.lot_id,
        warranty_start_date: serial.warranty_start_date || '',
        warranty_end_date: serial.warranty_end_date || '',
        notes: serial.notes || '',
      });
      if (serial.product_id) {
        loadLots(serial.product_id);
      }
    }
  }, [serial]);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadLots = async (productId: number) => {
    try {
      const data = await inventoryService.getLots({ product_id: productId });
      setLots(data);
    } catch (error) {
      console.error('Failed to load lots:', error);
    }
  };

  const handleProductChange = (productId: number) => {
    setFormData({ ...formData, product_id: productId, lot_id: undefined });
    if (productId) {
      loadLots(productId);
    } else {
      setLots([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.product_id) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      if (serial) {
        await inventoryService.updateSerial(serial.id, formData);
        showToast('Serial number updated successfully', 'success');
      } else {
        await inventoryService.createSerial(formData);
        showToast('Serial number created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save serial:', error);
      showToast(error?.message || 'Failed to save serial number. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content serial-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{serial ? 'Edit Serial Number' : 'New Serial Number'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Serial Number *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter serial number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="product_id">Product *</label>
            <select
              id="product_id"
              name="product_id"
              required
              value={formData.product_id}
              onChange={(e) => handleProductChange(parseInt(e.target.value))}
            >
              <option value={0}>Select Product</option>
              {products.map((product, idx) => (
                <option key={product.id || (product as any)._id || idx} value={product.id}>
                  {product.name} ({product.default_code})
                </option>
              ))}
            </select>
          </div>

          {formData.product_id > 0 && lots.length > 0 && (
            <div className="form-group">
              <label htmlFor="lot_id">Batch/Lot (Optional)</label>
              <select
                id="lot_id"
                name="lot_id"
                value={formData.lot_id || ''}
                onChange={(e) => setFormData({ ...formData, lot_id: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">No Batch</option>
                {lots.map((lot, idx) => (
                  <option key={lot.id || (lot as any)._id || idx} value={lot.id}>
                    {lot.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="warranty_start_date">Warranty Start Date</label>
              <input
                type="date"
                id="warranty_start_date"
                name="warranty_start_date"
                value={formData.warranty_start_date}
                onChange={(e) => setFormData({ ...formData, warranty_start_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="warranty_end_date">Warranty End Date</label>
              <input
                type="date"
                id="warranty_end_date"
                name="warranty_end_date"
                value={formData.warranty_end_date}
                onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : serial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

