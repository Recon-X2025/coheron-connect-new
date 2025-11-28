import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  FileText,
  Package,
  Factory,
  Megaphone,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { apiService } from '../services/apiService';
import { formatInLakhsCompact } from '../utils/currencyFormatter';
import './Dashboard.css';

interface DashboardStats {
  totalLeads: number;
  totalOpportunities: number;
  totalSales: number;
  totalRevenue: number;
  pendingInvoices: number;
  activeCampaigns: number;
  manufacturingOrders: number;
  lowStockProducts: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [leads, opportunities, saleOrders, invoices, campaigns, manufacturing, products] =
        await Promise.all([
          apiService.get<any>('/leads', { type: 'lead' }).catch(() => []),
          apiService.get<any>('/leads', { type: 'opportunity' }).catch(() => []),
          apiService.get<any>('/sale-orders').catch(() => []),
          apiService.get<any>('/invoices', { payment_state: 'not_paid' }).catch(() => []),
          apiService.get<any>('/campaigns', { state: 'in_progress' }).catch(() => []),
          apiService.get<any>('/manufacturing', { state: 'progress' }).catch(() => []),
          apiService.get<any>('/products').catch(() => []),
        ]);

      const totalRevenue = saleOrders.reduce(
        (sum: number, order: any) => {
          const amount = typeof order.amount_total === 'string' 
            ? parseFloat(order.amount_total.replace(/[^\d.-]/g, '')) || 0
            : parseFloat(order.amount_total) || 0;
          return sum + amount;
        },
        0
      );

      const lowStockProducts = products.filter((p: any) => p.qty_available < 10).length;

      setStats({
        totalLeads: leads.length,
        totalOpportunities: opportunities.length,
        totalSales: saleOrders.length,
        totalRevenue,
        pendingInvoices: invoices.length,
        activeCampaigns: campaigns.length,
        manufacturingOrders: manufacturing.length,
        lowStockProducts,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading dashboard..." />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Leads',
      value: stats?.totalLeads || 0,
      icon: <TrendingUp size={24} />,
      color: '#3b82f6',
      link: '/crm/leads',
      change: '+12%',
      trend: 'up',
    },
    {
      title: 'Opportunities',
      value: stats?.totalOpportunities || 0,
      icon: <Users size={24} />,
      color: '#8b5cf6',
      link: '/crm/opportunities',
      change: '+8%',
      trend: 'up',
    },
    {
      title: 'Sales Orders',
      value: stats?.totalSales || 0,
      icon: <ShoppingCart size={24} />,
      color: '#10b981',
      link: '/sales/orders',
      change: '+15%',
      trend: 'up',
    },
    {
      title: 'Total Revenue',
      value: formatInLakhsCompact(stats?.totalRevenue || 0),
      icon: <CircleDollarSign size={24} />,
      color: '#f59e0b',
      link: '/sales/orders',
      change: '+22%',
      trend: 'up',
    },
    {
      title: 'Pending Invoices',
      value: stats?.pendingInvoices || 0,
      icon: <FileText size={24} />,
      color: '#ef4444',
      link: '/accounting/invoices',
      change: '-5%',
      trend: 'down',
    },
    {
      title: 'Active Campaigns',
      value: stats?.activeCampaigns || 0,
      icon: <Megaphone size={24} />,
      color: '#ec4899',
      link: '/marketing/campaigns',
      change: '+3',
      trend: 'up',
    },
    {
      title: 'Manufacturing Orders',
      value: stats?.manufacturingOrders || 0,
      icon: <Factory size={24} />,
      color: '#6366f1',
      link: '/manufacturing/orders',
      change: '+2',
      trend: 'up',
    },
    {
      title: 'Low Stock Products',
      value: stats?.lowStockProducts || 0,
      icon: <Package size={24} />,
      color: '#f97316',
      link: '/inventory/products',
      change: '-1',
      trend: 'down',
    },
  ];

  const quickLinks = [
    { name: 'CRM Pipeline', path: '/crm/pipeline', icon: <TrendingUp size={20} /> },
    { name: 'Leads', path: '/crm/leads', icon: <Users size={20} /> },
    { name: 'Opportunities', path: '/crm/opportunities', icon: <TrendingUp size={20} /> },
    { name: 'Sales Orders', path: '/sales/orders', icon: <ShoppingCart size={20} /> },
    { name: 'Quotations', path: '/sales/quotations', icon: <FileText size={20} /> },
    { name: 'Invoices', path: '/accounting/invoices', icon: <FileText size={20} /> },
    { name: 'Products', path: '/inventory/products', icon: <Package size={20} /> },
    { name: 'Manufacturing', path: '/manufacturing/orders', icon: <Factory size={20} /> },
    { name: 'Campaigns', path: '/marketing/campaigns', icon: <Megaphone size={20} /> },
    { name: 'POS', path: '/pos', icon: <ShoppingCart size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Users size={20} /> },
  ];

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back! Here's what's happening today.</p>
          </div>
        </div>

        <div className="dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="stat-card-link">
              <Card className="stat-card" hover>
                <div className="stat-header">
                  <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className={`stat-change ${stat.trend}`}>
                    {stat.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {stat.change}
                  </div>
                </div>
                <div className="stat-content">
                  <h3 className="stat-value">{stat.value}</h3>
                  <p className="stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="dashboard-sections">
          <Card className="dashboard-section">
            <h2>Quick Links</h2>
            <div className="quick-links-grid">
              {quickLinks.map((link, index) => (
                <Link key={index} to={link.path} className="quick-link">
                  {link.icon}
                  <span>{link.name}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="dashboard-section">
            <h2>Recent Activity</h2>
            <div className="recent-activity">
              <p className="activity-empty">No recent activity to display</p>
              <p className="activity-note">
                Activity timeline will appear here as you use the system.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
