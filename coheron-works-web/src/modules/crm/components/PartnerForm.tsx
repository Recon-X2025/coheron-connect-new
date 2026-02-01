import { useState } from 'react';
import { X } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './PartnerForm.css';

interface PartnerFormProps {
  partner?: any | null;
  onClose: () => void;
  onSave: () => void;
}

export const PartnerForm = ({ partner, onClose, onSave }: PartnerFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: partner?.name || '',
    email: partner?.email || '',
    phone: partner?.phone || '',
    type: partner?.type || 'contact',
    street: (partner as any)?.street || '',
    city: (partner as any)?.city || '',
    zip: (partner as any)?.zip || '',
    country: (partner as any)?.country || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (partner) {
        await apiService.update('/partners', partner._id || partner.id, formData);
        showToast('Customer updated successfully', 'success');
      } else {
        await apiService.create('/partners', formData);
        showToast('Customer created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      showToast(error?.message || 'Failed to save customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content partner-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{partner ? 'Edit Customer' : 'New Customer'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="partner-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'company' | 'contact' })}
                  required
                >
                  <option value="contact">Contact</option>
                  <option value="company">Company</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Address</h3>
            <div className="form-row">
              <div className="form-group full-width">
                <label>Street</label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>ZIP Code</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : partner ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

