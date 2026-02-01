import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { projectService } from '../../../services/projectService';
import { showToast } from '../../../components/Toast';
import './SprintForm.css';

interface SprintFormProps {
  projectId: string;
  onClose: () => void;
  onSave: () => void;
}

export const SprintForm = ({ projectId, onClose, onSave }: SprintFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await projectService.createSprint(projectId, {
        name: formData.name,
        goal: formData.goal,
        start_date: formData.start_date,
        end_date: formData.end_date,
        state: 'future',
      });
      showToast('Sprint created successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to create sprint', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sprint-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Sprint</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sprint-form">
          <div className="form-group">
            <label>Sprint Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Sprint 1"
            />
          </div>

          <div className="form-group">
            <label>Goal</label>
            <textarea
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              rows={4}
              placeholder="Sprint goal..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
                min={formData.start_date}
              />
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Sprint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

