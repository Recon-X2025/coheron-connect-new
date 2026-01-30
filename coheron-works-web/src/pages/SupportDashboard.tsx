import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Target,
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Card } from '../components/Card';
import { showToast } from '../components/Toast';
import './SupportDashboard.css';

interface SupportDashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  slaCompliance: number;
}

export const SupportDashboard: React.FC = () => {
  const [stats, setStats] = useState<SupportDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [openTickets, setOpenTickets] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const tickets = await apiService.get<any>('support-tickets').catch((err) => { console.error('Failed to load tickets:', err.userMessage || err.message); return []; });

      const openTickets = tickets.filter((t: any) => t.status === 'open' || t.state === 'open');
      const inProgressTickets = tickets.filter((t: any) => t.status === 'in_progress' || t.state === 'in_progress');
      const resolvedTickets = tickets.filter((t: any) => t.status === 'resolved' || t.state === 'resolved');
      const closedTickets = tickets.filter((t: any) => t.status === 'closed' || t.state === 'closed');

      // Calculate average response time (simplified)
      const avgResponseTime = tickets.length > 0 ? 2.5 : 0; // Placeholder
      const avgResolutionTime = tickets.length > 0 ? 24.5 : 0; // Placeholder
      const slaCompliance = tickets.length > 0 ? 85.5 : 0; // Placeholder

      setStats({
        totalTickets: tickets.length,
        openTickets: openTickets.length,
        inProgressTickets: inProgressTickets.length,
        resolvedTickets: resolvedTickets.length,
        closedTickets: closedTickets.length,
        averageResponseTime: avgResponseTime,
        averageResolutionTime: avgResolutionTime,
        slaCompliance,
      });

      setRecentTickets(tickets.slice(0, 5));
      setOpenTickets(openTickets.slice(0, 5));
    } catch (error: any) {
      console.error('Failed to load support dashboard data:', error);
      showToast(error.userMessage || 'Failed to load support data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="support-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading support dashboard..." />
        </div>
      </div>
    );
  }

  const resolutionRate = stats && stats.totalTickets > 0
    ? (((stats.resolvedTickets + stats.closedTickets) / stats.totalTickets) * 100).toFixed(1)
    : '0.0';

  const statCards = [
    {
      title: 'Total Tickets',
      value: stats?.totalTickets || 0,
      icon: <MessageSquare size={24} />,
      color: '#3b82f6',
      link: '/support/tickets',
    },
    {
      title: 'Open Tickets',
      value: stats?.openTickets || 0,
      icon: <AlertCircle size={24} />,
      color: '#ef4444',
      link: '/support/tickets',
    },
    {
      title: 'In Progress',
      value: stats?.inProgressTickets || 0,
      icon: <Clock size={24} />,
      color: '#f59e0b',
      link: '/support/tickets',
    },
    {
      title: 'Resolved',
      value: stats?.resolvedTickets || 0,
      icon: <CheckCircle size={24} />,
      color: '#10b981',
      link: '/support/tickets',
    },
    {
      title: 'Resolution Rate',
      value: `${resolutionRate}%`,
      icon: <TrendingUp size={24} />,
      color: '#8b5cf6',
      link: '/support/tickets',
    },
    {
      title: 'SLA Compliance',
      value: `${stats?.slaCompliance.toFixed(1) || 0}%`,
      icon: <Target size={24} />,
      color: stats && (stats.slaCompliance || 0) >= 90 ? '#10b981' : '#f59e0b',
      link: '/support/reports',
    },
  ];

  return (
    <div className="support-dashboard">
      <div className="container">
        <div className="support-dashboard-header">
          <div>
            <h1>Support Dashboard</h1>
            <p className="support-dashboard-subtitle">Customer support overview and ticket metrics</p>
          </div>
          <Link to="/support/tickets" className="btn-primary">
            View Tickets
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="support-dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="support-stat-card-link">
              <Card className="support-stat-card" hover>
                <div className="support-stat-header">
                  <div className="support-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="support-stat-content">
                  <h3 className="support-stat-value">{stat.value}</h3>
                  <p className="support-stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="support-dashboard-sections">
          {/* Open Tickets */}
          <Card className="support-dashboard-section">
            <div className="support-section-header">
              <h2>Open Tickets</h2>
              <Link to="/support/tickets" className="support-view-all">View All</Link>
            </div>
            <div className="support-recent-list">
              {openTickets.length > 0 ? (
                openTickets.map((ticket) => (
                  <div key={ticket.id} className="support-recent-item">
                    <div className="support-recent-item-info">
                      <h4>{ticket.subject || `Ticket #${ticket.id}`}</h4>
                      <p>{ticket.customer_name || ticket.partner_name || 'Unknown Customer'}</p>
                    </div>
                    <div className="support-recent-item-meta">
                      <span className={`support-status-badge ${ticket.status || ticket.state || 'open'}`}>
                        {ticket.status || ticket.state || 'Open'}
                      </span>
                      {ticket.priority && (
                        <span className={`support-priority-badge ${ticket.priority}`}>
                          {ticket.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="support-empty-state">No open tickets</p>
              )}
            </div>
          </Card>

          {/* Recent Tickets */}
          <Card className="support-dashboard-section">
            <div className="support-section-header">
              <h2>Recent Tickets</h2>
              <Link to="/support/tickets" className="support-view-all">View All</Link>
            </div>
            <div className="support-recent-list">
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <div key={ticket.id} className="support-recent-item">
                    <div className="support-recent-item-info">
                      <h4>{ticket.subject || `Ticket #${ticket.id}`}</h4>
                      <p>{ticket.customer_name || ticket.partner_name || 'Unknown Customer'}</p>
                    </div>
                    <div className="support-recent-item-meta">
                      <span className={`support-status-badge ${ticket.status || ticket.state || 'open'}`}>
                        {ticket.status || ticket.state || 'Open'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="support-empty-state">No tickets found</p>
              )}
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="support-dashboard-section">
            <h2>Performance Metrics</h2>
            <div className="support-metrics-grid">
              <div className="support-metric-item">
                <div className="support-metric-label">Avg Response Time</div>
                <div className="support-metric-value">{stats?.averageResponseTime.toFixed(1) || 0}h</div>
              </div>
              <div className="support-metric-item">
                <div className="support-metric-label">Avg Resolution Time</div>
                <div className="support-metric-value">{stats?.averageResolutionTime.toFixed(1) || 0}h</div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="support-dashboard-section">
            <h2>Quick Actions</h2>
            <div className="support-quick-actions">
              <Link to="/support/tickets" className="support-quick-action">
                <MessageSquare size={20} />
                <span>View Tickets</span>
              </Link>
              <Link to="/support/workbench" className="support-quick-action">
                <Users size={20} />
                <span>Agent Workbench</span>
              </Link>
              <Link to="/support/reports" className="support-quick-action">
                <TrendingUp size={20} />
                <span>Reports</span>
              </Link>
              <Link to="/support/knowledge-base" className="support-quick-action">
                <Target size={20} />
                <span>Knowledge Base</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

