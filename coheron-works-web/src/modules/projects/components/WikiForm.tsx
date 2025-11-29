import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './WikiForm.css';

interface WikiFormProps {
  onClose: () => void;
  onSave: () => void;
  projectId: number;
  type: 'space' | 'page';
  spaceId?: number;
  initialData?: any;
}

export const WikiForm = ({ onClose, onSave, projectId, type, spaceId, initialData }: WikiFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    content: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'space') {
        const submitData = {
          project_id: projectId,
          name: formData.name,
          description: formData.description || null,
        };
        if (initialData?.id) {
          await apiService.update('projects/wiki/spaces', initialData.id, submitData);
          showToast('Knowledge space updated successfully', 'success');
        } else {
          await apiService.create('projects/wiki/spaces', submitData);
          showToast('Knowledge space created successfully', 'success');
        }
      } else {
        const submitData = {
          space_id: spaceId || initialData?.space_id,
          title: formData.title,
          content: formData.content || null,
        };
        if (initialData?.id) {
          await apiService.update('projects/wiki/pages', initialData.id, submitData);
          showToast('Wiki page updated successfully', 'success');
        } else {
          await apiService.create('projects/wiki/pages', submitData);
          showToast('Wiki page created successfully', 'success');
        }
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
      <div className="modal-content wiki-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit' : 'Create'} {type === 'space' ? 'Knowledge Space' : 'Wiki Page'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {type === 'space' ? (
            <>
              <div className="form-group">
                <label htmlFor="name">Space Name *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter space name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Space description"
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="title">Page Title *</label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Enter page title"
                />
              </div>
              <div className="form-group">
                <label htmlFor="content">Content</label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  placeholder="Page content (Markdown supported)"
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update' : 'Create'} {type === 'space' ? 'Space' : 'Page'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

