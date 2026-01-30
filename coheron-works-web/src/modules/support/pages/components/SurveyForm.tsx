import { useState } from 'react';
import { X } from 'lucide-react';
import { supportDeskService, type Survey } from '../../../../services/supportDeskService';
import { showToast } from '../../../../components/Toast';
import './SurveyForm.css';

interface SurveyFormProps {
  survey?: Survey;
  onClose: () => void;
  onSave: () => void;
}

export const SurveyForm = ({ survey, onClose, onSave }: SurveyFormProps) => {
  const [formData, setFormData] = useState({
    name: survey?.name || '',
    survey_type: survey?.survey_type || 'csat' as 'csat' | 'ces' | 'nps' | 'custom',
    description: survey?.description || '',
    trigger_event: survey?.trigger_event || '',
    is_active: survey?.is_active !== false,
    questions: survey?.questions || {},
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Please enter a survey name', 'error');
      return;
    }

    setLoading(true);
    try {
      if (survey) {
        await supportDeskService.updateSurvey(survey.id, formData);
        showToast('Survey updated successfully', 'success');
      } else {
        await supportDeskService.createSurvey(formData);
        showToast('Survey created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save survey:', error);
      showToast(error?.message || 'Failed to save survey. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content survey-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{survey ? 'Edit Survey' : 'New Survey'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Survey Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Customer Satisfaction Survey"
            />
          </div>

          <div className="form-group">
            <label htmlFor="survey_type">Survey Type *</label>
            <select
              id="survey_type"
              name="survey_type"
              required
              value={formData.survey_type}
              onChange={(e) => setFormData({ ...formData, survey_type: e.target.value as any })}
            >
              <option value="csat">CSAT (Customer Satisfaction)</option>
              <option value="ces">CES (Customer Effort Score)</option>
              <option value="nps">NPS (Net Promoter Score)</option>
              <option value="custom">Custom Survey</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Survey description and instructions..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="trigger_event">Trigger Event</label>
            <select
              id="trigger_event"
              name="trigger_event"
              value={formData.trigger_event}
              onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })}
            >
              <option value="">Manual</option>
              <option value="ticket_resolved">Ticket Resolved</option>
              <option value="ticket_closed">Ticket Closed</option>
              <option value="order_delivered">Order Delivered</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
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
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : survey ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

