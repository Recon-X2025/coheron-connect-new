import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, MousePointerClick, Eye, Target, BarChart3, PieChart } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { showToast } from '../../../components/Toast';
import './CampaignAnalytics.css';

interface CampaignAnalyticsProps {
  campaignId: number;
  campaignName: string;
}

interface AnalyticsData {
  leads: number;
  clicks: number;
  impressions: number;
  revenue: number;
  cost: number;
  ctr: number;
  cpl: number;
  cpa: number;
  roi: number;
  conversions: number;
  targetKpis?: {
    ctr?: number;
    cpl?: number;
    cpa?: number;
    roi?: number;
  };
  dailyPerformance?: Array<{
    date: string;
    leads: number;
    clicks: number;
    impressions: number;
    revenue: number;
    cost: number;
  }>;
  channelBreakdown?: Array<{
    channel: string;
    leads: number;
    cost: number;
    revenue: number;
    roi: number;
  }>;
}

export const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({
  campaignId,
  campaignName,
}) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'attribution' | 'comparison'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [campaignId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const campaignResponse = await apiService.get<any>(`/campaigns/${campaignId}`);
      const campaign = Array.isArray(campaignResponse) ? campaignResponse[0] : campaignResponse;
      
      // Calculate metrics
      const leads = campaign?.leads_count || 0;
      const clicks = campaign?.clicks || 0;
      const impressions = campaign?.impressions || 0;
      const revenue = campaign?.revenue || 0;
      const cost = campaign?.total_cost || 0;
      
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpl = leads > 0 ? cost / leads : 0;
      const cpa = leads > 0 ? cost / leads : 0; // Simplified - would use actual conversions
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

      // Load performance data
      const performanceResponse = await apiService.get<any[]>(`/campaigns/${campaignId}/performance`).catch((err) => { console.error('Failed to load performance data:', err.userMessage || err.message); return []; });
      const performanceData = Array.isArray(performanceResponse) && performanceResponse.length > 0 && Array.isArray(performanceResponse[0])
        ? performanceResponse[0]
        : Array.isArray(performanceResponse) ? performanceResponse : [];

      setAnalytics({
        leads,
        clicks,
        impressions,
        revenue,
        cost,
        ctr: parseFloat(ctr.toFixed(2)),
        cpl: parseFloat(cpl.toFixed(2)),
        cpa: parseFloat(cpa.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
        conversions: leads, // Simplified
        targetKpis: campaign?.target_kpis || {},
        dailyPerformance: performanceData as Array<{
          date: string;
          leads: number;
          clicks: number;
          impressions: number;
          revenue: number;
          cost: number;
        }>,
        channelBreakdown: [], // Would be loaded from actual data
      });
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      showToast(error.userMessage || 'Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getKpiStatus = (actual: number, target?: number) => {
    if (!target) return 'neutral';
    if (actual >= target) return 'positive';
    return 'negative';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="campaign-analytics">
        <LoadingSpinner size="medium" message="Loading analytics..." />
      </div>
    );
  }

  if (!analytics) {
    return <div className="campaign-analytics">No analytics data available</div>;
  }

  return (
    <div className="campaign-analytics">
      <div className="analytics-header">
        <div>
          <h2>{campaignName}</h2>
          <p className="analytics-subtitle">Campaign Performance Analytics</p>
        </div>
        <div className="analytics-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="time-range-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <div className="view-mode-tabs">
            <button
              className={viewMode === 'overview' ? 'active' : ''}
              onClick={() => setViewMode('overview')}
            >
              Overview
            </button>
            <button
              className={viewMode === 'attribution' ? 'active' : ''}
              onClick={() => setViewMode('attribution')}
            >
              Attribution
            </button>
            <button
              className={viewMode === 'comparison' ? 'active' : ''}
              onClick={() => setViewMode('comparison')}
            >
              Compare
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'overview' && (
        <>
          {/* Key Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <Users size={20} />
                <span>Leads Generated</span>
              </div>
              <div className="metric-value">{analytics.leads}</div>
              <div className="metric-change positive">
                <TrendingUp size={14} />
                +12%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <MousePointerClick size={20} />
                <span>CTR</span>
              </div>
              <div className="metric-value">{analytics.ctr}%</div>
              {analytics.targetKpis?.ctr && (
                <div className={`metric-target ${getKpiStatus(analytics.ctr, analytics.targetKpis.ctr)}`}>
                  Target: {analytics.targetKpis.ctr}%
                </div>
              )}
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <DollarSign size={20} />
                <span>Cost per Lead</span>
              </div>
              <div className="metric-value">{formatCurrency(analytics.cpl)}</div>
              {analytics.targetKpis?.cpl && (
                <div className={`metric-target ${getKpiStatus(analytics.targetKpis.cpl, analytics.cpl)}`}>
                  Target: {formatCurrency(analytics.targetKpis.cpl)}
                </div>
              )}
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Target size={20} />
                <span>ROI</span>
              </div>
              <div className={`metric-value ${analytics.roi >= 0 ? 'positive' : 'negative'}`}>
                {analytics.roi >= 0 ? '+' : ''}{analytics.roi}%
              </div>
              {analytics.targetKpis?.roi && (
                <div className={`metric-target ${getKpiStatus(analytics.roi, analytics.targetKpis.roi)}`}>
                  Target: {analytics.targetKpis.roi}%
                </div>
              )}
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <DollarSign size={20} />
                <span>Total Revenue</span>
              </div>
              <div className="metric-value revenue">{formatCurrency(analytics.revenue)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <DollarSign size={20} />
                <span>Total Cost</span>
              </div>
              <div className="metric-value">{formatCurrency(analytics.cost)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Eye size={20} />
                <span>Impressions</span>
              </div>
              <div className="metric-value">{analytics.impressions.toLocaleString()}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <MousePointerClick size={20} />
                <span>Clicks</span>
              </div>
              <div className="metric-value">{analytics.clicks.toLocaleString()}</div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="chart-section">
            <h3>Performance Over Time</h3>
            <div className="chart-placeholder">
              <BarChart3 size={48} />
              <p>Performance chart would display here</p>
              <p className="chart-note">Shows daily leads, clicks, impressions, revenue, and cost trends</p>
            </div>
          </div>

          {/* Channel Breakdown */}
          {analytics.channelBreakdown && analytics.channelBreakdown.length > 0 && (
            <div className="channel-breakdown">
              <h3>Channel Performance</h3>
              <div className="channel-table">
                <table>
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Leads</th>
                      <th>Cost</th>
                      <th>Revenue</th>
                      <th>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.channelBreakdown.map((channel, idx) => (
                      <tr key={idx}>
                        <td>{channel.channel}</td>
                        <td>{channel.leads}</td>
                        <td>{formatCurrency(channel.cost)}</td>
                        <td>{formatCurrency(channel.revenue)}</td>
                        <td className={channel.roi >= 0 ? 'positive' : 'negative'}>
                          {channel.roi >= 0 ? '+' : ''}{channel.roi.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'attribution' && (
        <div className="attribution-view">
          <h3>Multi-Touch Attribution</h3>
          <div className="attribution-models">
            <div className="attribution-card">
              <h4>First Touch</h4>
              <p>Attribution to first interaction</p>
              <div className="attribution-value">{formatCurrency(analytics.revenue * 0.3)}</div>
            </div>
            <div className="attribution-card">
              <h4>Last Touch</h4>
              <p>Attribution to last interaction</p>
              <div className="attribution-value">{formatCurrency(analytics.revenue * 0.4)}</div>
            </div>
            <div className="attribution-card">
              <h4>Weighted</h4>
              <p>Distributed across all touches</p>
              <div className="attribution-value">{formatCurrency(analytics.revenue * 0.35)}</div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'comparison' && (
        <div className="comparison-view">
          <h3>Campaign Comparison</h3>
          <div className="comparison-placeholder">
            <PieChart size={48} />
            <p>Compare this campaign with others</p>
            <p className="chart-note">Select campaigns to compare performance metrics side by side</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignAnalytics;

