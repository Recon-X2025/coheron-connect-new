import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  BarChart3,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Card } from '../../components/Card';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { showToast } from '../../components/Toast';
import './MarketingDashboard.css';

interface MarketingDashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  totalRevenue: number;
  totalBudget: number;
  totalSpent: number;
  emailSent: number;
  clicks: number;
  impressions: number;
}

export const MarketingDashboard: React.FC = () => {
  const [stats, setStats] = useState<MarketingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [campaigns, leads] = await Promise.all([
        apiService.get<any>('/campaigns').catch((err) => { console.error('Failed to load campaigns:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/leads', { type: 'lead' }).catch((err) => { console.error('Failed to load leads:', err.userMessage || err.message); return []; }),
      ]);

      const activeCampaigns = campaigns.filter((c: any) => 
        c.state === 'in_progress' || c.state === 'running'
      );

      const totalBudget = campaigns.reduce((sum: number, c: any) => {
        const budget = typeof c.budget === 'string'
          ? parseFloat(c.budget.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(c.budget) || 0;
        return sum + budget;
      }, 0);

      const totalSpent = campaigns.reduce((sum: number, c: any) => {
        const cost = typeof c.total_cost === 'string'
          ? parseFloat(c.total_cost.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(c.total_cost) || 0;
        return sum + cost;
      }, 0);

      const totalRevenue = campaigns.reduce((sum: number, c: any) => {
        const revenue = typeof c.revenue === 'string'
          ? parseFloat(c.revenue.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(c.revenue) || 0;
        return sum + revenue;
      }, 0);

      const totalClicks = campaigns.reduce((sum: number, c: any) => sum + (c.clicks || 0), 0);
      const totalImpressions = campaigns.reduce((sum: number, c: any) => sum + (c.impressions || 0), 0);
      const totalLeads = campaigns.reduce((sum: number, c: any) => sum + (c.leads_count || 0), 0);

      setStats({
        totalCampaigns: campaigns.length,
        activeCampaigns: activeCampaigns.length,
        totalLeads: totalLeads || leads.length,
        totalRevenue,
        totalBudget,
        totalSpent,
        emailSent: 0, // Would need email data
        clicks: totalClicks,
        impressions: totalImpressions,
      });

      setRecentCampaigns(campaigns.slice(0, 5));
      setActiveCampaigns(activeCampaigns.slice(0, 5));
    } catch (error: any) {
      console.error('Failed to load marketing dashboard data:', error);
      showToast(error.userMessage || 'Failed to load marketing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="marketing-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading marketing dashboard..." />
        </div>
      </div>
    );
  }

  const roi = stats && stats.totalSpent > 0
    ? ((stats.totalRevenue - stats.totalSpent) / stats.totalSpent * 100).toFixed(1)
    : '0.0';

  const ctr = stats && stats.impressions > 0
    ? ((stats.clicks / stats.impressions) * 100).toFixed(2)
    : '0.00';

  const statCards = [
    {
      title: 'Total Campaigns',
      value: stats?.totalCampaigns || 0,
      icon: <Megaphone size={24} />,
      color: '#3b82f6',
      link: '/marketing/campaigns',
    },
    {
      title: 'Active Campaigns',
      value: stats?.activeCampaigns || 0,
      icon: <TrendingUp size={24} />,
      color: '#10b981',
      link: '/marketing/campaigns',
    },
    {
      title: 'Total Leads Generated',
      value: stats?.totalLeads || 0,
      icon: <Users size={24} />,
      color: '#8b5cf6',
      link: '/crm/leads',
    },
    {
      title: 'Campaign Revenue',
      value: formatInLakhsCompact(stats?.totalRevenue || 0),
      icon: <DollarSign size={24} />,
      color: '#f59e0b',
      link: '/marketing/campaigns',
    },
    {
      title: 'ROI',
      value: `${roi}%`,
      icon: <Target size={24} />,
      color: stats && parseFloat(roi) > 0 ? '#10b981' : '#ef4444',
      link: '/marketing/campaigns',
    },
    {
      title: 'Click-Through Rate',
      value: `${ctr}%`,
      icon: <BarChart3 size={24} />,
      color: '#ec4899',
      link: '/marketing/campaigns',
    },
  ];

  return (
    <div className="marketing-dashboard">
      <div className="container">
        <div className="marketing-dashboard-header">
          <div>
            <h1>Marketing Dashboard</h1>
            <p className="marketing-dashboard-subtitle">Campaign performance and marketing metrics</p>
          </div>
          <Link to="/marketing/campaigns" className="btn-primary">
            View Campaigns
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="marketing-dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="marketing-stat-card-link">
              <Card className="marketing-stat-card" hover>
                <div className="marketing-stat-header">
                  <div className="marketing-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="marketing-stat-content">
                  <h3 className="marketing-stat-value">{stat.value}</h3>
                  <p className="marketing-stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="marketing-dashboard-sections">
          {/* Active Campaigns */}
          <Card className="marketing-dashboard-section">
            <div className="marketing-section-header">
              <h2>Active Campaigns</h2>
              <Link to="/marketing/campaigns" className="marketing-view-all">View All</Link>
            </div>
            <div className="marketing-recent-list">
              {activeCampaigns.length > 0 ? (
                activeCampaigns.map((campaign) => (
                  <div key={campaign.id} className="marketing-recent-item">
                    <div className="marketing-recent-item-info">
                      <h4>{campaign.name || 'Unnamed Campaign'}</h4>
                      <p>{campaign.campaign_type || 'Other'} Campaign</p>
                    </div>
                    <div className="marketing-recent-item-meta">
                      <span className={`marketing-status-badge ${campaign.state || 'draft'}`}>
                        {campaign.state || 'Draft'}
                      </span>
                      <span className="marketing-budget">
                        Budget: {formatInLakhsCompact(
                          typeof campaign.budget === 'string'
                            ? parseFloat(campaign.budget.replace(/[^\d.-]/g, '')) || 0
                            : parseFloat(campaign.budget) || 0
                        )}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="marketing-empty-state">No active campaigns</p>
              )}
            </div>
          </Card>

          {/* Recent Campaigns */}
          <Card className="marketing-dashboard-section">
            <div className="marketing-section-header">
              <h2>Recent Campaigns</h2>
              <Link to="/marketing/campaigns" className="marketing-view-all">View All</Link>
            </div>
            <div className="marketing-recent-list">
              {recentCampaigns.length > 0 ? (
                recentCampaigns.map((campaign) => (
                  <div key={campaign.id} className="marketing-recent-item">
                    <div className="marketing-recent-item-info">
                      <h4>{campaign.name || 'Unnamed Campaign'}</h4>
                      <p>{campaign.campaign_type || 'Other'} Campaign</p>
                    </div>
                    <div className="marketing-recent-item-meta">
                      <span className={`marketing-status-badge ${campaign.state || 'draft'}`}>
                        {campaign.state || 'Draft'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="marketing-empty-state">No campaigns found</p>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="marketing-dashboard-section">
            <h2>Quick Actions</h2>
            <div className="marketing-quick-actions">
              <Link to="/marketing/campaigns" className="marketing-quick-action">
                <Megaphone size={20} />
                <span>Manage Campaigns</span>
              </Link>
              <Link to="/crm/leads" className="marketing-quick-action">
                <Users size={20} />
                <span>View Leads</span>
              </Link>
              <Link to="/marketing/campaigns" className="marketing-quick-action">
                <BarChart3 size={20} />
                <span>Analytics</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

