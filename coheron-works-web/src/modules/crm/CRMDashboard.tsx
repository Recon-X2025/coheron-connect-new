import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  AlertCircle,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Card } from '../../components/Card';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { showToast } from '../../components/Toast';
import './CRMDashboard.css';

interface CRMDashboardStats {
  totalLeads: number;
  totalOpportunities: number;
  totalCustomers: number;
  pipelineValue: number;
  convertedLeads: number;
  openOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
  pendingTasks: number;
  upcomingMeetings: number;
  conversionRate: number;
  winRate: number;
}

export const CRMDashboard: React.FC = () => {
  const [stats, setStats] = useState<CRMDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentOpportunities, setRecentOpportunities] = useState<any[]>([]);
  const [pipelineByStage, setPipelineByStage] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [leads, opportunities, customers, tasks] = await Promise.all([
        apiService.get<any>('/leads', { type: 'lead' }).catch((err) => { console.error('Failed to load leads:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/leads', { type: 'opportunity' }).catch((err) => { console.error('Failed to load opportunities:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/partners', { is_customer: true }).catch((err) => { console.error('Failed to load customers:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/crm/tasks', { status: 'pending' }).catch((err) => { console.error('Failed to load tasks:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/crm/pipeline/stages').catch((err) => { console.error('Failed to load pipeline stages:', err.userMessage || err.message); return []; }),
      ]);

      const convertedLeads = leads.filter((l: any) => l.stage === 'converted' || l.is_converted).length;
      const openOpportunities = opportunities.filter((o: any) => 
        !['won', 'lost', 'cancelled'].includes(o.stage?.toLowerCase())
      ).length;
      const wonOpportunities = opportunities.filter((o: any) => o.stage?.toLowerCase() === 'won').length;
      const lostOpportunities = opportunities.filter((o: any) => o.stage?.toLowerCase() === 'lost').length;
      
      const pipelineValue = opportunities.reduce((sum: number, opp: any) => {
        const amount = typeof opp.expected_revenue === 'string'
          ? parseFloat(opp.expected_revenue.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(opp.expected_revenue) || 0;
        return sum + amount;
      }, 0);

      const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;
      const winRate = (openOpportunities + wonOpportunities + lostOpportunities) > 0
        ? (wonOpportunities / (openOpportunities + wonOpportunities + lostOpportunities)) * 100
        : 0;

      // Get upcoming meetings (assuming tasks can have type 'meeting')
      const upcomingMeetings = tasks.filter((t: any) => 
        t.type === 'meeting' && new Date(t.due_date) >= new Date()
      ).length;

      setStats({
        totalLeads: leads.length,
        totalOpportunities: opportunities.length,
        totalCustomers: customers.length,
        pipelineValue,
        convertedLeads,
        openOpportunities,
        wonOpportunities,
        lostOpportunities,
        pendingTasks: tasks.length,
        upcomingMeetings,
        conversionRate,
        winRate,
      });

      // Set recent items
      setRecentLeads(leads.slice(0, 5));
      setRecentOpportunities(opportunities.slice(0, 5));
      
      // Pipeline by stage
      const stageMap = new Map<string, { count: number; value: number }>();
      opportunities.forEach((opp: any) => {
        const stage = opp.stage || 'new';
        const existing = stageMap.get(stage) || { count: 0, value: 0 };
        const amount = typeof opp.expected_revenue === 'string'
          ? parseFloat(opp.expected_revenue.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(opp.expected_revenue) || 0;
        stageMap.set(stage, {
          count: existing.count + 1,
          value: existing.value + amount,
        });
      });
      setPipelineByStage(Array.from(stageMap.entries()).map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
      })));
    } catch (error: any) {
      console.error('Failed to load CRM dashboard data:', error);
      showToast(error.userMessage || 'Failed to load CRM data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="crm-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading CRM dashboard..." />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Leads',
      value: stats?.totalLeads || 0,
      icon: <Users size={24} />,
      color: '#3b82f6',
      link: '/crm/leads',
      change: stats && stats.totalLeads > 0 ? '+12%' : '0%',
      trend: 'up' as const,
    },
    {
      title: 'Active Opportunities',
      value: stats?.openOpportunities || 0,
      icon: <Target size={24} />,
      color: '#8b5cf6',
      link: '/crm/opportunities',
      change: `${stats?.conversionRate.toFixed(1) || 0}% conversion`,
      trend: 'up' as const,
    },
    {
      title: 'Pipeline Value',
      value: formatInLakhsCompact(stats?.pipelineValue || 0),
      icon: <DollarSign size={24} />,
      color: '#10b981',
      link: '/crm/pipeline',
      change: stats?.totalOpportunities || 0 > 0 ? `${stats?.totalOpportunities} opportunities` : 'No opportunities',
      trend: 'up' as const,
    },
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: <Users size={24} />,
      color: '#f59e0b',
      link: '/crm/customers',
      change: stats?.convertedLeads || 0 > 0 ? `${stats?.convertedLeads} converted` : 'No conversions',
      trend: 'up' as const,
    },
    {
      title: 'Win Rate',
      value: `${stats?.winRate.toFixed(1) || 0}%`,
      icon: <TrendingUp size={24} />,
      color: '#ec4899',
      link: '/crm/opportunities',
      change: `${stats?.wonOpportunities || 0} won / ${stats?.lostOpportunities || 0} lost`,
      trend: stats && stats.winRate > 50 ? 'up' as const : 'down' as const,
    },
    {
      title: 'Pending Tasks',
      value: stats?.pendingTasks || 0,
      icon: <Clock size={24} />,
      color: '#ef4444',
      link: '/crm/tasks',
      change: `${stats?.upcomingMeetings || 0} meetings`,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="crm-dashboard">
      <div className="container">
        <div className="crm-dashboard-header">
          <div>
            <h1>CRM Dashboard</h1>
            <p className="crm-dashboard-subtitle">Manage your customer relationships and sales pipeline</p>
          </div>
          <Link to="/crm/pipeline" className="btn-primary">
            View Pipeline
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="crm-dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="crm-stat-card-link">
              <Card className="crm-stat-card" hover>
                <div className="crm-stat-header">
                  <div className="crm-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className={`crm-stat-change ${stat.trend}`}>
                    {stat.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {stat.change}
                  </div>
                </div>
                <div className="crm-stat-content">
                  <h3 className="crm-stat-value">{stat.value}</h3>
                  <p className="crm-stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="crm-dashboard-sections">
          {/* Pipeline by Stage */}
          {pipelineByStage.length > 0 && (
            <Card className="crm-dashboard-section">
              <h2>Pipeline by Stage</h2>
              <div className="crm-pipeline-stages">
                {pipelineByStage.map((stage, index) => (
                  <div key={index} className="crm-pipeline-stage-card">
                    <div className="crm-stage-header">
                      <h4>{stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1)}</h4>
                      <span className="crm-stage-count">{stage.count}</span>
                    </div>
                    <div className="crm-stage-value">
                      {formatInLakhsCompact(stage.value)}
                    </div>
                    <div className="crm-stage-bar">
                      <div
                        className="crm-stage-bar-fill"
                        style={{
                          width: `${stats && stats.pipelineValue > 0 ? (stage.value / stats.pipelineValue) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Leads */}
          <Card className="crm-dashboard-section">
            <div className="crm-section-header">
              <h2>Recent Leads</h2>
              <Link to="/crm/leads" className="crm-view-all">View All</Link>
            </div>
            <div className="crm-recent-list">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead, idx) => (
                  <div key={lead.id || (lead as any)._id || idx} className="crm-recent-item">
                    <div className="crm-recent-item-info">
                      <h4>{lead.name || lead.contact_name || 'Unnamed Lead'}</h4>
                      <p>{lead.email || lead.email_address || 'No email'}</p>
                    </div>
                    <div className="crm-recent-item-meta">
                      <span className={`crm-status-badge ${lead.stage || 'new'}`}>
                        {lead.stage || 'New'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="crm-empty-state">No leads found</p>
              )}
            </div>
          </Card>

          {/* Recent Opportunities */}
          <Card className="crm-dashboard-section">
            <div className="crm-section-header">
              <h2>Recent Opportunities</h2>
              <Link to="/crm/opportunities" className="crm-view-all">View All</Link>
            </div>
            <div className="crm-recent-list">
              {recentOpportunities.length > 0 ? (
                recentOpportunities.map((opp, idx) => (
                  <div key={opp.id || (opp as any)._id || idx} className="crm-recent-item">
                    <div className="crm-recent-item-info">
                      <h4>{opp.name || 'Unnamed Opportunity'}</h4>
                      <p>{formatInLakhsCompact(
                        typeof opp.expected_revenue === 'string'
                          ? parseFloat(opp.expected_revenue.replace(/[^\d.-]/g, '')) || 0
                          : parseFloat(opp.expected_revenue) || 0
                      )}</p>
                    </div>
                    <div className="crm-recent-item-meta">
                      <span className={`crm-status-badge ${opp.stage || 'new'}`}>
                        {opp.stage || 'New'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="crm-empty-state">No opportunities found</p>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="crm-dashboard-section">
            <h2>Quick Actions</h2>
            <div className="crm-quick-actions">
              <Link to="/crm/leads" className="crm-quick-action">
                <Users size={20} />
                <span>Manage Leads</span>
              </Link>
              <Link to="/crm/opportunities" className="crm-quick-action">
                <Target size={20} />
                <span>View Opportunities</span>
              </Link>
              <Link to="/crm/pipeline" className="crm-quick-action">
                <TrendingUp size={20} />
                <span>Sales Pipeline</span>
              </Link>
              <Link to="/crm/customers" className="crm-quick-action">
                <Users size={20} />
                <span>Customers</span>
              </Link>
              <Link to="/crm/tasks" className="crm-quick-action">
                <Calendar size={20} />
                <span>Tasks & Calendar</span>
              </Link>
              <Link to="/crm/automation" className="crm-quick-action">
                <AlertCircle size={20} />
                <span>Automation</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

