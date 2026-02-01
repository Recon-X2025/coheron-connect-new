import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
type Product = any;
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import './ProductForm.css';

interface ProductFormProps {
  product?: Product;
  onClose: () => void;
  onSave: () => void;
}

export const ProductForm = ({ product, onClose, onSave }: ProductFormProps) => {
  useModalDismiss(true, onClose);
  const [formData, setFormData] = useState({
    name: '',
    default_code: '',
    list_price: 0,
    standard_price: 0,
    type: 'product' as 'product' | 'service' | 'consu',
    description: '',
    barcode: '',
    hsn_code: '',
    weight: 0,
    active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        default_code: product.default_code || '',
        list_price: product.list_price || 0,
        standard_price: product.standard_price || 0,
        type: product.type || 'product',
        description: (product as any).description || '',
        barcode: (product as any).barcode || '',
        hsn_code: (product as any).hsn_code || '',
        weight: (product as any).weight || 0,
        active: (product as any).active !== false,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (product) {
        // Update existing product
        await apiService.update('/products', product.id, formData);
        showToast('Product updated successfully', 'success');
      } else {
        // Create new product
        await apiService.create('/products', formData);
        showToast('Product created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      showToast(error?.message || 'Failed to save product. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content product-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Edit Product' : 'New Product'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Product Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="default_code">Product Code</label>
              <input
                type="text"
                id="default_code"
                name="default_code"
                value={formData.default_code}
                onChange={(e) => setFormData({ ...formData, default_code: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="product">Stockable Product</option>
                <option value="consu">Consumable</option>
                <option value="service">Service</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="list_price">Sale Price</label>
              <input
                type="number"
                id="list_price"
                name="list_price"
                step="0.01"
                min="0"
                value={formData.list_price}
                onChange={(e) => setFormData({ ...formData, list_price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="standard_price">Cost Price</label>
              <input
                type="number"
                id="standard_price"
                name="standard_price"
                step="0.01"
                min="0"
                value={formData.standard_price}
                onChange={(e) => setFormData({ ...formData, standard_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="barcode">Barcode</label>
              <input
                type="text"
                id="barcode"
                name="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="hsn_code">HSN Code</label>
              <input
                type="text"
                id="hsn_code"
                name="hsn_code"
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="weight">Weight (kg)</label>
            <input
              type="number"
              id="weight"
              name="weight"
              step="0.01"
              min="0"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : product ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

