import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './PayrollRunForm.css';

interface PayrollRunFormProps {
  onClose: () => void;
  onSave: () => void;
}

export const PayrollRunForm = ({ onClose, onSave }: PayrollRunFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date_from: '',
    date_to: '',
    employee_ids: [] as number[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiService.create('payroll/payslips', {
        name: formData.name,
        date_from: formData.date_from,
        date_to: formData.date_to,
        employee_ids: formData.employee_ids,
      });
      showToast('Payroll run created successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error creating payroll run:', error);
      showToast(error?.userMessage || error?.message || 'Failed to create payroll run', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payroll-run-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Payroll Run</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Payroll Run Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., January 2024 Payroll"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date_from">From Date *</label>
              <input
                id="date_from"
                type="date"
                value={formData.date_from}
                onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="date_to">To Date *</label>
              <input
                id="date_to"
                type="date"
                value={formData.date_to}
                onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Payroll Run'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

