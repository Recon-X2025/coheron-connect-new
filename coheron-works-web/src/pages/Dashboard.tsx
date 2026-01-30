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
import { showToast } from '../components/Toast';
import { ActivityFeed } from '../components/ActivityFeed';
import type { Activity } from '../components/ActivityFeed';
import './Dashboard.css';

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

const mockActivities: Activity[] = [
  { id: '1',  user: 'Sarah Chen',     action: 'created',   entityType: 'Invoice',            entityName: 'INV-2024-0891',           timestamp: ago(2) },
  { id: '2',  user: 'Mike Johnson',   action: 'updated',   entityType: 'Lead',               entityName: 'Acme Corp',               timestamp: ago(8),  details: 'Changed stage to Qualified' },
  { id: '3',  user: 'System',         action: 'approved',  entityType: 'Leave Request',      entityName: '#45',                     timestamp: ago(15) },
  { id: '4',  user: 'Priya Sharma',   action: 'completed', entityType: 'Manufacturing Order', entityName: 'MO-2024-0234',           timestamp: ago(22) },
  { id: '5',  user: 'David Lee',      action: 'commented', entityType: 'Opportunity',        entityName: 'TechStart Deal',          timestamp: ago(35), details: 'Pricing looks good, let\'s proceed' },
  { id: '6',  user: 'Emily Zhang',    action: 'created',   entityType: 'Sale Order',         entityName: 'SO-2024-1102',            timestamp: ago(47) },
  { id: '7',  user: 'Raj Patel',      action: 'assigned',  entityType: 'Task',               entityName: 'Q4 Inventory Audit',      timestamp: ago(60) },
  { id: '8',  user: 'Sarah Chen',     action: 'updated',   entityType: 'Product',            entityName: 'Widget Pro X200',         timestamp: ago(90),  details: 'Updated pricing from ₹1,200 to ₹1,350' },
  { id: '9',  user: 'System',         action: 'rejected',  entityType: 'Purchase Order',     entityName: 'PO-2024-0567',            timestamp: ago(120), details: 'Budget exceeded' },
  { id: '10', user: 'Mike Johnson',   action: 'created',   entityType: 'Campaign',           entityName: 'Winter Sale 2024',        timestamp: ago(180) },
  { id: '11', user: 'Anita Roy',      action: 'deleted',   entityType: 'Draft Quotation',    entityName: 'QT-2024-0923',            timestamp: ago(240) },
  { id: '12', user: 'David Lee',      action: 'approved',  entityType: 'Expense Report',     entityName: 'EXP-2024-0078',           timestamp: ago(300) },
  { id: '13', user: 'Priya Sharma',   action: 'created',   entityType: 'Lead',               entityName: 'Global Logistics Ltd',    timestamp: ago(420) },
  { id: '14', user: 'Emily Zhang',    action: 'completed', entityType: 'Task',               entityName: 'Monthly Reconciliation',  timestamp: ago(600) },
  { id: '15', user: 'Raj Patel',      action: 'updated',   entityType: 'Inventory',          entityName: 'Warehouse B',             timestamp: ago(720), details: 'Stock count verified' },
  { id: '16', user: 'Sarah Chen',     action: 'commented', entityType: 'Invoice',            entityName: 'INV-2024-0885',           timestamp: ago(900), details: 'Client requested 15-day extension' },
  { id: '17', user: 'System',         action: 'assigned',  entityType: 'Support Ticket',     entityName: '#1204',                   timestamp: ago(1080) },
];

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
          apiService.get<any>('/leads', { type: 'lead' }).catch((err) => { console.error('Failed to load leads:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/leads', { type: 'opportunity' }).catch((err) => { console.error('Failed to load opportunities:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/sale-orders').catch((err) => { console.error('Failed to load sale orders:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/invoices', { payment_state: 'not_paid' }).catch((err) => { console.error('Failed to load invoices:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/campaigns', { state: 'in_progress' }).catch((err) => { console.error('Failed to load campaigns:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/manufacturing', { state: 'progress' }).catch((err) => { console.error('Failed to load manufacturing:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/products').catch((err) => { console.error('Failed to load products:', err.userMessage || err.message); return []; }),
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
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      showToast(error.userMessage || 'Failed to load dashboard data', 'error');
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
            <ActivityFeed activities={mockActivities} />
          </Card>
        </div>
      </div>
    </div>
  );
};
