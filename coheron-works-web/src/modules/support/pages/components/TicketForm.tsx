import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { supportDeskService, type SupportTicket } from '../../../../services/supportDeskService';
import { showToast } from '../../../../components/Toast';
import './TicketForm.css';

interface TicketFormProps {
  onClose: () => void;
  onSave: () => void;
}

export const TicketForm = ({ onClose, onSave }: TicketFormProps) => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    ticket_type: 'issue' as SupportTicket['ticket_type'],
    priority: 'medium' as SupportTicket['priority'],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await supportDeskService.createTicket(formData);
      showToast('Ticket created successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to create ticket', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ticket-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Ticket</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-group">
            <label>Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={6}
              placeholder="Detailed description of the issue..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type *</label>
              <select
                value={formData.ticket_type}
                onChange={(e) => setFormData({ ...formData, ticket_type: e.target.value as SupportTicket['ticket_type'] })}
                required
              >
                <option value="issue">Issue</option>
                <option value="request">Request</option>
                <option value="change">Change</option>
                <option value="incident">Incident</option>
                <option value="problem">Problem</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as SupportTicket['priority'] })}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

