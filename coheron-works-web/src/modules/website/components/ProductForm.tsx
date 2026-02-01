import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './ProductForm.css';

interface ProductFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const ProductForm = ({ onClose, onSave, initialData }: ProductFormProps) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    product_id: '',
    list_price: '',
    is_published: false,
    is_featured: false,
  });

  useEffect(() => {
    loadProducts();
    if (initialData) {
      setFormData({
        product_id: initialData.product_id?.toString() || '',
        list_price: initialData.list_price?.toString() || '',
        is_published: initialData.is_published || false,
        is_featured: initialData.is_featured || false,
      });
    }
  }, [initialData]);

  const loadProducts = async () => {
    try {
      const data = await apiService.get<any[]>('products').catch((err) => { console.error('Failed to load products:', err.userMessage || err.message); return []; });
      setProducts(data);
    } catch (error: any) {
      console.error('Error loading products:', error);
      showToast(error.userMessage || 'Failed to load products', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        product_id: parseInt(formData.product_id),
        list_price: formData.list_price ? parseFloat(formData.list_price) : 0,
        is_published: formData.is_published,
        is_featured: formData.is_featured,
      };

      if (initialData?.id) {
        await apiService.update('website/products', initialData.id, submitData);
        showToast('Product updated successfully', 'success');
      } else {
        await apiService.create('website/products', submitData);
        showToast('Product added to catalog successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save product', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content product-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Product' : 'Add Product to Catalog'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="product_id">Product *</label>
            <select
              id="product_id"
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
            >
              <option value="">Select Product</option>
              {products.map((product, idx) => (
                <option key={product.id || (product as any)._id || idx} value={product.id}>
                  {product.name} ({product.default_code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="list_price">List Price *</label>
            <input
              id="list_price"
              type="number"
              step="0.01"
              value={formData.list_price}
              onChange={(e) => setFormData({ ...formData, list_price: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                />
                Published
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                />
                Featured
              </label>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

