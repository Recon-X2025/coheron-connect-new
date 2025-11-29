import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/Button';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './ITSMForm.css';

interface ITSMFormProps {
  onClose: () => void;
  onSave: () => void;
  type: 'incident' | 'problem' | 'change';
  initialData?: any;
}

export const ITSMForm = ({ onClose, onSave, type, initialData }: ITSMFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    category: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        category: formData.category || null,
      };

      if (initialData?.id) {
        await apiService.update(`support-tickets/${type}s`, initialData.id, submitData);
        showToast(`${type} updated successfully`, 'success');
      } else {
        await apiService.create(`support-tickets/${type}s`, submitData);
        showToast(`${type} created successfully`, 'success');
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
      <div className="modal-content itsm-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit' : 'Create'} {type.charAt(0).toUpperCase() + type.slice(1)}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder={`Enter ${type} title`}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority *</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Category"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={6}
              placeholder={`Describe the ${type}`}
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update' : 'Create'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

