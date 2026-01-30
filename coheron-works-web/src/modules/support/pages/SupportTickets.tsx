import { useState, useEffect } from 'react';
import { Search, Plus, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { supportDeskService, type SupportTicket } from '../../../services/supportDeskService';
import { TicketForm } from './components/TicketForm';
import { TicketDetailModal } from './components/TicketDetailModal';
import './SupportTickets.css';

export const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      console.error(null);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const data = await supportDeskService.getTickets(params);
      setTickets(data);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      console.error(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const getStatusIcon = (status: SupportTicket['status']) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return <CheckCircle size={18} className="status-icon resolved" />;
      case 'in_progress':
        return <Clock size={18} className="status-icon in-progress" />;
      case 'open':
        return <AlertCircle size={18} className="status-icon open" />;
      default:
        return <MessageSquare size={18} />;
    }
  };

  const getStatusLabel = (status: SupportTicket['status']) => {
    const labels: Record<SupportTicket['status'], string> = {
      open: 'Open',
      in_progress: 'In Progress',
      pending: 'Pending',
      resolved: 'Resolved',
      closed: 'Closed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    const colors: Record<string, string> = {
      low: '#64748b',
      p5: '#64748b',
      medium: '#f59e0b',
      p4: '#f59e0b',
      p3: '#f59e0b',
      high: '#ef4444',
      p2: '#ef4444',
      urgent: '#dc2626',
      p1: '#dc2626',
    };
    return colors[priority] || '#64748b';
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="support-tickets-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading support tickets..." />
        </div>
      </div>
    );
  }

  return (
    <div className="support-tickets-page">
      <div className="container">
        <div className="tickets-header">
          <div>
            <h1>Support Tickets</h1>
            <p className="tickets-subtitle">{filteredTickets.length} ticket(s) found</p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowTicketForm(true)}>New Ticket</Button>
        </div>

        <div className="tickets-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="status-filters">
            <button
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={statusFilter === 'open' ? 'active' : ''}
              onClick={() => setStatusFilter('open')}
            >
              Open
            </button>
            <button
              className={statusFilter === 'in_progress' ? 'active' : ''}
              onClick={() => setStatusFilter('in_progress')}
            >
              In Progress
            </button>
            <button
              className={statusFilter === 'resolved' ? 'active' : ''}
              onClick={() => setStatusFilter('resolved')}
            >
              Resolved
            </button>
          </div>
        </div>

        <div className="tickets-list">
          {filteredTickets.length === 0 ? (
            <Card className="empty-tickets">
              <MessageSquare size={48} />
              <p>No tickets found</p>
              <p className="empty-note">Create a new ticket to get support</p>
            </Card>
          ) : (
            filteredTickets.map((ticket) => (
              <Card key={ticket.id} className="ticket-card" hover>
                <div className="ticket-header">
                  <div className="ticket-title-section">
                    <h3>{ticket.subject}</h3>
                    <div className="ticket-meta">
                      <span className="ticket-number">#{ticket.ticket_number}</span>
                      <span className="ticket-date">
                        Created: {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                      {ticket.partner_name && (
                        <span className="ticket-customer">Customer: {ticket.partner_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="ticket-status-section">
                    <span
                      className="priority-badge"
                      style={{
                        backgroundColor: `${getPriorityColor(ticket.priority)}20`,
                        color: getPriorityColor(ticket.priority),
                      }}
                    >
                      {ticket.priority}
                    </span>
                    <div
                      className="status-badge"
                      style={{
                        backgroundColor:
                          ticket.status === 'resolved' || ticket.status === 'closed'
                            ? '#e8f5e9'
                            : ticket.status === 'in_progress'
                            ? '#fff3e0'
                            : '#fee',
                        color:
                          ticket.status === 'resolved' || ticket.status === 'closed'
                            ? '#388e3c'
                            : ticket.status === 'in_progress'
                            ? '#f57c00'
                            : '#d32f2f',
                      }}
                    >
                      {getStatusIcon(ticket.status)}
                      {getStatusLabel(ticket.status)}
                    </div>
                  </div>
                </div>
                <p className="ticket-description">{ticket.description}</p>
                <div className="ticket-actions">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(ticket.id)}>
                    View Details
                  </Button>
                  {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(ticket.id)}>
                      Update Status
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {showTicketForm && (
          <TicketForm
            onClose={() => setShowTicketForm(false)}
            onSave={() => {
              setShowTicketForm(false);
              loadTickets();
            }}
          />
        )}

        {selectedTicketId && (
          <TicketDetailModal
            ticketId={selectedTicketId}
            onClose={() => setSelectedTicketId(null)}
            onUpdate={() => {
              setSelectedTicketId(null);
              loadTickets();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
