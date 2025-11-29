import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './OnboardingForm.css';

interface OnboardingFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const OnboardingForm = ({ onClose, onSave, initialData }: OnboardingFormProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: new Date().toISOString().split('T')[0],
    department_id: '',
    position: '',
    notes: '',
  });

  useEffect(() => {
    loadEmployees();
    if (initialData) {
      setFormData({
        employee_id: initialData.employee_id?.toString() || '',
        start_date: initialData.start_date ? initialData.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        department_id: initialData.department_id?.toString() || '',
        position: initialData.position || '',
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
        start_date: formData.start_date,
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
        position: formData.position || null,
        notes: formData.notes || null,
      };

      if (initialData?.id) {
        await apiService.update('hr/onboarding', initialData.id, submitData);
        showToast('Onboarding updated successfully', 'success');
      } else {
        await apiService.create('hr/onboarding', submitData);
        showToast('Onboarding created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving onboarding:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save onboarding', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content onboarding-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Onboarding' : 'Create New Onboarding'}</h2>
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
              <label htmlFor="position">Position</label>
              <input
                id="position"
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Job position"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Onboarding notes"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Onboarding' : 'Create Onboarding'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

