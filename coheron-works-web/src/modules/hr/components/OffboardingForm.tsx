import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './OffboardingForm.css';

interface OffboardingFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const OffboardingForm = ({ onClose, onSave, initialData }: OffboardingFormProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    last_date: '',
    reason: 'resignation',
    exit_interview_date: '',
    notes: '',
  });

  useEffect(() => {
    loadEmployees();
    if (initialData) {
      setFormData({
        employee_id: initialData.employee_id?.toString() || '',
        last_date: initialData.last_date ? initialData.last_date.split('T')[0] : '',
        reason: initialData.reason || 'resignation',
        exit_interview_date: initialData.exit_interview_date ? initialData.exit_interview_date.split('T')[0] : '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const loadEmployees = async () => {
    try {
      const data = await apiService.get<any[]>('employees').catch(() => []);
      setEmployees(data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        employee_id: parseInt(formData.employee_id),
        last_date: formData.last_date,
        reason: formData.reason,
        exit_interview_date: formData.exit_interview_date || null,
        notes: formData.notes || null,
      };

      if (initialData?.id) {
        await apiService.update('hr/offboarding', initialData.id, submitData);
        showToast('Offboarding updated successfully', 'success');
      } else {
        await apiService.create('hr/offboarding', submitData);
        showToast('Offboarding created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving offboarding:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save offboarding', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content offboarding-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Offboarding' : 'Create New Offboarding'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="employee_id">Employee *</label>
            <select
              id="employee_id"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              required
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="last_date">Last Working Date *</label>
              <input
                id="last_date"
                type="date"
                value={formData.last_date}
                onChange={(e) => setFormData({ ...formData, last_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason *</label>
              <select
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              >
                <option value="resignation">Resignation</option>
                <option value="termination">Termination</option>
                <option value="retirement">Retirement</option>
                <option value="end_of_contract">End of Contract</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="exit_interview_date">Exit Interview Date</label>
            <input
              id="exit_interview_date"
              type="date"
              value={formData.exit_interview_date}
              onChange={(e) => setFormData({ ...formData, exit_interview_date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Offboarding notes"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Offboarding' : 'Create Offboarding'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

