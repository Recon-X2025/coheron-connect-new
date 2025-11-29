import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './BillForm.css';

interface BillFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const BillForm = ({ onClose, onSave, initialData }: BillFormProps) => {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    vendor_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount_total: '',
    description: '',
  });

  useEffect(() => {
    loadVendors();
    if (initialData) {
      setFormData({
        vendor_id: initialData.vendor_id?.toString() || '',
        invoice_number: initialData.invoice_number || initialData.name || '',
        invoice_date: initialData.invoice_date ? initialData.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
        due_date: initialData.due_date ? initialData.due_date.split('T')[0] : '',
        amount_total: initialData.amount_total?.toString() || '',
        description: initialData.description || '',
      });
    }
  }, [initialData]);

  const loadVendors = async () => {
    try {
      const data = await apiService.get<any[]>('accounting/accounts-payable/vendors').catch(() => []);
      setVendors(data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        vendor_id: parseInt(formData.vendor_id),
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        amount_total: parseFloat(formData.amount_total) || 0,
        description: formData.description || null,
      };

      if (initialData?.id) {
        await apiService.update('accounting/accounts-payable/bills', initialData.id, submitData);
        showToast('Bill updated successfully', 'success');
      } else {
        await apiService.create('accounting/accounts-payable/bills', submitData);
        showToast('Bill created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving bill:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save bill', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bill-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Bill' : 'Create New Bill'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="vendor_id">Vendor *</label>
            <select
              id="vendor_id"
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              required
            >
              <option value="">Select Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name} ({vendor.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="invoice_number">Invoice Number *</label>
              <input
                id="invoice_number"
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                required
                placeholder="Enter invoice number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount_total">Amount *</label>
              <input
                id="amount_total"
                type="number"
                step="0.01"
                value={formData.amount_total}
                onChange={(e) => setFormData({ ...formData, amount_total: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="invoice_date">Invoice Date *</label>
              <input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="due_date">Due Date</label>
              <input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Bill' : 'Create Bill'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

