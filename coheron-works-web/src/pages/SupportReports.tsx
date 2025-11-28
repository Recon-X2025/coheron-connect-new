import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supportDeskService } from '../services/supportDeskService';
import './SupportReports.css';

export const SupportReports: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [agentPerformance, setAgentPerformance] = useState<any[]>([]);
  const [ticketTrends, setTicketTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadDashboardData();
    loadAgentPerformance();
    loadTicketTrends();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const data = await supportDeskService.getDashboard(params);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentPerformance = async () => {
    try {
      const params: any = {};
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const data = await supportDeskService.getAgentPerformance(params);
      setAgentPerformance(data);
    } catch (error) {
      console.error('Error loading agent performance:', error);
    }
  };

  const loadTicketTrends = async () => {
    try {
      const params: any = { period: 'day' };
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const data = await supportDeskService.getTicketTrends(params);
      setTicketTrends(data);
    } catch (error) {
      console.error('Error loading trends:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: '#ef4444',
      in_progress: '#f59e0b',
      pending: '#64748b',
      resolved: '#22c55e',
      closed: '#16a34a',
    };
    return colors[status] || '#666';
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (loading && !dashboardData) {
    return (
      <div className="support-reports">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading reports..." />
        </div>
      </div>
    );
  }

  return (
    <div className="support-reports">
      <div className="reports-header">
        <div>
          <h1>Support Reports & Analytics</h1>
          <p className="reports-subtitle">Track performance, trends, and SLA metrics</p>
        </div>
        <div className="reports-actions">
          <div className="date-range-selector">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="date-input"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="date-input"
            />
          </div>
          <Button variant="secondary" icon={<Download size={18} />}>
            Export
          </Button>
        </div>
      </div>

      {dashboardData && (
        <div className="reports-grid">
          {/* Key Metrics */}
          <Card className="metric-card">
            <div className="metric-header">
              <h3>Total Tickets</h3>
              <BarChart3 size={24} className="metric-icon" />
            </div>
            <div className="metric-value">{dashboardData.total_tickets}</div>
            <div className="metric-label">All time tickets</div>
          </Card>

          <Card className="metric-card">
            <div className="metric-header">
              <h3>Avg Response Time</h3>
              <Clock size={24} className="metric-icon" />
            </div>
            <div className="metric-value">
              {formatTime(dashboardData.avg_response_time_minutes || 0)}
            </div>
            <div className="metric-label">First response</div>
          </Card>

          <Card className="metric-card">
            <div className="metric-header">
              <h3>Avg Resolution Time</h3>
              <TrendingUp size={24} className="metric-icon" />
            </div>
            <div className="metric-value">
              {formatTime(dashboardData.avg_resolution_time_minutes || 0)}
            </div>
            <div className="metric-label">Time to resolve</div>
          </Card>

          <Card className="metric-card">
            <div className="metric-header">
              <h3>SLA Compliance</h3>
              <CheckCircle size={24} className="metric-icon" />
            </div>
            <div className="metric-value">
              {dashboardData.sla_metrics
                ? `${Math.round(100 - (dashboardData.sla_metrics.breach_rate || 0))}%`
                : 'N/A'}
            </div>
            <div className="metric-label">
              {dashboardData.sla_metrics?.breached_count || 0} breaches
            </div>
          </Card>

          {/* Tickets by Status */}
          <Card className="chart-card">
            <h3>Tickets by Status</h3>
            <div className="status-chart">
              {dashboardData.tickets_by_status?.map((item: any) => (
                <div key={item.status} className="status-bar-item">
                  <div className="status-bar-header">
                    <span className="status-label">{item.status.replace('_', ' ')}</span>
                    <span className="status-count">{item.count}</span>
                  </div>
                  <div className="status-bar">
                    <div
                      className="status-bar-fill"
                      style={{
                        width: `${(item.count / dashboardData.total_tickets) * 100}%`,
                        backgroundColor: getStatusColor(item.status),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tickets by Priority */}
          <Card className="chart-card">
            <h3>Tickets by Priority</h3>
            <div className="priority-chart">
              {dashboardData.tickets_by_priority?.map((item: any) => (
                <div key={item.priority} className="priority-item">
                  <span className="priority-label">{item.priority.toUpperCase()}</span>
                  <div className="priority-bar">
                    <div
                      className="priority-bar-fill"
                      style={{
                        width: `${(item.count / dashboardData.total_tickets) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="priority-count">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Agent Performance */}
          <Card className="table-card">
            <h3>Agent Performance</h3>
            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Assigned</th>
                    <th>Resolved</th>
                    <th>Avg Response</th>
                    <th>Avg Resolution</th>
                    <th>SLA Met</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.slice(0, 10).map((agent: any) => (
                    <tr key={agent.agent_id}>
                      <td className="agent-name">{agent.agent_name || 'Unassigned'}</td>
                      <td>{agent.tickets_assigned || 0}</td>
                      <td>{agent.tickets_resolved || 0}</td>
                      <td>{formatTime(agent.avg_first_response_minutes || 0)}</td>
                      <td>{formatTime(agent.avg_resolution_minutes || 0)}</td>
                      <td>
                        <span className="sla-badge">
                          {agent.sla_met_count || 0} / {agent.sla_breached_count || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Ticket Trends */}
          <Card className="chart-card full-width">
            <h3>Ticket Volume Trends</h3>
            <div className="trends-chart">
              {ticketTrends.length > 0 ? (
                <div className="trends-bars">
                  {ticketTrends.slice(-14).map((trend: any, idx: number) => (
                    <div key={idx} className="trend-bar-item">
                      <div className="trend-bar-container">
                        <div
                          className="trend-bar trend-bar-open"
                          style={{
                            height: `${(trend.open_count / Math.max(...ticketTrends.map((t: any) => t.ticket_count))) * 100}%`,
                          }}
                        />
                        <div
                          className="trend-bar trend-bar-resolved"
                          style={{
                            height: `${(trend.resolved_count / Math.max(...ticketTrends.map((t: any) => t.ticket_count))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="trend-label">
                        {new Date(trend.period).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">No trend data available</div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SupportReports;

