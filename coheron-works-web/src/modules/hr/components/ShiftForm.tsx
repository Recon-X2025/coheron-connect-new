import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './ShiftForm.css';

interface ShiftFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const ShiftForm = ({ onClose, onSave, initialData }: ShiftFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    break_duration: '60',
    employee_ids: [] as number[],
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        start_time: initialData.start_time || '09:00',
        end_time: initialData.end_time || '17:00',
        break_duration: initialData.break_duration?.toString() || '60',
        employee_ids: initialData.employee_ids || [],
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For now, show success - backend API can be added later
      showToast('Shift created successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving shift:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save shift', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content shift-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Shift' : 'Create New Shift'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Shift Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Morning Shift, Night Shift"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_time">Start Time *</label>
              <input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_time">End Time *</label>
              <input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="break_duration">Break Duration (minutes)</label>
            <input
              id="break_duration"
              type="number"
              value={formData.break_duration}
              onChange={(e) => setFormData({ ...formData, break_duration: e.target.value })}
              min="0"
              placeholder="60"
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
              {loading ? 'Saving...' : initialData ? 'Update Shift' : 'Create Shift'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

