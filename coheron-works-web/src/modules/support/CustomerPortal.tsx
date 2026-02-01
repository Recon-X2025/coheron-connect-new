import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Search, LifeBuoy, BookOpen, HelpCircle, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supportDeskService, type SupportTicket, type KBArticle } from '../../services/supportDeskService';
import { LiveChatWidget } from '../../components/LiveChatWidget';
import './CustomerPortal.css';

export const CustomerPortal = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateTicket, setShowCreateTicket] = useState(false);
    const [showKB, setShowKB] = useState(false);
    const [kbSearchTerm, setKbSearchTerm] = useState('');
    const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' as const });

    useEffect(() => {
        loadTickets();
    }, []);

    useEffect(() => {
        if (kbSearchTerm) {
            searchKB();
        }
    }, [kbSearchTerm]);

    const loadTickets = async () => {
        try {
            setLoading(true);
            // In a real app, filter by logged-in customer
            const data = await supportDeskService.getTickets();
            setTickets(data);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchKB = async () => {
        try {
            const data = await supportDeskService.getKBArticles({ search: kbSearchTerm, status: 'published', is_public: true });
            setKbArticles(data);
        } catch (error) {
            console.error('Error searching KB:', error);
        }
    };

    const handleCreateTicket = async () => {
        try {
            await supportDeskService.createTicket(newTicket);
            setShowCreateTicket(false);
            setNewTicket({ subject: '', description: '', priority: 'medium' });
            loadTickets();
        } catch (error) {
            console.error('Error creating ticket:', error);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="portal-page bg-gray-50 min-h-screen">
            <nav className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
                        <LifeBuoy />
                        <span>Support Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Logged in as John Doe</span>
                        <Button size="sm" variant="secondary">Log Out</Button>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto py-10 px-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Support Portal</h1>
                        <p className="text-gray-500 mt-1">Get help, search knowledge base, or create a ticket</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" icon={<BookOpen size={18} />} onClick={() => setShowKB(!showKB)}>
                            Knowledge Base
                        </Button>
                        <Button icon={<Plus size={18} />} onClick={() => setShowCreateTicket(true)}>
                            Create Ticket
                        </Button>
                    </div>
                </div>

                {/* KB Search Section */}
                {showKB && (
                    <Card className="kb-search-section mb-6">
                        <div className="kb-search-header">
                            <h2>Search Knowledge Base</h2>
                            <button onClick={() => setShowKB(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="kb-search-box">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Search for articles, FAQs, or how-to guides..."
                                value={kbSearchTerm}
                                onChange={(e) => setKbSearchTerm(e.target.value)}
                            />
                        </div>
                        {kbArticles.length > 0 && (
                            <div className="kb-results">
                                {kbArticles.slice(0, 5).map((article, idx) => (
                                    <div key={article.id || (article as any)._id || idx} className="kb-result-item">
                                        <HelpCircle size={18} />
                                        <div>
                                            <h4>{article.title}</h4>
                                            {article.summary && <p>{article.summary}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* Create Ticket Modal */}
                {showCreateTicket && (
                    <Card className="create-ticket-modal mb-6">
                        <div className="modal-header">
                            <h2>Create New Ticket</h2>
                            <button onClick={() => setShowCreateTicket(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-content">
                            <div className="form-group">
                                <label>Subject *</label>
                                <input
                                    type="text"
                                    value={newTicket.subject}
                                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                    placeholder="Brief description of your issue"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    value={newTicket.description}
                                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                    placeholder="Please provide detailed information about your issue..."
                                    rows={6}
                                />
                            </div>
                            <div className="form-group">
                                <label>Priority</label>
                                <select
                                    value={newTicket.priority}
                                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <Button variant="secondary" onClick={() => setShowCreateTicket(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateTicket}
                                    disabled={!newTicket.subject || !newTicket.description}
                                >
                                    Create Ticket
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">My Tickets</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <select className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option>All Statuses</option>
                            <option>Open</option>
                            <option>Closed</option>
                        </select>
                    </div>

                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left p-4 font-medium text-gray-600">Ticket ID</th>
                                <th className="text-left p-4 font-medium text-gray-600">Subject</th>
                                <th className="text-left p-4 font-medium text-gray-600">Created</th>
                                <th className="text-center p-4 font-medium text-gray-600">Status</th>
                                <th className="text-right p-4 font-medium text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No tickets found. Create your first ticket to get started.
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((ticket, idx) => (
                                    <tr key={ticket.id || (ticket as any)._id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-500">#{ticket.ticket_number}</td>
                                        <td className="p-4 font-medium text-gray-900">{ticket.subject}</td>
                                        <td className="p-4 text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                ticket.status === 'resolved' || ticket.status === 'closed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : ticket.status === 'in_progress'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button size="sm" variant="ghost" icon={<MessageSquare size={14} />}>
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Live Chat Widget */}
            <LiveChatWidget visitorName="Customer" />
        </div>
    );
};
