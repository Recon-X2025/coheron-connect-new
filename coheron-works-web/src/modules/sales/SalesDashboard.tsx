import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Card } from '../../components/Card';
import { salesService, type SalesDashboard as SalesDashboardType } from '../../services/salesService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './SalesDashboard.css';

// Default empty dashboard data
const getEmptyDashboard = (periodStart: string, periodEnd: string): SalesDashboardType => ({
  period: { start: periodStart, end: periodEnd },
  revenue: {
    total_revenue: 0,
    total_orders: 0,
    unique_customers: 0,
  },
  conversion: {
    quotes_sent: 0,
    quotes_converted: 0,
    conversion_rate: 0,
  },
  pipeline: {
    total_opportunities: 0,
    total_pipeline_value: 0,
    weighted_pipeline_value: 0,
  },
  top_products: [],
  top_customers: [],
  pipeline_stages: [],
});

export const SalesDashboard = () => {
  const [periodStart, setPeriodStart] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [dashboard, setDashboard] = useState<SalesDashboardType>(() => 
    getEmptyDashboard(periodStart, periodEnd)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [periodStart, periodEnd]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await salesService.analytics.getDashboard({
        period_start: periodStart,
        period_end: periodEnd,
      });
      setDashboard(data as any);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard data');
      // Set empty dashboard on error so UI still renders
      setDashboard(getEmptyDashboard(periodStart, periodEnd));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sales-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading sales dashboard..." />
        </div>
      </div>
    );
  }

  const conversionTrend = dashboard.conversion.quotes_sent > 0
    ? ((dashboard.conversion.quotes_converted / dashboard.conversion.quotes_sent) * 100).toFixed(1)
    : '0.0';

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatInLakhsCompact(dashboard.revenue.total_revenue),
      icon: <DollarSign size={24} />,
      color: '#f59e0b',
      subtitle: `${dashboard.revenue.total_orders} orders`,
    },
    {
      title: 'Conversion Rate',
      value: `${conversionTrend}%`,
      icon: <Target size={24} />,
      color: '#10b981',
      subtitle: `${dashboard.conversion.quotes_converted} of ${dashboard.conversion.quotes_sent} quotes`,
    },
    {
      title: 'Pipeline Value',
      value: formatInLakhsCompact(dashboard.pipeline.total_pipeline_value),
      icon: <TrendingUp size={24} />,
      color: '#8b5cf6',
      subtitle: `${dashboard.pipeline.total_opportunities} opportunities`,
    },
    {
      title: 'Active Customers',
      value: dashboard.revenue.unique_customers.toString(),
      icon: <Users size={24} />,
      color: '#3b82f6',
      subtitle: 'In this period',
    },
  ];

  return (
    <div className="sales-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Sales Dashboard</h1>
            <p className="dashboard-subtitle">Comprehensive sales performance overview</p>
          </div>
          <div className="period-selector">
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="date-input"
            />
            <span>to</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="date-input"
            />
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="dashboard-stats">
          {statCards.map((stat, index) => (
            <Card key={index} className="stat-card" hover>
              <div className="stat-header">
                <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                  {stat.icon}
                </div>
              </div>
              <div className="stat-content">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-title">{stat.title}</p>
                <p className="stat-subtitle">{stat.subtitle}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="dashboard-sections">
          <Card className="dashboard-section">
            <h2>Pipeline by Stage</h2>
            {dashboard.pipeline_stages.length > 0 ? (
              <div className="pipeline-stages">
                {dashboard.pipeline_stages.map((stage) => (
                  <div key={stage.stage} className="pipeline-stage-card">
                    <div className="stage-header">
                      <h4>{stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1)}</h4>
                      <span className="stage-count">{stage.count}</span>
                    </div>
                    <div className="stage-value">
                      {formatInLakhsCompact(stage.total_value)}
                    </div>
                    <div className="stage-bar">
                      <div
                        className="stage-bar-fill"
                        style={{
                          width: `${dashboard.pipeline.total_pipeline_value > 0 
                            ? (stage.total_value / dashboard.pipeline.total_pipeline_value) * 100 
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="activity-empty">No pipeline data available for this period</p>
                <p className="activity-note">
                  Pipeline stages will appear here as opportunities are created.
                </p>
              </div>
            )}
          </Card>

          <Card className="dashboard-section">
            <h2>Weighted Pipeline Analysis</h2>
            <div className="weighted-pipeline">
              <div className="pipeline-metric">
                <div className="pipeline-label">Total Pipeline</div>
                <div className="pipeline-value">{formatInLakhsCompact(dashboard.pipeline.total_pipeline_value)}</div>
              </div>
              <div className="pipeline-metric">
                <div className="pipeline-label">Weighted Pipeline</div>
                <div className="pipeline-value weighted">
                  {formatInLakhsCompact(dashboard.pipeline.weighted_pipeline_value)}
                </div>
              </div>
              <div className="pipeline-metric">
                <div className="pipeline-label">Confidence</div>
                <div className="pipeline-value">
                  {dashboard.pipeline.total_pipeline_value > 0
                    ? ((dashboard.pipeline.weighted_pipeline_value / dashboard.pipeline.total_pipeline_value) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="dashboard-sections">
          <Card className="dashboard-section">
            <h2>Top Products</h2>
            {dashboard.top_products.length > 0 ? (
              <div className="top-list">
                {dashboard.top_products.slice(0, 10).map((product, index) => (
                  <div key={product.id || (product as any)._id || index} className="top-item">
                    <div className="item-rank">{index + 1}</div>
                    <div className="item-info">
                      <div className="item-name">{product.name}</div>
                      <div className="item-details">
                        {product.quantity_sold.toFixed(0)} units · {formatInLakhsCompact(product.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="activity-empty">No product sales data available</p>
                <p className="activity-note">
                  Top products will appear here as sales are recorded.
                </p>
              </div>
            )}
          </Card>

          <Card className="dashboard-section">
            <h2>Top Customers</h2>
            {dashboard.top_customers.length > 0 ? (
              <div className="top-list">
                {dashboard.top_customers.slice(0, 10).map((customer, index) => (
                  <div key={customer.id || (customer as any)._id || index} className="top-item">
                    <div className="item-rank">{index + 1}</div>
                    <div className="item-info">
                      <div className="item-name">{customer.name}</div>
                      <div className="item-details">
                        {customer.order_count} orders · {formatInLakhsCompact(customer.total_revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="activity-empty">No customer sales data available</p>
                <p className="activity-note">
                  Top customers will appear here as orders are placed.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
