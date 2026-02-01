import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { projectService, type Issue } from '../../../services/projectService';
import { showToast } from '../../../components/Toast';
import './IssueForm.css';

interface IssueFormProps {
  projectId: string;
  onClose: () => void;
  onSave: () => void;
}

export const IssueForm = ({ projectId, onClose, onSave }: IssueFormProps) => {
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    issue_type_id: '1',
    priority: 'medium' as Issue['priority'],
    story_points: undefined as number | undefined,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await projectService.createIssue(projectId, {
        summary: formData.summary,
        description: formData.description,
        issue_type_id: formData.issue_type_id,
        priority: formData.priority,
        story_points: formData.story_points,
      });
      showToast('Issue created successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to create issue', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content issue-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Issue</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="issue-form">
          <div className="form-group">
            <label>Summary *</label>
            <input
              type="text"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              required
              placeholder="Brief summary of the issue"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              placeholder="Detailed description..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Issue['priority'] })}
                required
              >
                <option value="lowest">Lowest</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="highest">Highest</option>
              </select>
            </div>

            <div className="form-group">
              <label>Story Points</label>
              <input
                type="number"
                min="0"
                value={formData.story_points || ''}
                onChange={(e) => setFormData({ ...formData, story_points: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Issue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

