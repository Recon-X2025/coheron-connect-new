import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { manufacturingService } from '../../services/manufacturingService';
import './CostingAnalytics.css';

export const CostingAnalytics = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [oeeData, setOEEData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const [analyticsData, oeeTracking] = await Promise.all([
        manufacturingService.getCostingAnalytics(params),
        manufacturingService.getOEETracking(params),
      ]);

      setAnalytics(analyticsData);
      setOEEData(oeeTracking);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateVariancePercent = () => {
    if (!analytics?.summary) return 0;
    const standard = parseFloat(analytics.summary.total_standard_cost || 0);
    const variance = parseFloat(analytics.summary.total_variance || 0);
    return standard > 0 ? (variance / standard) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="costing-analytics-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading analytics..." />
        </div>
      </div>
    );
  }

  return (
    <div className="costing-analytics-page">
      <div className="container">
        <div className="analytics-header">
          <div>
            <h1>Costing & Analytics</h1>
            <p className="analytics-subtitle">Manufacturing performance and cost analysis</p>
          </div>
          <div className="date-filters">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="date-input"
              placeholder="From Date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="date-input"
              placeholder="To Date"
            />
            <Button icon={<Filter size={16} />} onClick={loadData}>
              Apply Filter
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon total">
              <DollarSign size={24} />
            </div>
            <div className="summary-content">
              <div className="summary-label">Total Standard Cost</div>
              <div className="summary-value">
                ${analytics?.summary?.total_standard_cost?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon actual">
              <DollarSign size={24} />
            </div>
            <div className="summary-content">
              <div className="summary-label">Total Actual Cost</div>
              <div className="summary-value">
                ${analytics?.summary?.total_actual_cost?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className={`summary-icon ${calculateVariancePercent() > 0 ? 'variance-negative' : 'variance-positive'}`}>
              {calculateVariancePercent() > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div className="summary-content">
              <div className="summary-label">Total Variance</div>
              <div className={`summary-value ${calculateVariancePercent() > 0 ? 'negative' : 'positive'}`}>
                ${analytics?.summary?.total_variance?.toFixed(2) || '0.00'}
              </div>
              <div className="summary-percent">
                {calculateVariancePercent().toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon mos">
              <BarChart3 size={24} />
            </div>
            <div className="summary-content">
              <div className="summary-label">Total MOs</div>
              <div className="summary-value">{analytics?.summary?.total_mos || 0}</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon avg-variance">
              <TrendingUp size={24} />
            </div>
            <div className="summary-content">
              <div className="summary-label">Avg Variance %</div>
              <div className="summary-value">
                {analytics?.summary?.avg_variance_percent?.toFixed(2) || '0.00'}%
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        {analytics?.breakdown && analytics.breakdown.length > 0 && (
          <div className="cost-breakdown-section">
            <h2>Cost Breakdown by Type</h2>
            <div className="breakdown-table-container">
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Cost Type</th>
                    <th>Standard Cost</th>
                    <th>Actual Cost</th>
                    <th>Variance</th>
                    <th>Variance %</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.breakdown.map((item: any, idx: number) => {
                    const variancePercent =
                      parseFloat(item.total_standard || 0) > 0
                        ? (parseFloat(item.total_variance || 0) / parseFloat(item.total_standard || 0)) * 100
                        : 0;
                    return (
                      <tr key={idx}>
                        <td>
                          <strong>{item.cost_type}</strong>
                        </td>
                        <td>${parseFloat(item.total_standard || 0).toFixed(2)}</td>
                        <td>${parseFloat(item.total_actual || 0).toFixed(2)}</td>
                        <td
                          className={
                            parseFloat(item.total_variance || 0) > 0
                              ? 'variance-negative'
                              : 'variance-positive'
                          }
                        >
                          ${parseFloat(item.total_variance || 0).toFixed(2)}
                        </td>
                        <td
                          className={
                            variancePercent > 0 ? 'variance-negative' : 'variance-positive'
                          }
                        >
                          {variancePercent.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OEE Tracking */}
        {oeeData && (
          <div className="oee-section">
            <h2>Overall Equipment Effectiveness (OEE)</h2>
            {oeeData.averages && (
              <div className="oee-averages">
                <div className="oee-metric">
                  <div className="oee-label">Availability</div>
                  <div className="oee-value">{oeeData.averages.availability?.toFixed(2) || 0}%</div>
                  <div className="oee-bar">
                    <div
                      className="oee-bar-fill availability"
                      style={{ width: `${oeeData.averages.availability || 0}%` }}
                    />
                  </div>
                </div>
                <div className="oee-metric">
                  <div className="oee-label">Performance</div>
                  <div className="oee-value">{oeeData.averages.performance?.toFixed(2) || 0}%</div>
                  <div className="oee-bar">
                    <div
                      className="oee-bar-fill performance"
                      style={{ width: `${oeeData.averages.performance || 0}%` }}
                    />
                  </div>
                </div>
                <div className="oee-metric">
                  <div className="oee-label">Quality</div>
                  <div className="oee-value">{oeeData.averages.quality?.toFixed(2) || 0}%</div>
                  <div className="oee-bar">
                    <div
                      className="oee-bar-fill quality"
                      style={{ width: `${oeeData.averages.quality || 0}%` }}
                    />
                  </div>
                </div>
                <div className="oee-metric">
                  <div className="oee-label">Overall OEE</div>
                  <div className="oee-value overall">
                    {oeeData.averages.oee?.toFixed(2) || 0}%
                  </div>
                  <div className="oee-bar">
                    <div
                      className="oee-bar-fill overall"
                      style={{ width: `${oeeData.averages.oee || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {oeeData.tracking && oeeData.tracking.length > 0 && (
              <div className="oee-tracking-table-container">
                <table className="oee-tracking-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Work Center</th>
                      <th>Availability</th>
                      <th>Performance</th>
                      <th>Quality</th>
                      <th>OEE</th>
                      <th>Units Produced</th>
                      <th>Downtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oeeData.tracking.slice(0, 10).map((track: any, idx: number) => (
                      <tr key={idx}>
                        <td>
                          {track.date_tracked
                            ? new Date(track.date_tracked).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>{track.workcenter_name || '-'}</td>
                        <td>{track.availability_percent?.toFixed(2) || 0}%</td>
                        <td>{track.performance_percent?.toFixed(2) || 0}%</td>
                        <td>{track.quality_percent?.toFixed(2) || 0}%</td>
                        <td>
                          <strong>{track.oee_percent?.toFixed(2) || 0}%</strong>
                        </td>
                        <td>{track.units_produced || 0}</td>
                        <td>{track.downtime?.toFixed(2) || 0}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CostingAnalytics;

