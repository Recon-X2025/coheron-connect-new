import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Target, BarChart3, PieChart } from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { salesService, type SalesDashboard } from '../../services/salesService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './SalesDashboard.css';

export const SalesDashboard = () => {
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadDashboard();
  }, [periodStart, periodEnd]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await salesService.analytics.getDashboard({
        period_start: periodStart,
        period_end: periodEnd,
      });
      setDashboard(data as any);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sales-dashboard">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading sales dashboard..." />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="sales-dashboard">
        <div className="container">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const conversionTrend = dashboard.conversion.quotes_sent > 0
    ? ((dashboard.conversion.quotes_converted / dashboard.conversion.quotes_sent) * 100).toFixed(1)
    : '0.0';

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

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card revenue">
            <div className="metric-icon">
              <DollarSign size={24} />
            </div>
            <div className="metric-content">
              <h3>Total Revenue</h3>
              <p className="metric-value">{formatInLakhsCompact(dashboard.revenue.total_revenue)}</p>
              <span className="metric-label">{dashboard.revenue.total_orders} orders</span>
            </div>
          </div>

          <div className="metric-card conversion">
            <div className="metric-icon">
              <Target size={24} />
            </div>
            <div className="metric-content">
              <h3>Conversion Rate</h3>
              <p className="metric-value">{conversionTrend}%</p>
              <span className="metric-label">
                {dashboard.conversion.quotes_converted} of {dashboard.conversion.quotes_sent} quotes
              </span>
            </div>
          </div>

          <div className="metric-card pipeline">
            <div className="metric-icon">
              <TrendingUp size={24} />
            </div>
            <div className="metric-content">
              <h3>Pipeline Value</h3>
              <p className="metric-value">{formatInLakhsCompact(dashboard.pipeline.total_pipeline_value)}</p>
              <span className="metric-label">
                {dashboard.pipeline.total_opportunities} opportunities
              </span>
            </div>
          </div>

          <div className="metric-card customers">
            <div className="metric-icon">
              <Users size={24} />
            </div>
            <div className="metric-content">
              <h3>Active Customers</h3>
              <p className="metric-value">{dashboard.revenue.unique_customers}</p>
              <span className="metric-label">In this period</span>
            </div>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="dashboard-section">
          <h2>Pipeline by Stage</h2>
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
                      width: `${(stage.total_value / dashboard.pipeline.total_pipeline_value) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products & Customers */}
        <div className="dashboard-section two-column">
          <div className="section-card">
            <h2>
              <BarChart3 size={20} />
              Top Products
            </h2>
            <div className="top-list">
              {dashboard.top_products.slice(0, 10).map((product, index) => (
                <div key={product.id} className="top-item">
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
          </div>

          <div className="section-card">
            <h2>
              <Users size={20} />
              Top Customers
            </h2>
            <div className="top-list">
              {dashboard.top_customers.slice(0, 10).map((customer, index) => (
                <div key={customer.id} className="top-item">
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
          </div>
        </div>

        {/* Weighted Pipeline */}
        <div className="dashboard-section">
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
        </div>
      </div>
    </div>
  );
};

