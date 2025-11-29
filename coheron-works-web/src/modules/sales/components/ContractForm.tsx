import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './ContractForm.css';

interface ContractFormProps {
  onClose: () => void;
  onSave: () => void;
  type: 'contract' | 'subscription';
  initialData?: any;
}

export const ContractForm = ({ onClose, onSave, type, initialData }: ContractFormProps) => {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    partner_id: '',
    contract_number: '',
    start_date: '',
    end_date: '',
    value: '',
    status: 'draft',
    description: '',
  });

  useEffect(() => {
    loadPartners();
    if (initialData) {
      setFormData({
        partner_id: initialData.partner_id?.toString() || '',
        contract_number: initialData.contract_number || '',
        start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
        end_date: initialData.end_date ? initialData.end_date.split('T')[0] : '',
        value: initialData.value?.toString() || '',
        status: initialData.status || 'draft',
        description: initialData.description || '',
      });
    }
  }, [initialData]);

  const loadPartners = async () => {
    try {
      const data = await apiService.get<any[]>('partners').catch(() => []);
      setPartners(data);
    } catch (error) {
      console.error('Error loading partners:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        partner_id: parseInt(formData.partner_id),
        contract_number: formData.contract_number,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        value: formData.value ? parseFloat(formData.value) : 0,
        status: formData.status,
        description: formData.description || null,
      };

      if (initialData?.id) {
        await apiService.update(`sales/contracts/${type}s`, initialData.id, submitData);
        showToast(`${type === 'contract' ? 'Contract' : 'Subscription'} updated successfully`, 'success');
      } else {
        await apiService.create(`sales/contracts/${type}s`, submitData);
        showToast(`${type === 'contract' ? 'Contract' : 'Subscription'} created successfully`, 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error(`Error saving ${type}:`, error);
      showToast(error?.userMessage || error?.message || `Failed to save ${type}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contract-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit' : 'Create'} {type === 'contract' ? 'Contract' : 'Subscription'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="partner_id">Customer *</label>
            <select
              id="partner_id"
              value={formData.partner_id}
              onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
              required
            >
              <option value="">Select Customer</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="contract_number">{type === 'contract' ? 'Contract' : 'Subscription'} Number</label>
            <input
              id="contract_number"
              type="text"
              value={formData.contract_number}
              onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
              placeholder="Auto-generated if left empty"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date *</label>
              <input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_date">End Date</label>
              <input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="value">Value</label>
              <input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Contract/subscription details"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update' : 'Create'} {type === 'contract' ? 'Contract' : 'Subscription'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

