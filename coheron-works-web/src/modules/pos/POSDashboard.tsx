import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Package,
  Calendar,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Card } from '../../components/Card';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { showToast } from '../../components/Toast';
import './POSDashboard.css';

interface POSDashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayCustomers: number;
  activeSessions: number;
  totalSessions: number;
  averageTransactionValue: number;
  topProducts: any[];
}

export const POSDashboard: React.FC = () => {
  const [stats, setStats] = useState<POSDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const [sessions] = await Promise.all([
        apiService.get<any>('/pos/sessions').catch((err) => { console.error('Failed to load POS sessions:', err.userMessage || err.message); return []; }),
      ]);

      const todaySessions = sessions.filter((s: any) => {
        const sessionDate = s.date_order ? new Date(s.date_order).toISOString().split('T')[0] : null;
        return sessionDate === today;
      });

      const activeSessions = sessions.filter((s: any) => s.state === 'opened' || s.state === 'opening_control');
      
      const todaySales = todaySessions.reduce((sum: number, s: any) => {
        const amount = typeof s.total_amount === 'string'
          ? parseFloat(s.total_amount.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(s.total_amount) || 0;
        return sum + amount;
      }, 0);

      const todayTransactions = todaySessions.length;
      const todayCustomers = new Set(todaySessions.map((s: any) => s.partner_id)).size;
      const averageTransactionValue = todayTransactions > 0 ? todaySales / todayTransactions : 0;

      setStats({
        todaySales,
        todayTransactions,
        todayCustomers,
        activeSessions: activeSessions.length,
        totalSessions: sessions.length,
        averageTransactionValue,
        topProducts: [], // Would need product sales data
      });

      setRecentSessions(todaySessions.slice(0, 5));
    } catch (error: any) {
      console.error('Failed to load POS dashboard data:', error);
      showToast(error.userMessage || 'Failed to load POS data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pos-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading POS dashboard..." />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Today\'s Sales',
      value: formatInLakhsCompact(stats?.todaySales || 0),
      icon: <DollarSign size={24} />,
      color: '#10b981',
      link: '/pos/sessions',
    },
    {
      title: 'Today\'s Transactions',
      value: stats?.todayTransactions || 0,
      icon: <ShoppingCart size={24} />,
      color: '#3b82f6',
      link: '/pos/sessions',
    },
    {
      title: 'Active Sessions',
      value: stats?.activeSessions || 0,
      icon: <Clock size={24} />,
      color: '#f59e0b',
      link: '/pos/sessions',
    },
    {
      title: 'Avg Transaction Value',
      value: formatInLakhsCompact(stats?.averageTransactionValue || 0),
      icon: <TrendingUp size={24} />,
      color: '#8b5cf6',
      link: '/pos/sessions',
    },
    {
      title: 'Today\'s Customers',
      value: stats?.todayCustomers || 0,
      icon: <Users size={24} />,
      color: '#ec4899',
      link: '/pos/sessions',
    },
    {
      title: 'Total Sessions',
      value: stats?.totalSessions || 0,
      icon: <Calendar size={24} />,
      color: '#6366f1',
      link: '/pos/sessions',
    },
  ];

  return (
    <div className="pos-dashboard">
      <div className="container">
        <div className="pos-dashboard-header">
          <div>
            <h1>POS Dashboard</h1>
            <p className="pos-dashboard-subtitle">Point of sale overview and sales metrics</p>
          </div>
          <Link to="/pos" className="btn-primary">
            Open POS
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="pos-dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="pos-stat-card-link">
              <Card className="pos-stat-card" hover>
                <div className="pos-stat-header">
                  <div className="pos-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="pos-stat-content">
                  <h3 className="pos-stat-value">{stat.value}</h3>
                  <p className="pos-stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="pos-dashboard-sections">
          {/* Recent Sessions */}
          <Card className="pos-dashboard-section">
            <div className="pos-section-header">
              <h2>Today's Sessions</h2>
              <Link to="/pos/sessions" className="pos-view-all">View All</Link>
            </div>
            <div className="pos-recent-list">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <div key={session.id} className="pos-recent-item">
                    <div className="pos-recent-item-info">
                      <h4>{session.name || session.session_name || `Session #${session.id}`}</h4>
                      <p>{session.partner_name || 'Walk-in Customer'}</p>
                    </div>
                    <div className="pos-recent-item-meta">
                      <span className="pos-amount">
                        {formatInLakhsCompact(
                          typeof session.total_amount === 'string'
                            ? parseFloat(session.total_amount.replace(/[^\d.-]/g, '')) || 0
                            : parseFloat(session.total_amount) || 0
                        )}
                      </span>
                      <span className={`pos-status-badge ${session.state || 'closed'}`}>
                        {session.state || 'Closed'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="pos-empty-state">No sessions today</p>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="pos-dashboard-section">
            <h2>Quick Actions</h2>
            <div className="pos-quick-actions">
              <Link to="/pos" className="pos-quick-action">
                <ShoppingCart size={20} />
                <span>Open POS</span>
              </Link>
              <Link to="/pos/sessions" className="pos-quick-action">
                <Clock size={20} />
                <span>View Sessions</span>
              </Link>
              <Link to="/pos/terminals" className="pos-quick-action">
                <Package size={20} />
                <span>Manage Terminals</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

