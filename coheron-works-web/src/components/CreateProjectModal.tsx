import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { projectService } from '../services/projectService';
import './CreateProjectModal.css';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProjectModal = ({ isOpen, onClose, onSuccess }: CreateProjectModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    project_type: 'scrum' as 'kanban' | 'scrum' | 'classic',
    lead_id: '',
    status: 'active' as 'active' | 'archived' | 'deleted',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Generate key from name if not provided
      const projectKey = formData.key || formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10);

      const projectData = {
        name: formData.name,
        key: projectKey,
        description: formData.description,
        project_type: formData.project_type,
        status: formData.status,
        lead_id: formData.lead_id ? parseInt(formData.lead_id) : undefined,
      };

      await projectService.createProject(projectData);
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        key: '',
        description: '',
        project_type: 'scrum',
        lead_id: '',
        status: 'active',
      });
    } catch (err: any) {
      // Use user-friendly error message from apiService
      const errorMessage = err.userMessage || 
                          err.response?.data?.error || 
                          err.response?.data?.message ||
                          err.message || 
                          'Failed to create project. Please try again.';
      
      setError(errorMessage);
      console.error('Error creating project:', err);
      
      // If it's a network error, provide additional guidance
      if (err.isNetworkError) {
        console.warn('Backend server may not be running. Please start the backend server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          {error && (
            <div className="form-error" style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              color: '#c33',
              fontSize: '14px'
            }}>
              <strong>Error:</strong> {error}
              {error.includes('Cannot connect to server') && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  Make sure the backend server is running. Check the terminal or run: <code>cd coheron-works-api && npm start</code>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Project Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Mobile App Redesign"
            />
          </div>

          <div className="form-group">
            <label htmlFor="key">Project Key *</label>
            <input
              type="text"
              id="key"
              name="key"
              value={formData.key}
              onChange={handleChange}
              required
              placeholder="e.g., MAR (auto-generated if empty)"
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
            />
            <small>Will be auto-generated from name if left empty</small>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Project description..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="project_type">Project Type</label>
              <select
                id="project_type"
                name="project_type"
                value={formData.project_type}
                onChange={handleChange}
              >
                <option value="scrum">Scrum</option>
                <option value="kanban">Kanban</option>
                <option value="classic">Classic</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lead_id">Lead ID (Optional)</label>
            <input
              type="number"
              id="lead_id"
              name="lead_id"
              value={formData.lead_id}
              onChange={handleChange}
              placeholder="User ID of project lead"
            />
          </div>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

