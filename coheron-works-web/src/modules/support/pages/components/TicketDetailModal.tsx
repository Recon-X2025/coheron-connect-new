import { useState, useEffect } from 'react';
import { X, Clock, User, Calendar, Tag } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { supportDeskService, type SupportTicket } from '../../../../services/supportDeskService';
import { showToast } from '../../../../components/Toast';
import './TicketDetailModal.css';

interface TicketDetailModalProps {
  ticketId: number;
  onClose: () => void;
  onUpdate: () => void;
}

export const TicketDetailModal = ({ ticketId, onClose, onUpdate }: TicketDetailModalProps) => {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const data = await supportDeskService.getTicket(ticketId);
      setTicket(data);
      setNewStatus(data.status);
    } catch (error: any) {
      showToast(error.message || 'Failed to load ticket details', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!ticket || newStatus === ticket.status) return;

    try {
      setUpdating(true);
      await supportDeskService.updateTicket(ticket.id, { status: newStatus as SupportTicket['status'] });
      showToast('Status updated successfully', 'success');
      onUpdate();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ticket Details</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="ticket-detail-content">
          <div className="ticket-detail-section">
            <div className="ticket-header-info">
              <h3>{ticket.subject}</h3>
              <div className="ticket-meta">
                <span className="ticket-number">#{ticket.ticket_number}</span>
                <span className={`ticket-type type-${ticket.ticket_type}`}>{ticket.ticket_type}</span>
              </div>
            </div>

            <div className="ticket-status-priority">
              <div className="status-group">
                <label>Status</label>
                {ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="status-select"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                ) : (
                  <span className="status-badge">{ticket.status}</span>
                )}
              </div>

              <div className="priority-group">
                <label>Priority</label>
                <span className="priority-badge">{ticket.priority}</span>
              </div>
            </div>
          </div>

          <div className="ticket-detail-section">
            <h4>Description</h4>
            <p>{ticket.description}</p>
          </div>

          <div className="ticket-detail-section">
            <h4>Details</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <Calendar size={16} />
                <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
              </div>
              {ticket.updated_at && (
                <div className="detail-item">
                  <Clock size={16} />
                  <span>Updated: {new Date(ticket.updated_at).toLocaleString()}</span>
                </div>
              )}
              {ticket.partner_name && (
                <div className="detail-item">
                  <User size={16} />
                  <span>Customer: {ticket.partner_name}</span>
                </div>
              )}
              {ticket.agent_name && (
                <div className="detail-item">
                  <User size={16} />
                  <span>Assigned: {ticket.agent_name}</span>
                </div>
              )}
              {ticket.team_name && (
                <div className="detail-item">
                  <Tag size={16} />
                  <span>Team: {ticket.team_name}</span>
                </div>
              )}
            </div>
          </div>

          {ticket.tags && ticket.tags.length > 0 && (
            <div className="ticket-detail-section">
              <h4>Tags</h4>
              <div className="tags-list">
                {ticket.tags.map((tag, index) => (
                  <span key={index} className="tag-badge">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {ticket.status !== 'resolved' && ticket.status !== 'closed' && newStatus !== ticket.status && (
            <div className="ticket-detail-actions">
              <Button variant="ghost" onClick={onClose} disabled={updating}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} disabled={updating}>
                {updating ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

