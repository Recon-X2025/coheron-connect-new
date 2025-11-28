import { useState } from 'react';
import { X } from 'lucide-react';
import { salesService } from '../../../services/salesService';
import { showToast } from '../../../components/Toast';
import './PromotionForm.css';

interface Promotion {
  id?: number;
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  usage_limit?: number;
  min_purchase_amount?: number;
}

interface PromotionFormProps {
  promotion?: Promotion;
  onClose: () => void;
  onSave: () => void;
}

export const PromotionForm = ({ promotion, onClose, onSave }: PromotionFormProps) => {
  const [formData, setFormData] = useState({
    name: promotion?.name || '',
    code: promotion?.code || '',
    discount_type: promotion?.discount_type || 'percentage' as 'percentage' | 'fixed',
    discount_value: promotion?.discount_value || 0,
    valid_from: promotion?.valid_from || new Date().toISOString().split('T')[0],
    valid_until: promotion?.valid_until || '',
    is_active: promotion?.is_active !== false,
    usage_limit: promotion?.usage_limit || undefined,
    min_purchase_amount: promotion?.min_purchase_amount || 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await salesService.pricing.createPromotion(formData);
      showToast(promotion ? 'Promotion updated successfully' : 'Promotion created successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save promotion:', error);
      showToast(error?.message || 'Failed to save promotion. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content promotion-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{promotion ? 'Edit Promotion' : 'New Promotion'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Promotion Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Sale 2024"
              />
            </div>

            <div className="form-group">
              <label htmlFor="code">Promo Code *</label>
              <input
                type="text"
                id="code"
                name="code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="discount_type">Discount Type</label>
              <select
                id="discount_type"
                name="discount_type"
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discount_value">Discount Value *</label>
              <input
                type="number"
                id="discount_value"
                name="discount_value"
                required
                step="0.01"
                min="0"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                placeholder={formData.discount_type === 'percentage' ? '10' : '100'}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="valid_from">Valid From *</label>
              <input
                type="date"
                id="valid_from"
                name="valid_from"
                required
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="valid_until">Valid Until *</label>
              <input
                type="date"
                id="valid_until"
                name="valid_until"
                required
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="min_purchase_amount">Minimum Purchase Amount</label>
              <input
                type="number"
                id="min_purchase_amount"
                name="min_purchase_amount"
                step="0.01"
                min="0"
                value={formData.min_purchase_amount}
                onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="usage_limit">Usage Limit (Optional)</label>
              <input
                type="number"
                id="usage_limit"
                name="usage_limit"
                min="1"
                value={formData.usage_limit || ''}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Unlimited"
              />
            </div>
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
              {loading ? 'Saving...' : promotion ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

