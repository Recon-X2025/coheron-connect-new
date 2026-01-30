import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Eye,
  TrendingUp,
  ShoppingCart,
  Users,
  FileText,
  Image,
  BarChart3,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Card } from '../../components/Card';
import { showToast } from '../../components/Toast';
import './WebsiteDashboard.css';

interface WebsiteDashboardStats {
  totalPages: number;
  totalVisitors: number;
  totalPageViews: number;
  conversionRate: number;
  totalProducts: number;
  totalOrders: number;
  bounceRate: number;
}

export const WebsiteDashboard: React.FC = () => {
  const [stats, setStats] = useState<WebsiteDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentPages, setRecentPages] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [pages, products, orders] = await Promise.all([
        apiService.get<any>('/website/sites/pages').catch((err) => { console.error('Failed to load pages:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/website/products').catch((err) => { console.error('Failed to load products:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/website/orders').catch((err) => { console.error('Failed to load orders:', err.userMessage || err.message); return []; }),
      ]);

      // Placeholder calculations for analytics
      const totalVisitors = 1250; // Would come from analytics
      const totalPageViews = 3450; // Would come from analytics
      const conversionRate = orders.length > 0 && totalVisitors > 0
        ? ((orders.length / totalVisitors) * 100).toFixed(2)
        : '0.00';
      const bounceRate = 45.5; // Would come from analytics

      setStats({
        totalPages: pages.length,
        totalVisitors,
        totalPageViews,
        conversionRate: parseFloat(conversionRate),
        totalProducts: products.length,
        totalOrders: orders.length,
        bounceRate,
      });

      setRecentPages(pages.slice(0, 5));
    } catch (error: any) {
      console.error('Failed to load website dashboard data:', error);
      showToast(error.userMessage || 'Failed to load website data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="website-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading website dashboard..." />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Pages',
      value: stats?.totalPages || 0,
      icon: <FileText size={24} />,
      color: '#3b82f6',
      link: '/website',
    },
    {
      title: 'Total Visitors',
      value: stats?.totalVisitors || 0,
      icon: <Users size={24} />,
      color: '#8b5cf6',
      link: '/website/analytics',
    },
    {
      title: 'Page Views',
      value: stats?.totalPageViews || 0,
      icon: <Eye size={24} />,
      color: '#10b981',
      link: '/website/analytics',
    },
    {
      title: 'Conversion Rate',
      value: `${stats?.conversionRate.toFixed(2) || 0}%`,
      icon: <TrendingUp size={24} />,
      color: '#f59e0b',
      link: '/website/analytics',
    },
    {
      title: 'Products',
      value: stats?.totalProducts || 0,
      icon: <ShoppingCart size={24} />,
      color: '#ec4899',
      link: '/website/catalog',
    },
    {
      title: 'Orders',
      value: stats?.totalOrders || 0,
      icon: <ShoppingCart size={24} />,
      color: '#6366f1',
      link: '/website/analytics',
    },
  ];

  return (
    <div className="website-dashboard">
      <div className="container">
        <div className="website-dashboard-header">
          <div>
            <h1>Website Dashboard</h1>
            <p className="website-dashboard-subtitle">Website performance and analytics overview</p>
          </div>
          <Link to="/website/analytics" className="btn-primary">
            View Analytics
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="website-dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="website-stat-card-link">
              <Card className="website-stat-card" hover>
                <div className="website-stat-header">
                  <div className="website-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="website-stat-content">
                  <h3 className="website-stat-value">{stat.value}</h3>
                  <p className="website-stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="website-dashboard-sections">
          {/* Recent Pages */}
          <Card className="website-dashboard-section">
            <div className="website-section-header">
              <h2>Recent Pages</h2>
              <Link to="/website" className="website-view-all">View All</Link>
            </div>
            <div className="website-recent-list">
              {recentPages.length > 0 ? (
                recentPages.map((page) => (
                  <div key={page.id} className="website-recent-item">
                    <div className="website-recent-item-info">
                      <h4>{page.name || page.title || `Page #${page.id}`}</h4>
                      <p>{page.url || page.slug || 'No URL'}</p>
                    </div>
                    <div className="website-recent-item-meta">
                      <span className={`website-status-badge ${page.state || page.status || 'published'}`}>
                        {page.state || page.status || 'Published'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="website-empty-state">No pages found</p>
              )}
            </div>
          </Card>

          {/* Analytics Summary */}
          <Card className="website-dashboard-section">
            <h2>Analytics Summary</h2>
            <div className="website-metrics-grid">
              <div className="website-metric-item">
                <div className="website-metric-label">Bounce Rate</div>
                <div className="website-metric-value">{stats?.bounceRate.toFixed(1) || 0}%</div>
              </div>
              <div className="website-metric-item">
                <div className="website-metric-label">Avg. Session Duration</div>
                <div className="website-metric-value">3m 45s</div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="website-dashboard-section">
            <h2>Quick Actions</h2>
            <div className="website-quick-actions">
              <Link to="/website" className="website-quick-action">
                <Globe size={20} />
                <span>Manage Pages</span>
              </Link>
              <Link to="/website/builder" className="website-quick-action">
                <FileText size={20} />
                <span>Page Builder</span>
              </Link>
              <Link to="/website/catalog" className="website-quick-action">
                <ShoppingCart size={20} />
                <span>Product Catalog</span>
              </Link>
              <Link to="/website/analytics" className="website-quick-action">
                <BarChart3 size={20} />
                <span>Analytics</span>
              </Link>
              <Link to="/website/media" className="website-quick-action">
                <Image size={20} />
                <span>Media Library</span>
              </Link>
              <Link to="/website/settings" className="website-quick-action">
                <Globe size={20} />
                <span>Site Settings</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

