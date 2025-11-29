import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './GoalForm.css';

interface GoalFormProps {
  onClose: () => void;
  onSave: () => void;
  employeeId?: number;
  initialData?: any;
}

export const GoalForm = ({ onClose, onSave, employeeId, initialData }: GoalFormProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: employeeId || '',
    title: '',
    description: '',
    goal_type: 'okr',
    target_value: '',
    current_value: '0',
    status: 'on_track',
    due_date: '',
  });

  useEffect(() => {
    loadEmployees();
    if (initialData) {
      setFormData({
        employee_id: initialData.employee_id || employeeId || '',
        title: initialData.title || '',
        description: initialData.description || '',
        goal_type: initialData.goal_type || 'okr',
        target_value: initialData.target_value?.toString() || '',
        current_value: initialData.current_value?.toString() || '0',
        status: initialData.status || 'on_track',
        due_date: initialData.due_date ? initialData.due_date.split('T')[0] : '',
      });
    }
  }, [initialData, employeeId]);

  const loadEmployees = async () => {
    try {
      const data = await apiService.get<any[]>('employees');
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
        ...formData,
        employee_id: parseInt(formData.employee_id as string),
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        current_value: parseFloat(formData.current_value) || 0,
        due_date: formData.due_date || null,
      };

      if (initialData?.id) {
        await apiService.update('goals', initialData.id, submitData);
        showToast('Goal updated successfully', 'success');
      } else {
        await apiService.create('goals', submitData);
        showToast('Goal created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save goal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content goal-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Goal' : 'Create New Goal'}</h2>
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
              disabled={!!employeeId}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Enter goal title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Enter goal description"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="goal_type">Goal Type *</label>
              <select
                id="goal_type"
                value={formData.goal_type}
                onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                required
              >
                <option value="okr">OKR</option>
                <option value="kpi">KPI</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="target_value">Target Value</label>
              <input
                id="target_value"
                type="number"
                step="0.01"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="current_value">Current Value</label>
              <input
                id="current_value"
                type="number"
                step="0.01"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                placeholder="0.00"
              />
            </div>
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

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Goal' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

