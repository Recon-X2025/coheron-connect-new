import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  Users,
  DollarSign,
  Clock,
  
  
  
  Edit3,
  Trash2,
  X,
  BarChart3,
  UserCheck,
  Ticket,
  Video,
  Building,
  Tag,
  ArrowLeft,
  
  
  
} from 'lucide-react';

const API_BASE = '/api/marketing/events';
const getToken = () => localStorage.getItem('token') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

interface MarketingEvent {
  _id: string;
  event_name: string;
  event_type: string;
  description: string;
  venue?: string;
  platform_url?: string;
  start_date: string;
  end_date: string;
  max_attendees: number;
  registration_open: boolean;
  ticket_types: { name: string; price: number; quantity: number; sold: number }[];
  status: string;
  banner_url?: string;
  tags: string[];
  created_at: string;
}

interface Registration {
  _id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  company?: string;
  ticket_type: string;
  payment_status: string;
  check_in_status: string;
  check_in_time?: string;
  registration_date: string;
}

interface Session {
  _id: string;
  title: string;
  description: string;
  speaker_name: string;
  start_time: string;
  end_time: string;
  room?: string;
  track?: string;
  max_attendees: number;
  registered_count: number;
}

interface Analytics {
  total_registrations: number;
  checked_in: number;
  check_in_rate: string | number;
  paid_registrations: number;
  total_revenue: number;
  total_capacity: number;
  tickets_sold: number;
  fill_rate: string | number;
  session_count: number;
}

type View = 'list' | 'detail';
type DetailTab = 'overview' | 'sessions' | 'registrations' | 'analytics';

const statusColors: Record<string, string> = {
  draft: '#939393', published: '#3b82f6', ongoing: '#00C971', completed: '#22c55e', cancelled: '#ef4444',
  pending: '#f59e0b', paid: '#00C971', refunded: '#ef4444', free: '#3b82f6',
  not_checked_in: '#939393', checked_in: '#00C971',
};

const eventTypeIcons: Record<string, React.ReactNode> = {
  conference: <Building size={16} />, webinar: <Video size={16} />, workshop: <Users size={16} />,
  meetup: <Users size={16} />, tradeshow: <Tag size={16} />,
};

export const EventManagement: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Detail state
  const [selectedEvent, setSelectedEvent] = useState<MarketingEvent | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MarketingEvent | null>(null);
  const [form, setForm] = useState({
    event_name: '', event_type: 'conference', description: '', venue: '', platform_url: '',
    start_date: '', end_date: '', max_attendees: 100, registration_open: false, status: 'draft',
    ticket_types: [{ name: 'General', price: 0, quantity: 100, sold: 0 }],
    tags: [] as string[],
  });

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiFetch(`?${params}`);
      setEvents(data.events || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, [searchTerm, statusFilter]);

  const openDetail = async (event: MarketingEvent) => {
    setSelectedEvent(event);
    setDetailTab('overview');
    setView('detail');
    try {
      const [sessData, regData, anlData] = await Promise.all([
        apiFetch(`/${event._id}/sessions`),
        apiFetch(`/${event._id}/registrations`),
        apiFetch(`/${event._id}/analytics`),
      ]);
      setSessions(sessData || []);
      setRegistrations(regData.registrations || []);
      setAnalytics(anlData);
    } catch (e) { console.error(e); }
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (editingEvent) {
        await apiFetch(`/${editingEvent._id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false);
      setEditingEvent(null);
      loadEvents();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try { await apiFetch(`/${id}`, { method: 'DELETE' }); loadEvents(); } catch (e) { console.error(e); }
  };

  const handleCheckIn = async (regId: string) => {
    try {
      await apiFetch(`/registrations/${regId}/check-in`, { method: 'POST' });
      if (selectedEvent) {
        const regData = await apiFetch(`/${selectedEvent._id}/registrations`);
        setRegistrations(regData.registrations || []);
        const anlData = await apiFetch(`/${selectedEvent._id}/analytics`);
        setAnalytics(anlData);
      }
    } catch (e) { console.error(e); }
  };

  const openCreateForm = () => {
    setEditingEvent(null);
    setForm({ event_name: '', event_type: 'conference', description: '', venue: '', platform_url: '', start_date: '', end_date: '', max_attendees: 100, registration_open: false, status: 'draft', ticket_types: [{ name: 'General', price: 0, quantity: 100, sold: 0 }], tags: [] });
    setShowForm(true);
  };

  const openEditForm = (event: MarketingEvent) => {
    setEditingEvent(event);
    setForm({
      event_name: event.event_name, event_type: event.event_type, description: event.description,
      venue: event.venue || '', platform_url: event.platform_url || '',
      start_date: event.start_date?.slice(0, 16) || '', end_date: event.end_date?.slice(0, 16) || '',
      max_attendees: event.max_attendees, registration_open: event.registration_open,
      status: event.status, ticket_types: event.ticket_types || [], tags: event.tags || [],
    });
    setShowForm(true);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, color: '#939393', marginBottom: 6, fontWeight: 500 };
  const cardStyle: React.CSSProperties = { background: '#141414', borderRadius: 12, border: '1px solid #222', padding: 20 };

  // ===== DETAIL VIEW =====
  if (view === 'detail' && selectedEvent) {
    return (
      <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
        <button onClick={() => { setView('list'); loadEvents(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#939393', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to Events
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              {eventTypeIcons[selectedEvent.event_type]}
              <span style={{ fontSize: 12, color: '#939393', textTransform: 'capitalize' }}>{selectedEvent.event_type}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${statusColors[selectedEvent.status]}22`, color: statusColors[selectedEvent.status], fontWeight: 600 }}>{selectedEvent.status}</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{selectedEvent.event_name}</h1>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#939393' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {new Date(selectedEvent.start_date).toLocaleDateString()}</span>
              {selectedEvent.venue && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {selectedEvent.venue}</span>}
            </div>
          </div>
          <button onClick={() => openEditForm(selectedEvent)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', fontSize: 13, cursor: 'pointer' }}>
            <Edit3 size={14} /> Edit
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #222', paddingBottom: 0 }}>
          {(['overview', 'sessions', 'registrations', 'analytics'] as DetailTab[]).map(tab => (
            <button key={tab} onClick={() => setDetailTab(tab)} style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'transparent', borderBottom: detailTab === tab ? '2px solid #00C971' : '2px solid transparent',
              color: detailTab === tab ? '#00C971' : '#939393', textTransform: 'capitalize',
            }}>{tab}</button>
          ))}
        </div>

        {/* Tab content */}
        {detailTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Description</h3>
              <p style={{ color: '#939393', fontSize: 14, lineHeight: 1.6 }}>{selectedEvent.description || 'No description provided.'}</p>
            </div>
            <div>
              <div style={{ ...cardStyle, marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Ticket Types</h3>
                {(selectedEvent.ticket_types || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 13 }}>
                    <span>{t.name}</span>
                    <span style={{ color: '#00C971' }}>{t.price > 0 ? `$${t.price}` : 'Free'} ({t.sold}/{t.quantity})</span>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Details</h3>
                <div style={{ fontSize: 13, color: '#939393', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>Max Attendees: {selectedEvent.max_attendees}</div>
                  <div>Registration: {selectedEvent.registration_open ? 'Open' : 'Closed'}</div>
                  <div>Start: {new Date(selectedEvent.start_date).toLocaleString()}</div>
                  <div>End: {new Date(selectedEvent.end_date).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {detailTab === 'sessions' && (
          <div>
            {sessions.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
                <Clock size={32} color="#333" />
                <p style={{ color: '#939393', marginTop: 8 }}>No sessions scheduled</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map(s => (
                  <div key={s._id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{s.title}</div>
                        <div style={{ fontSize: 13, color: '#939393', marginTop: 4 }}>{s.speaker_name}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#939393', textAlign: 'right' }}>
                        <div>{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {s.room && <div>{s.room}</div>}
                      </div>
                    </div>
                    {s.description && <p style={{ fontSize: 13, color: '#777', marginTop: 8 }}>{s.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {detailTab === 'registrations' && (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    {['Name', 'Email', 'Ticket', 'Payment', 'Check-in', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#939393', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#555' }}>No registrations yet</td></tr>
                  ) : (
                    registrations.map(reg => (
                      <tr key={reg._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{reg.attendee_name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#939393' }}>{reg.attendee_email}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{reg.ticket_type}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${statusColors[reg.payment_status]}22`, color: statusColors[reg.payment_status], fontWeight: 600 }}>{reg.payment_status}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${statusColors[reg.check_in_status]}22`, color: statusColors[reg.check_in_status], fontWeight: 600 }}>
                            {reg.check_in_status === 'checked_in' ? 'Checked In' : 'Not Checked In'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {reg.check_in_status !== 'checked_in' && (
                            <button onClick={() => handleCheckIn(reg._id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#00C971', color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <UserCheck size={12} /> Check In
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {detailTab === 'analytics' && analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Total Registrations', value: analytics.total_registrations, icon: <Users size={20} color="#3b82f6" /> },
              { label: 'Checked In', value: `${analytics.checked_in} (${analytics.check_in_rate}%)`, icon: <UserCheck size={20} color="#00C971" /> },
              { label: 'Revenue', value: `$${analytics.total_revenue.toLocaleString()}`, icon: <DollarSign size={20} color="#f59e0b" /> },
              { label: 'Tickets Sold', value: `${analytics.tickets_sold}/${analytics.total_capacity}`, icon: <Ticket size={20} color="#8b5cf6" /> },
              { label: 'Fill Rate', value: `${analytics.fill_rate}%`, icon: <BarChart3 size={20} color="#ec4899" /> },
              { label: 'Sessions', value: analytics.session_count, icon: <Clock size={20} color="#06b6d4" /> },
            ].map((stat, i) => (
              <div key={i} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>{stat.icon}<span style={{ color: '#939393', fontSize: 13 }}>{stat.label}</span></div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Event Management</h1>
          <p style={{ color: '#939393', margin: '4px 0 0', fontSize: 14 }}>Plan, manage, and track marketing events</p>
        </div>
        <button onClick={openCreateForm} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> Create Event
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#141414', borderRadius: 8, padding: '10px 14px', border: '1px solid #222', flex: 1, maxWidth: 400 }}>
          <Search size={16} color="#939393" />
          <input placeholder="Search events..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #222', background: '#141414', color: '#fff', fontSize: 13, outline: 'none' }}>
          <option value="">All Status</option>
          {['draft', 'published', 'ongoing', 'completed', 'cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Event Cards */}
      {loading ? (
        <div style={{ color: '#939393', textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : events.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 60 }}>
          <Calendar size={48} color="#333" />
          <p style={{ color: '#939393', marginTop: 16 }}>No events found. Create your first event.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {events.map(event => (
            <div key={event._id} onClick={() => openDetail(event)} style={{ ...cardStyle, cursor: 'pointer', transition: 'all 0.15s' }}>
              {event.banner_url && (
                <img src={event.banner_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {eventTypeIcons[event.event_type]}
                    <span style={{ fontSize: 11, textTransform: 'capitalize', color: '#939393' }}>{event.event_type}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${statusColors[event.status]}22`, color: statusColors[event.status], fontWeight: 600 }}>{event.status}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{event.event_name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#939393' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(event.start_date).toLocaleDateString()}</span>
                {event.venue && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {event.venue}</span>}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {event.max_attendees}</span>
              </div>
              {event.ticket_types && event.ticket_types.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#00C971' }}>
                  {event.ticket_types.reduce((s, t) => s + t.sold, 0)} tickets sold
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => openEditForm(event)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit3 size={11} /> Edit
                </button>
                <button onClick={() => handleDelete(event._id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: '#ef4444', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#141414', borderRadius: 16, padding: 32, width: 560, border: '1px solid #222', maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{editingEvent ? 'Edit Event' : 'Create Event'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#939393" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Event Name</label>
                <input style={inputStyle} value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="Annual Conference 2026" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Event Type</label>
                  <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} style={inputStyle}>
                    {['conference', 'webinar', 'workshop', 'meetup', 'tradeshow'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    {['draft', 'published', 'ongoing', 'completed', 'cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Venue</label><input style={inputStyle} value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} /></div>
                <div><label style={labelStyle}>Platform URL</label><input style={inputStyle} value={form.platform_url} onChange={e => setForm(f => ({ ...f, platform_url: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Start Date</label><input type="datetime-local" style={inputStyle} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>End Date</label><input type="datetime-local" style={inputStyle} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Max Attendees</label><input type="number" style={inputStyle} value={form.max_attendees} onChange={e => setForm(f => ({ ...f, max_attendees: Number(e.target.value) }))} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input type="checkbox" checked={form.registration_open} onChange={e => setForm(f => ({ ...f, registration_open: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#00C971' }} />
                  <span style={{ fontSize: 14 }}>Registration Open</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleCreateOrUpdate} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, cursor: 'pointer' }}>
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagement;
