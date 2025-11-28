import { useState } from 'react';
import { X } from 'lucide-react';
import { salesService, type PriceList } from '../../../services/salesService';
import { showToast } from '../../../components/Toast';
import './PriceListForm.css';


interface PriceListFormProps {
  priceList?: PriceList;
  onClose: () => void;
  onSave: () => void;
}

export const PriceListForm = ({ priceList, onClose, onSave }: PriceListFormProps) => {
  const [formData, setFormData] = useState({
    name: priceList?.name || '',
    currency: priceList?.currency || 'INR',
    is_active: priceList?.is_active !== false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Please enter a price list name', 'error');
      return;
    }

    setLoading(true);
    try {
      if (priceList?.id) {
        await salesService.pricing.updatePriceList(priceList.id, formData);
        showToast('Price list updated successfully', 'success');
      } else {
        await salesService.pricing.createPriceList(formData);
        showToast('Price list created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save price list:', error);
      showToast(error?.message || 'Failed to save price list. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content price-list-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{priceList ? 'Edit Price List' : 'New Price List'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Price List Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Retail, Wholesale, VIP"
            />
          </div>

          <div className="form-group">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : priceList ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

