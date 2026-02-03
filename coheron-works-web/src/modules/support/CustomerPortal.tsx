import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Search, LifeBuoy, BookOpen, HelpCircle, X, Inbox, Loader2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { LiveChatWidget } from '../../components/LiveChatWidget';
import './CustomerPortal.css';

const PORTAL_API = import.meta.env.PROD ? '/api/support/portal' : 'http://localhost:3000/api/support/portal';

interface PortalTicket {
    _id: string;
    ticket_number?: string;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
}

interface PortalKBArticle {
    _id: string;
    title: string;
    slug?: string;
    category?: string;
    excerpt?: string;
    created_at: string;
}

const portalFetch = async (path: string, options?: RequestInit) => {
    const token = localStorage.getItem('portalToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${PORTAL_API}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
};

export const CustomerPortal = () => {
    const [tickets, setTickets] = useState<PortalTicket[]>([]);
    const [kbArticles, setKbArticles] = useState<PortalKBArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateTicket, setShowCreateTicket] = useState(false);
    const [showKB, setShowKB] = useState(false);
    const [kbSearchTerm, setKbSearchTerm] = useState('');
    const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' });
    const chatOpenRef = useRef<(() => void) | null>(null);

    useEffect(() => { loadTickets(); }, []);

    useEffect(() => {
        if (kbSearchTerm) searchKB();
    }, [kbSearchTerm]);

    const loadTickets = async () => {
        try {
            setLoading(true);
            const data = await portalFetch('/tickets');
            setTickets(Array.isArray(data) ? data : []);
        } catch {
            // Not logged in or no tickets — show empty state
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    const searchKB = async () => {
        try {
            const data = await portalFetch(`/knowledge-base?q=${encodeURIComponent(kbSearchTerm)}`);
            setKbArticles(Array.isArray(data) ? data : []);
        } catch {
            setKbArticles([]);
        }
    };

    const handleCreateTicket = async () => {
        try {
            await portalFetch('/tickets', {
                method: 'POST',
                body: JSON.stringify(newTicket),
            });
            setShowCreateTicket(false);
            setNewTicket({ subject: '', description: '', priority: 'medium' });
            loadTickets();
        } catch (error) {
            console.error('Error creating ticket:', error);
        }
    };

    if (loading) {
        return (
            <div className="customer-portal">
                <div className="portal-loading"><Loader2 size={20} /> Loading portal…</div>
            </div>
        );
    }

    return (
        <div className="customer-portal">
            {/* Navbar */}
            <nav className="portal-nav">
                <div className="portal-nav-brand">
                    <LifeBuoy size={22} />
                    Support Portal
                </div>
                <div className="portal-nav-user">
                    <span>Welcome</span>
                    <Button size="sm" variant="secondary">Log In</Button>
                </div>
            </nav>

            <div className="portal-content">
                {/* Header */}
                <div className="portal-header">
                    <div>
                        <h1>How can we help?</h1>
                        <p>Search our knowledge base, create a ticket, or chat with us</p>
                    </div>
                    <div className="portal-header-actions">
                        <Button variant="secondary" icon={<BookOpen size={16} />} onClick={() => setShowKB(!showKB)}>
                            Knowledge Base
                        </Button>
                        <Button icon={<Plus size={16} />} onClick={() => setShowCreateTicket(true)}>
                            New Ticket
                        </Button>
                    </div>
                </div>

                {/* Quick action cards */}
                <div className="portal-actions-row">
                    <div className="portal-action-card" onClick={() => setShowCreateTicket(true)}>
                        <div className="portal-action-icon green"><Plus size={20} /></div>
                        <div>
                            <h3>Submit a Ticket</h3>
                            <p>Report an issue or request help</p>
                        </div>
                    </div>
                    <div className="portal-action-card" onClick={() => setShowKB(true)}>
                        <div className="portal-action-icon blue"><BookOpen size={20} /></div>
                        <div>
                            <h3>Knowledge Base</h3>
                            <p>Browse articles and guides</p>
                        </div>
                    </div>
                    <div className="portal-action-card" onClick={() => chatOpenRef.current?.()}>
                        <div className="portal-action-icon amber"><MessageSquare size={20} /></div>
                        <div>
                            <h3>Live Chat</h3>
                            <p>Chat with our support team</p>
                        </div>
                    </div>
                </div>

                {/* KB search panel */}
                {showKB && (
                    <div className="portal-panel">
                        <div className="portal-panel-header">
                            <h2>Search Knowledge Base</h2>
                            <button className="portal-close-btn" onClick={() => setShowKB(false)}><X size={18} /></button>
                        </div>
                        <div className="portal-search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search for articles, FAQs, or how-to guides…"
                                value={kbSearchTerm}
                                onChange={(e) => setKbSearchTerm(e.target.value)}
                            />
                        </div>
                        {kbArticles.length > 0 && (
                            <div className="portal-kb-results">
                                {kbArticles.slice(0, 5).map((article, idx) => (
                                    <div key={article._id || idx} className="portal-kb-item">
                                        <HelpCircle size={18} />
                                        <div>
                                            <h4>{article.title}</h4>
                                            {article.excerpt && <p>{article.excerpt}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Create ticket panel */}
                {showCreateTicket && (
                    <div className="portal-panel">
                        <div className="portal-panel-header">
                            <h2>Create New Ticket</h2>
                            <button className="portal-close-btn" onClick={() => setShowCreateTicket(false)}><X size={18} /></button>
                        </div>
                        <div className="portal-form-group">
                            <label>Subject</label>
                            <input
                                type="text"
                                value={newTicket.subject}
                                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                placeholder="Brief description of your issue"
                            />
                        </div>
                        <div className="portal-form-group">
                            <label>Description</label>
                            <textarea
                                value={newTicket.description}
                                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                placeholder="Please provide detailed information about your issue…"
                                rows={5}
                            />
                        </div>
                        <div className="portal-form-group">
                            <label>Priority</label>
                            <select
                                value={newTicket.priority}
                                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="portal-form-actions">
                            <Button variant="secondary" onClick={() => setShowCreateTicket(false)}>Cancel</Button>
                            <Button onClick={handleCreateTicket} disabled={!newTicket.subject || !newTicket.description}>
                                Create Ticket
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tickets list */}
                <div className="portal-tickets-section">
                    <h2>My Tickets</h2>
                    <div className="portal-tickets-card">
                        <div className="portal-tickets-toolbar">
                            <div className="portal-search-box">
                                <Search size={16} />
                                <input type="text" placeholder="Search tickets…" />
                            </div>
                            <select className="portal-filter-select">
                                <option>All Statuses</option>
                                <option>Open</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                                <option>Closed</option>
                            </select>
                        </div>

                        {tickets.length === 0 ? (
                            <div className="portal-empty-state">
                                <Inbox size={40} />
                                <p>No tickets yet. Create your first ticket to get started.</p>
                            </div>
                        ) : (
                            <table className="portal-table">
                                <thead>
                                    <tr>
                                        <th>Ticket ID</th>
                                        <th>Subject</th>
                                        <th>Created</th>
                                        <th className="center">Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((ticket, idx) => (
                                        <tr key={ticket._id || idx}>
                                            <td className="portal-ticket-id">#{ticket.ticket_number || ticket._id.slice(-6)}</td>
                                            <td className="portal-ticket-subject">{ticket.subject}</td>
                                            <td className="portal-ticket-date">{new Date(ticket.created_at).toLocaleDateString()}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`portal-status-badge ${ticket.status}`}>
                                                    {ticket.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                <Button size="sm" variant="ghost" icon={<MessageSquare size={14} />}>View</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <LiveChatWidget visitorName="Customer" openRef={chatOpenRef} />
        </div>
    );
};
