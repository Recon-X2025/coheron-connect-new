import { useState, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  AlertCircle,
  User,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supportDeskService, type SupportTicket, type CannedResponse } from '../services/supportDeskService';
import './AgentWorkbench.css';

type ViewMode = 'my-tickets' | 'team-tickets' | 'all-tickets' | 'sla-breaching';

export const AgentWorkbench: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('my-tickets');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'public' | 'private' | 'internal'>('public');
  const [, setSelectedCannedResponse] = useState<CannedResponse | null>(null);

  useEffect(() => {
    loadTickets();
    loadCannedResponses();
  }, [viewMode, statusFilter, priorityFilter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (searchTerm) params.search = searchTerm;
      
      // In a real app, viewMode would filter by assigned agent
      const data = await supportDeskService.getTickets(params);
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCannedResponses = async () => {
    try {
      const data = await supportDeskService.getCannedResponses({ is_public: true });
      setCannedResponses(data);
    } catch (error) {
      console.error('Error loading canned responses:', error);
    }
  };

  const handleTicketClick = async (ticket: SupportTicket) => {
    try {
      const fullTicket = await supportDeskService.getTicket(ticket.id);
      setSelectedTicket(fullTicket);
    } catch (error) {
      console.error('Error loading ticket details:', error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedTicket || !newNote.trim()) return;

    try {
      await supportDeskService.addNote(selectedTicket.id, {
        content: newNote,
        note_type: noteType,
      });
      setNewNote('');
      // Reload ticket
      const updated = await supportDeskService.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleUseCannedResponse = async (response: CannedResponse) => {
    if (!selectedTicket) return;

    try {
      await supportDeskService.useCannedResponse(response.id);
      setNewNote(response.content);
      setSelectedCannedResponse(response);
    } catch (error) {
      console.error('Error using canned response:', error);
    }
  };

  const handleUpdateStatus = async (status: SupportTicket['status']) => {
    if (!selectedTicket) return;

    try {
      await supportDeskService.updateTicket(selectedTicket.id, { status });
      const updated = await supportDeskService.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      loadTickets();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleUpdatePriority = async (priority: SupportTicket['priority']) => {
    if (!selectedTicket) return;

    try {
      await supportDeskService.updateTicket(selectedTicket.id, { priority });
      const updated = await supportDeskService.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      loadTickets();
    } catch (error) {
      console.error('Error updating priority:', error);
    }
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

  const getSlaStatus = (ticket: SupportTicket) => {
    const slaDeadline = (ticket as any).sla_resolution_deadline || (ticket as any).sla_deadline;
    if (!slaDeadline) return null;
    const deadline = new Date(slaDeadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return { status: 'breached', text: 'SLA Breached', color: '#dc2626' };
    if (hoursLeft < 4) return { status: 'critical', text: `${Math.round(hoursLeft)}h left`, color: '#ef4444' };
    if (hoursLeft < 24) return { status: 'warning', text: `${Math.round(hoursLeft)}h left`, color: '#f59e0b' };
    return { status: 'ok', text: `${Math.round(hoursLeft)}h left`, color: '#22c55e' };
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower) ||
        ticket.ticket_number.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="agent-workbench">
      <div className="workbench-header">
        <div>
          <h1>Agent Workbench</h1>
          <p className="workbench-subtitle">Manage and resolve support tickets</p>
        </div>
        <div className="workbench-actions">
          <Button variant="secondary" icon={<BarChart3 size={18} />}>
            Analytics
          </Button>
          <Button variant="secondary" icon={<Settings size={18} />}>
            Settings
          </Button>
        </div>
      </div>

      <div className="workbench-layout">
        {/* Left Sidebar - Ticket List */}
        <div className="workbench-sidebar">
          <div className="view-mode-selector">
            <button
              className={viewMode === 'my-tickets' ? 'active' : ''}
              onClick={() => setViewMode('my-tickets')}
            >
              <User size={16} />
              My Tickets
            </button>
            <button
              className={viewMode === 'team-tickets' ? 'active' : ''}
              onClick={() => setViewMode('team-tickets')}
            >
              <Users size={16} />
              Team
            </button>
            <button
              className={viewMode === 'all-tickets' ? 'active' : ''}
              onClick={() => setViewMode('all-tickets')}
            >
              <MessageSquare size={16} />
              All
            </button>
            <button
              className={viewMode === 'sla-breaching' ? 'active' : ''}
              onClick={() => setViewMode('sla-breaching')}
            >
              <AlertCircle size={16} />
              SLA Risk
            </button>
          </div>

          <div className="filters-section">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadTickets()}
              />
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Priority</label>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">All Priorities</option>
                <option value="p1">P1 - Critical</option>
                <option value="p2">P2 - High</option>
                <option value="p3">P3 - Medium</option>
                <option value="p4">P4 - Low</option>
                <option value="p5">P5 - Lowest</option>
              </select>
            </div>
          </div>

          <div className="tickets-list">
            {loading ? (
              <LoadingSpinner size="small" message="Loading tickets..." />
            ) : filteredTickets.length === 0 ? (
              <div className="empty-state">
                <MessageSquare size={32} />
                <p>No tickets found</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const slaStatus = getSlaStatus(ticket);
                return (
                  <div
                    key={ticket.id}
                    className={`ticket-item ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <div className="ticket-item-header">
                      <span className="ticket-number">#{ticket.ticket_number}</span>
                      {slaStatus && (
                        <span className="sla-badge" style={{ color: slaStatus.color }}>
                          {slaStatus.text}
                        </span>
                      )}
                    </div>
                    <h4 className="ticket-subject">{ticket.subject}</h4>
                    <div className="ticket-item-meta">
                      <span
                        className="priority-badge"
                        style={{
                          backgroundColor: `${getPriorityColor(ticket.priority)}20`,
                          color: getPriorityColor(ticket.priority),
                        }}
                      >
                        {ticket.priority}
                      </span>
                      <span className="ticket-date">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {ticket.partner_name && (
                      <div className="ticket-customer">{ticket.partner_name}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content - Ticket Details */}
        <div className="workbench-main">
          {selectedTicket ? (
            <div className="ticket-details">
              <div className="ticket-details-header">
                <div>
                  <h2>{selectedTicket.subject}</h2>
                  <div className="ticket-meta-row">
                    <span className="ticket-number-large">#{selectedTicket.ticket_number}</span>
                    <span className="ticket-type">{selectedTicket.ticket_type}</span>
                    {selectedTicket.partner_name && (
                      <span className="ticket-customer-name">{selectedTicket.partner_name}</span>
                    )}
                  </div>
                </div>
                <div className="ticket-actions-header">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as SupportTicket['status'])}
                    className="status-select"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => handleUpdatePriority(e.target.value as SupportTicket['priority'])}
                    className="priority-select"
                  >
                    <option value="p1">P1 - Critical</option>
                    <option value="p2">P2 - High</option>
                    <option value="p3">P3 - Medium</option>
                    <option value="p4">P4 - Low</option>
                    <option value="p5">P5 - Lowest</option>
                  </select>
                </div>
              </div>

              <div className="ticket-description-section">
                <h3>Description</h3>
                <p>{selectedTicket.description}</p>
              </div>

              <div className="ticket-notes-section">
                <div className="section-header">
                  <h3>Notes & Updates</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCannedResponses(!showCannedResponses)}
                  >
                    {showCannedResponses ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Canned Responses
                  </Button>
                </div>

                {showCannedResponses && (
                  <div className="canned-responses-panel">
                    {cannedResponses.map((response) => (
                      <div
                        key={response.id}
                        className="canned-response-item"
                        onClick={() => handleUseCannedResponse(response)}
                      >
                        <div className="canned-response-name">{response.name}</div>
                        <div className="canned-response-preview">{response.content.substring(0, 100)}...</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="add-note-form">
                  <div className="note-type-selector">
                    <button
                      className={noteType === 'public' ? 'active' : ''}
                      onClick={() => setNoteType('public')}
                    >
                      Public
                    </button>
                    <button
                      className={noteType === 'private' ? 'active' : ''}
                      onClick={() => setNoteType('private')}
                    >
                      Private
                    </button>
                    <button
                      className={noteType === 'internal' ? 'active' : ''}
                      onClick={() => setNoteType('internal')}
                    >
                      Internal
                    </button>
                  </div>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note or update..."
                    rows={4}
                  />
                  <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                    Add Note
                  </Button>
                </div>

                <div className="notes-list">
                  {selectedTicket.notes && selectedTicket.notes.length > 0 ? (
                    selectedTicket.notes.map((note) => (
                      <div key={note.id} className={`note-item note-${note.note_type}`}>
                        <div className="note-header">
                          <span className="note-author">{note.created_by_name || 'System'}</span>
                          <span className="note-type-badge">{note.note_type}</span>
                          <span className="note-date">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="note-content">{note.content}</div>
                      </div>
                    ))
                  ) : (
                    <p className="no-notes">No notes yet</p>
                  )}
                </div>
              </div>

              {selectedTicket.history && selectedTicket.history.length > 0 && (
                <div className="ticket-history-section">
                  <h3>History</h3>
                  <div className="history-list">
                    {selectedTicket.history.map((entry) => (
                      <div key={entry.id} className="history-item">
                        <span className="history-action">{entry.action}</span>
                        {entry.old_value && <span className="history-change">{entry.old_value} → {entry.new_value}</span>}
                        <span className="history-date">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-ticket-selected">
              <MessageSquare size={64} />
              <h3>Select a ticket to view details</h3>
              <p>Choose a ticket from the list to see full details and manage it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentWorkbench;

