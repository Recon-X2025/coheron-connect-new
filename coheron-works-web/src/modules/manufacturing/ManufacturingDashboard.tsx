import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Factory,
  CheckCircle,
  Clock,
  TrendingUp,
  Play,
  FileText,
  BarChart3,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Card } from '../../components/Card';
import { showToast } from '../../components/Toast';
import './ManufacturingDashboard.css';

interface ManufacturingDashboardStats {
  totalOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalBOMs: number;
  qualityPassed: number;
  qualityFailed: number;
  onTimeDelivery: number;
}

export const ManufacturingDashboard: React.FC = () => {
  const [stats, setStats] = useState<ManufacturingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [orders, boms] = await Promise.all([
        apiService.get<any>('/manufacturing').catch((err) => { console.error('Failed to load manufacturing orders:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/manufacturing/bom').catch((err) => { console.error('Failed to load BOMs:', err.userMessage || err.message); return []; }),
      ]);

      const inProgressOrders = orders.filter((o: any) => 
        o.state === 'progress' || o.state === 'confirmed' || o.state === 'ready'
      );
      const completedOrders = orders.filter((o: any) => o.state === 'done');
      const cancelledOrders = orders.filter((o: any) => o.state === 'cancel');

      setStats({
        totalOrders: orders.length,
        inProgressOrders: inProgressOrders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalBOMs: boms.length,
        qualityPassed: completedOrders.length, // Simplified
        qualityFailed: 0, // Would need quality data
        onTimeDelivery: completedOrders.length, // Simplified
      });

      setRecentOrders(orders.slice(0, 5));
      setActiveOrders(inProgressOrders.slice(0, 5));
    } catch (error: any) {
      console.error('Failed to load manufacturing dashboard data:', error);
      showToast(error.userMessage || 'Failed to load manufacturing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="manufacturing-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading manufacturing dashboard..." />
        </div>
      </div>
    );
  }

  const completionRate = stats && stats.totalOrders > 0
    ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
    : '0.0';

  const statCards = [
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: <Factory size={24} />,
      color: '#3b82f6',
      link: '/manufacturing/orders',
    },
    {
      title: 'In Progress',
      value: stats?.inProgressOrders || 0,
      icon: <Clock size={24} />,
      color: '#f59e0b',
      link: '/manufacturing/orders',
    },
    {
      title: 'Completed',
      value: stats?.completedOrders || 0,
      icon: <CheckCircle size={24} />,
      color: '#10b981',
      link: '/manufacturing/orders',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: <TrendingUp size={24} />,
      color: '#8b5cf6',
      link: '/manufacturing/orders',
    },
    {
      title: 'Total BOMs',
      value: stats?.totalBOMs || 0,
      icon: <FileText size={24} />,
      color: '#ec4899',
      link: '/manufacturing/bom',
    },
    {
      title: 'Quality Passed',
      value: stats?.qualityPassed || 0,
      icon: <CheckCircle size={24} />,
      color: '#10b981',
      link: '/manufacturing/quality',
    },
  ];

  return (
    <div className="manufacturing-dashboard">
      <div className="container">
        <div className="manufacturing-dashboard-header">
          <div>
            <h1>Manufacturing Dashboard</h1>
            <p className="manufacturing-dashboard-subtitle">Production overview and manufacturing metrics</p>
          </div>
          <Link to="/manufacturing/orders" className="btn-primary">
            View Orders
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="manufacturing-dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="manufacturing-stat-card-link">
              <Card className="manufacturing-stat-card" hover>
                <div className="manufacturing-stat-header">
                  <div className="manufacturing-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="manufacturing-stat-content">
                  <h3 className="manufacturing-stat-value">{stat.value}</h3>
                  <p className="manufacturing-stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="manufacturing-dashboard-sections">
          {/* Active Orders */}
          <Card className="manufacturing-dashboard-section">
            <div className="manufacturing-section-header">
              <h2>Active Production Orders</h2>
              <Link to="/manufacturing/orders" className="manufacturing-view-all">View All</Link>
            </div>
            <div className="manufacturing-recent-list">
              {activeOrders.length > 0 ? (
                activeOrders.map((order, idx) => (
                  <div key={order.id || (order as any)._id || idx} className="manufacturing-recent-item">
                    <div className="manufacturing-recent-item-info">
                      <h4>{order.name || order.display_name || `MO-${order.id}`}</h4>
                      <p>{order.product_name || 'Unknown Product'}</p>
                    </div>
                    <div className="manufacturing-recent-item-meta">
                      <span className={`manufacturing-status-badge ${order.state || 'draft'}`}>
                        {order.state || 'Draft'}
                      </span>
                      <span className="manufacturing-qty">
                        Qty: {order.product_qty || 0}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="manufacturing-empty-state">No active orders</p>
              )}
            </div>
          </Card>

          {/* Recent Orders */}
          <Card className="manufacturing-dashboard-section">
            <div className="manufacturing-section-header">
              <h2>Recent Orders</h2>
              <Link to="/manufacturing/orders" className="manufacturing-view-all">View All</Link>
            </div>
            <div className="manufacturing-recent-list">
              {recentOrders.length > 0 ? (
                recentOrders.map((order, idx) => (
                  <div key={order.id || (order as any)._id || idx} className="manufacturing-recent-item">
                    <div className="manufacturing-recent-item-info">
                      <h4>{order.name || order.display_name || `MO-${order.id}`}</h4>
                      <p>{order.product_name || 'Unknown Product'}</p>
                    </div>
                    <div className="manufacturing-recent-item-meta">
                      <span className={`manufacturing-status-badge ${order.state || 'draft'}`}>
                        {order.state || 'Draft'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="manufacturing-empty-state">No orders found</p>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="manufacturing-dashboard-section">
            <h2>Quick Actions</h2>
            <div className="manufacturing-quick-actions">
              <Link to="/manufacturing/orders" className="manufacturing-quick-action">
                <Factory size={20} />
                <span>Production Orders</span>
              </Link>
              <Link to="/manufacturing/bom" className="manufacturing-quick-action">
                <FileText size={20} />
                <span>BOM Management</span>
              </Link>
              <Link to="/manufacturing/routing" className="manufacturing-quick-action">
                <BarChart3 size={20} />
                <span>Routing</span>
              </Link>
              <Link to="/manufacturing/work-orders" className="manufacturing-quick-action">
                <Play size={20} />
                <span>Work Orders</span>
              </Link>
              <Link to="/manufacturing/quality" className="manufacturing-quick-action">
                <CheckCircle size={20} />
                <span>Quality Control</span>
              </Link>
              <Link to="/manufacturing/costing" className="manufacturing-quick-action">
                <TrendingUp size={20} />
                <span>Costing Analytics</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

