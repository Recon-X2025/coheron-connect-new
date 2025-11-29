import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './VendorForm.css';

interface VendorFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const VendorForm = ({ onClose, onSave, initialData }: VendorFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    tax_id: '',
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        zip: initialData.zip || '',
        country: initialData.country || '',
        tax_id: initialData.tax_id || '',
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (initialData?.id) {
        await apiService.update('accounting/accounts-payable/vendors', initialData.id, formData);
        showToast('Vendor updated successfully', 'success');
      } else {
        await apiService.create('accounting/accounts-payable/vendors', formData);
        showToast('Vendor created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save vendor', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content vendor-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Vendor' : 'Create New Vendor'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="code">Vendor Code *</label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="e.g., VEN001"
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Vendor Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter vendor name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendor@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                id="state"
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="zip">ZIP Code</label>
              <input
                id="zip"
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="ZIP"
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tax_id">Tax ID</label>
            <input
              id="tax_id"
              type="text"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              placeholder="Tax identification number"
            />
          </div>

          <div className="form-group">
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
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Vendor' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

