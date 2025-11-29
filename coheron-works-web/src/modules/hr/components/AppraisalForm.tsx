import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './AppraisalForm.css';

interface AppraisalFormProps {
  employees: any[];
  initialData?: any;
  onClose: () => void;
  onSave: () => void;
}

export const AppraisalForm = ({ employees, initialData, onClose, onSave }: AppraisalFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    manager_id: '',
    appraisal_period: '',
    deadline: '',
    appraisal_type: 'annual',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        employee_id: initialData.employee_id?.toString() || '',
        manager_id: initialData.manager_id?.toString() || '',
        appraisal_period: initialData.appraisal_period || '',
        deadline: initialData.deadline ? initialData.deadline.split('T')[0] : '',
        appraisal_type: initialData.appraisal_type || 'annual',
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        employee_id: parseInt(formData.employee_id),
        manager_id: parseInt(formData.manager_id),
        appraisal_period: formData.appraisal_period,
        deadline: formData.deadline,
        appraisal_type: formData.appraisal_type,
      };

      if (initialData?.id) {
        await apiService.update('appraisals', initialData.id, submitData);
        showToast('Appraisal updated successfully', 'success');
      } else {
        await apiService.create('appraisals', submitData);
        showToast('Appraisal created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving appraisal:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save appraisal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content appraisal-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Performance Appraisal' : 'New Performance Appraisal'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="appraisal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Employee *</label>
              <select
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Manager *</label>
              <select
                required
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              >
                <option value="">Select Manager</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Appraisal Period *</label>
              <input
                type="text"
                required
                value={formData.appraisal_period}
                onChange={(e) => setFormData({ ...formData, appraisal_period: e.target.value })}
                placeholder="e.g., Q1 2024, Annual 2024"
              />
            </div>
            <div className="form-group">
              <label>Deadline *</label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Appraisal Type</label>
            <select
              value={formData.appraisal_type}
              onChange={(e) => setFormData({ ...formData, appraisal_type: e.target.value })}
            >
              <option value="annual">Annual Review</option>
              <option value="quarterly">Quarterly Review</option>
              <option value="probation">Probation Review</option>
              <option value="promotion">Promotion Review</option>
            </select>
          </div>

          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Appraisal' : 'Create Appraisal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

