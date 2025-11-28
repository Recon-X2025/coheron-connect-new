import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Card } from '../../components/Card';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './AccountingDashboard.css';

interface AccountingDashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  pendingInvoices: number;
  pendingBills: number;
  accountsReceivable: number;
  accountsPayable: number;
  overdueInvoices: number;
  overdueBills: number;
  cashBalance: number;
}

export const AccountingDashboard: React.FC = () => {
  const [stats, setStats] = useState<AccountingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [invoices, bills] = await Promise.all([
        apiService.get<any>('/invoices').catch(() => []),
        apiService.get<any>('/accounting/accounts-payable/bills').catch(() => []),
      ]);

      const pendingInvoices = invoices.filter((inv: any) => 
        inv.payment_state === 'not_paid' || inv.state === 'posted'
      );
      const pendingBills = bills.filter((bill: any) => 
        bill.state === 'draft' || bill.state === 'posted'
      );
      
      const overdueInvoices = invoices.filter((inv: any) => {
        if (!inv.invoice_date_due) return false;
        const dueDate = new Date(inv.invoice_date_due);
        return dueDate < new Date() && (inv.payment_state === 'not_paid' || inv.state === 'posted');
      });
      
      const overdueBills = bills.filter((bill: any) => {
        if (!bill.date_due) return false;
        const dueDate = new Date(bill.date_due);
        return dueDate < new Date() && (bill.state === 'draft' || bill.state === 'posted');
      });

      const totalRevenue = invoices
        .filter((inv: any) => inv.type === 'out_invoice' || !inv.type)
        .reduce((sum: number, inv: any) => {
          const amount = typeof inv.amount_total === 'string'
            ? parseFloat(inv.amount_total.replace(/[^\d.-]/g, '')) || 0
            : parseFloat(inv.amount_total) || 0;
          return sum + amount;
        }, 0);

      const totalExpenses = bills.reduce((sum: number, bill: any) => {
        const amount = typeof bill.amount_total === 'string'
          ? parseFloat(bill.amount_total.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(bill.amount_total) || 0;
        return sum + amount;
      }, 0);

      const accountsReceivable = pendingInvoices.reduce((sum: number, inv: any) => {
        const amount = typeof inv.amount_total === 'string'
          ? parseFloat(inv.amount_total.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(inv.amount_total) || 0;
        return sum + amount;
      }, 0);

      const accountsPayable = pendingBills.reduce((sum: number, bill: any) => {
        const amount = typeof bill.amount_total === 'string'
          ? parseFloat(bill.amount_total.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(bill.amount_total) || 0;
        return sum + amount;
      }, 0);

      setStats({
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        pendingInvoices: pendingInvoices.length,
        pendingBills: pendingBills.length,
        accountsReceivable,
        accountsPayable,
        overdueInvoices: overdueInvoices.length,
        overdueBills: overdueBills.length,
        cashBalance: accountsReceivable - accountsPayable, // Simplified
      });

      setRecentInvoices(pendingInvoices.slice(0, 5));
      setRecentBills(pendingBills.slice(0, 5));
    } catch (error) {
      console.error('Failed to load accounting dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="accounting-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading accounting dashboard..." />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatInLakhsCompact(stats?.totalRevenue || 0),
      icon: <TrendingUp size={24} />,
      color: '#10b981',
      link: '/accounting/invoices',
      change: `${stats?.pendingInvoices || 0} pending invoices`,
      trend: 'up' as const,
    },
    {
      title: 'Total Expenses',
      value: formatInLakhsCompact(stats?.totalExpenses || 0),
      icon: <TrendingDown size={24} />,
      color: '#ef4444',
      link: '/accounting/accounts-payable',
      change: `${stats?.pendingBills || 0} pending bills`,
      trend: 'down' as const,
    },
    {
      title: 'Net Income',
      value: formatInLakhsCompact(stats?.netIncome || 0),
      icon: <DollarSign size={24} />,
      color: stats && stats.netIncome >= 0 ? '#10b981' : '#ef4444',
      link: '/accounting/reports',
      change: stats && stats.netIncome >= 0 ? 'Profit' : 'Loss',
      trend: stats && stats.netIncome >= 0 ? ('up' as const) : ('down' as const),
    },
    {
      title: 'Accounts Receivable',
      value: formatInLakhsCompact(stats?.accountsReceivable || 0),
      icon: <Wallet size={24} />,
      color: '#3b82f6',
      link: '/accounting/invoices',
      change: `${stats?.overdueInvoices || 0} overdue`,
      trend: 'up' as const,
    },
    {
      title: 'Accounts Payable',
      value: formatInLakhsCompact(stats?.accountsPayable || 0),
      icon: <CreditCard size={24} />,
      color: '#f59e0b',
      link: '/accounting/accounts-payable',
      change: `${stats?.overdueBills || 0} overdue`,
      trend: 'down' as const,
    },
    {
      title: 'Cash Balance',
      value: formatInLakhsCompact(stats?.cashBalance || 0),
      icon: <DollarSign size={24} />,
      color: '#8b5cf6',
      link: '/accounting/reports',
      change: stats && stats.cashBalance >= 0 ? 'Positive' : 'Negative',
      trend: stats && stats.cashBalance >= 0 ? ('up' as const) : ('down' as const),
    },
  ];

  return (
    <div className="accounting-dashboard">
      <div className="container">
        <div className="accounting-dashboard-header">
          <div>
            <h1>Accounting Dashboard</h1>
            <p className="accounting-dashboard-subtitle">Financial overview and key accounting metrics</p>
          </div>
          <Link to="/accounting/reports" className="btn-primary">
            View Reports
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="accounting-dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="accounting-stat-card-link">
              <Card className="accounting-stat-card" hover>
                <div className="accounting-stat-header">
                  <div className="accounting-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className={`accounting-stat-change ${stat.trend}`}>
                    {stat.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {stat.change}
                  </div>
                </div>
                <div className="accounting-stat-content">
                  <h3 className="accounting-stat-value">{stat.value}</h3>
                  <p className="accounting-stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="accounting-dashboard-sections">
          {/* Alerts */}
          {(stats && (stats.overdueInvoices > 0 || stats.overdueBills > 0)) && (
            <Card className="accounting-dashboard-section accounting-alerts">
              <h2>
                <AlertCircle size={20} />
                Alerts & Notifications
              </h2>
              <div className="accounting-alerts-list">
                {stats.overdueInvoices > 0 && (
                  <div className="accounting-alert-item critical">
                    <AlertCircle size={20} />
                    <div>
                      <h4>{stats.overdueInvoices} Overdue Invoices</h4>
                      <p>Immediate attention required</p>
                    </div>
                    <Link to="/accounting/invoices" className="accounting-alert-link">View</Link>
                  </div>
                )}
                {stats.overdueBills > 0 && (
                  <div className="accounting-alert-item warning">
                    <Clock size={20} />
                    <div>
                      <h4>{stats.overdueBills} Overdue Bills</h4>
                      <p>Pending payment required</p>
                    </div>
                    <Link to="/accounting/accounts-payable" className="accounting-alert-link">View</Link>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Recent Invoices */}
          <Card className="accounting-dashboard-section">
            <div className="accounting-section-header">
              <h2>Recent Pending Invoices</h2>
              <Link to="/accounting/invoices" className="accounting-view-all">View All</Link>
            </div>
            <div className="accounting-recent-list">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="accounting-recent-item">
                    <div className="accounting-recent-item-info">
                      <h4>{invoice.name || invoice.display_name || `Invoice #${invoice.id}`}</h4>
                      <p>{invoice.partner_name || 'Unknown Customer'}</p>
                    </div>
                    <div className="accounting-recent-item-meta">
                      <span className="accounting-amount">
                        {formatInLakhsCompact(
                          typeof invoice.amount_total === 'string'
                            ? parseFloat(invoice.amount_total.replace(/[^\d.-]/g, '')) || 0
                            : parseFloat(invoice.amount_total) || 0
                        )}
                      </span>
                      <span className={`accounting-status-badge ${invoice.payment_state || invoice.state || 'draft'}`}>
                        {invoice.payment_state || invoice.state || 'Draft'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="accounting-empty-state">No pending invoices</p>
              )}
            </div>
          </Card>

          {/* Recent Bills */}
          <Card className="accounting-dashboard-section">
            <div className="accounting-section-header">
              <h2>Recent Pending Bills</h2>
              <Link to="/accounting/accounts-payable" className="accounting-view-all">View All</Link>
            </div>
            <div className="accounting-recent-list">
              {recentBills.length > 0 ? (
                recentBills.map((bill) => (
                  <div key={bill.id} className="accounting-recent-item">
                    <div className="accounting-recent-item-info">
                      <h4>{bill.name || bill.display_name || `Bill #${bill.id}`}</h4>
                      <p>{bill.partner_name || bill.vendor_name || 'Unknown Vendor'}</p>
                    </div>
                    <div className="accounting-recent-item-meta">
                      <span className="accounting-amount">
                        {formatInLakhsCompact(
                          typeof bill.amount_total === 'string'
                            ? parseFloat(bill.amount_total.replace(/[^\d.-]/g, '')) || 0
                            : parseFloat(bill.amount_total) || 0
                        )}
                      </span>
                      <span className={`accounting-status-badge ${bill.state || 'draft'}`}>
                        {bill.state || 'Draft'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="accounting-empty-state">No pending bills</p>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="accounting-dashboard-section">
            <h2>Quick Actions</h2>
            <div className="accounting-quick-actions">
              <Link to="/accounting/invoices" className="accounting-quick-action">
                <FileText size={20} />
                <span>Manage Invoices</span>
              </Link>
              <Link to="/accounting/accounts-payable" className="accounting-quick-action">
                <CreditCard size={20} />
                <span>Accounts Payable</span>
              </Link>
              <Link to="/accounting/journal-entries" className="accounting-quick-action">
                <FileText size={20} />
                <span>Journal Entries</span>
              </Link>
              <Link to="/accounting/reports" className="accounting-quick-action">
                <TrendingUp size={20} />
                <span>Financial Reports</span>
              </Link>
              <Link to="/accounting/chart-of-accounts" className="accounting-quick-action">
                <FileText size={20} />
                <span>Chart of Accounts</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

