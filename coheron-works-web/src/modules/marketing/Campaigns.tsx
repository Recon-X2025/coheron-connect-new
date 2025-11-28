import { useState, useEffect } from 'react';
import { Search, Plus, Megaphone, TrendingUp, Users, Mail, Calendar } from 'lucide-react';
import { Button } from '../../components/Button';
import { odooService } from '../../services/odooService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AdvancedFilter } from '../../shared/components/AdvancedFilter';
import { BulkActions, createCommonBulkActions } from '../../shared/components/BulkActions';
import { CampaignForm } from './components/CampaignForm';
import { CampaignAnalytics } from './components/CampaignAnalytics';
import { CampaignFinancials } from './components/CampaignFinancials';
import './Campaigns.css';

export interface Campaign {
  id: number;
  name: string;
  campaign_type: 'email' | 'social' | 'website' | 'other';
  state: 'draft' | 'in_progress' | 'done' | 'cancel';
  start_date?: string;
  end_date?: string;
  budget?: number;
  revenue?: number;
  expected_revenue?: number;
  user_id: number;
  total_cost?: number;
  clicks?: number;
  impressions?: number;
  leads_count?: number;
}

export const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterDomain, setFilterDomain] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'list' | 'analytics' | 'financials'>('list');

  useEffect(() => {
    loadData();
  }, [filterDomain]);

  const loadData = async () => {
    try {
      setLoading(true);
      const campaignsData = await odooService.search<Campaign>(
        'utm.campaign',
        filterDomain,
        [
          'id',
          'name',
          'campaign_type',
          'state',
          'start_date',
          'end_date',
          'budget',
          'revenue',
          'expected_revenue',
          'user_id',
          'total_cost',
          'clicks',
          'impressions',
          'leads_count',
        ]
      );

      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: Campaign['campaign_type']) => {
    switch (type) {
      case 'email':
        return <Mail size={18} />;
      case 'social':
        return <Megaphone size={18} />;
      case 'website':
        return <TrendingUp size={18} />;
      default:
        return <Megaphone size={18} />;
    }
  };

  const getTypeLabel = (type: Campaign['campaign_type']) => {
    const labels: Record<Campaign['campaign_type'], string> = {
      email: 'Email',
      social: 'Social Media',
      website: 'Website',
      other: 'Other',
    };
    return labels[type] || 'Other';
  };

  const getStateLabel = (state: Campaign['state']) => {
    const labels: Record<Campaign['state'], string> = {
      draft: 'Draft',
      in_progress: 'In Progress',
      done: 'Completed',
      cancel: 'Cancelled',
    };
    return labels[state] || state;
  };

  const getStateColor = (state: Campaign['state']) => {
    const colors: Record<Campaign['state'], string> = {
      draft: '#64748b',
      in_progress: '#3b82f6',
      done: '#10b981',
      cancel: '#ef4444',
    };
    return colors[state] || '#64748b';
  };

  const calculateROI = (campaign: Campaign) => {
    if (!campaign.total_cost || campaign.total_cost === 0) return 0;
    const revenue = campaign.revenue || 0;
    return ((revenue - campaign.total_cost) / campaign.total_cost) * 100;
  };

  const handleDelete = async (ids: number[]) => {
    if (window.confirm(`Are you sure you want to delete ${ids.length} campaign(s)?`)) {
      try {
        await odooService.unlink('utm.campaign', ids);
        await loadData();
        setSelectedIds([]);
      } catch (error) {
        console.error('Failed to delete campaigns:', error);
      }
    }
  };

  const handleBulkUpdate = async (ids: number[]) => {
    console.log('Bulk update for:', ids);
  };

  const handleBulkAssign = async (ids: number[]) => {
    console.log('Bulk assign for:', ids);
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return campaign.name.toLowerCase().includes(searchLower);
  });

  const filterFields = [
    { name: 'campaign_type', label: 'Type', type: 'selection' as const },
    { name: 'state', label: 'State', type: 'selection' as const },
    { name: 'start_date', label: 'Start Date', type: 'date' as const },
  ];

  if (loading) {
    return (
      <div className="campaigns-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading campaigns..." />
        </div>
      </div>
    );
  }

  return (
    <div className="campaigns-page">
      <div className="container">
        <div className="campaigns-header">
          <div>
            <h1>Marketing Campaigns</h1>
            <p className="campaigns-subtitle">
              {filteredCampaigns.length} campaign(s) found
            </p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => {
            setEditingCampaignId(undefined);
            setShowCampaignForm(true);
          }}>New Campaign</Button>
        </div>

        <div className="campaigns-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <AdvancedFilter
            fields={filterFields}
            onFilterChange={setFilterDomain}
            savedFilters={[]}
          />
        </div>

        {selectedIds.length > 0 && (
          <BulkActions
            selectedIds={selectedIds}
            totalCount={filteredCampaigns.length}
            onSelectionChange={setSelectedIds}
            actions={createCommonBulkActions(handleDelete, handleBulkAssign, handleBulkUpdate)}
          />
        )}

        <div className="campaigns-grid">
          {filteredCampaigns.map((campaign) => {
            const roi = calculateROI(campaign);
            return (
              <div
                key={campaign.id}
                className="campaign-card"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div className="campaign-header">
                  <div className="campaign-type">
                    {getTypeIcon(campaign.campaign_type)}
                    <span>{getTypeLabel(campaign.campaign_type)}</span>
                  </div>
                  <span
                    className="campaign-state"
                    style={{
                      backgroundColor: `${getStateColor(campaign.state)}20`,
                      color: getStateColor(campaign.state),
                    }}
                  >
                    {getStateLabel(campaign.state)}
                  </span>
                </div>

                <h3 className="campaign-name">{campaign.name}</h3>

                <div className="campaign-metrics">
                  {campaign.budget && (
                    <div className="metric">
                      <span className="metric-label">Budget</span>
                      <span className="metric-value">₹{campaign.budget.toLocaleString()}</span>
                    </div>
                  )}
                  {campaign.revenue && (
                    <div className="metric">
                      <span className="metric-label">Revenue</span>
                      <span className="metric-value revenue">
                        ₹{campaign.revenue.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {campaign.total_cost && (
                    <div className="metric">
                      <span className="metric-label">Cost</span>
                      <span className="metric-value">₹{campaign.total_cost.toLocaleString()}</span>
                    </div>
                  )}
                  {roi !== 0 && (
                    <div className="metric">
                      <span className="metric-label">ROI</span>
                      <span className={`metric-value ${roi > 0 ? 'positive' : 'negative'}`}>
                        {roi > 0 ? '+' : ''}
                        {roi.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="campaign-stats">
                  {campaign.leads_count !== undefined && (
                    <div className="stat">
                      <Users size={16} />
                      <span>{campaign.leads_count} leads</span>
                    </div>
                  )}
                  {campaign.clicks !== undefined && (
                    <div className="stat">
                      <TrendingUp size={16} />
                      <span>{campaign.clicks} clicks</span>
                    </div>
                  )}
                  {campaign.start_date && (
                    <div className="stat">
                      <Calendar size={16} />
                      <span>
                        {new Date(campaign.start_date).toLocaleDateString()}
                        {campaign.end_date &&
                          ` - ${new Date(campaign.end_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedCampaign && (
          <div className="campaign-detail-modal" onClick={() => {
            setSelectedCampaign(null);
            setViewMode('list');
          }}>
            <div className="campaign-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="campaign-detail-header">
                <h2>{selectedCampaign.name}</h2>
                <div className="detail-view-tabs">
                  <button
                    className={viewMode === 'list' ? 'active' : ''}
                    onClick={() => setViewMode('list')}
                  >
                    Details
                  </button>
                  <button
                    className={viewMode === 'analytics' ? 'active' : ''}
                    onClick={() => setViewMode('analytics')}
                  >
                    Analytics
                  </button>
                  <button
                    className={viewMode === 'financials' ? 'active' : ''}
                    onClick={() => setViewMode('financials')}
                  >
                    Financials
                  </button>
                </div>
                <button onClick={() => {
                  setSelectedCampaign(null);
                  setViewMode('list');
                }}>×</button>
              </div>
              <div className="campaign-detail-body">
                {viewMode === 'analytics' ? (
                  <CampaignAnalytics campaignId={selectedCampaign.id} campaignName={selectedCampaign.name} />
                ) : viewMode === 'financials' ? (
                  <CampaignFinancials
                    campaignId={selectedCampaign.id}
                    campaignBudget={selectedCampaign.budget || 0}
                    campaignBudgetLimit={0}
                  />
                ) : (
                  <>
                <div className="detail-section">
                  <h3>Campaign Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Type:</strong>
                      <span>
                        {getTypeIcon(selectedCampaign.campaign_type)}
                        {getTypeLabel(selectedCampaign.campaign_type)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <strong>State:</strong>
                      <span
                        className="state-badge"
                        style={{
                          backgroundColor: `${getStateColor(selectedCampaign.state)}20`,
                          color: getStateColor(selectedCampaign.state),
                        }}
                      >
                        {getStateLabel(selectedCampaign.state)}
                      </span>
                    </div>
                    {selectedCampaign.start_date && (
                      <div className="detail-item">
                        <strong>Start Date:</strong>
                        <span>{new Date(selectedCampaign.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedCampaign.end_date && (
                      <div className="detail-item">
                        <strong>End Date:</strong>
                        <span>{new Date(selectedCampaign.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Performance Metrics</h3>
                  <div className="metrics-grid">
                    {selectedCampaign.budget && (
                      <div className="metric-card">
                        <span className="metric-label">Budget</span>
                        <span className="metric-value-large">
                          ₹{selectedCampaign.budget.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedCampaign.revenue && (
                      <div className="metric-card">
                        <span className="metric-label">Revenue</span>
                        <span className="metric-value-large revenue">
                          ₹{selectedCampaign.revenue.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedCampaign.total_cost && (
                      <div className="metric-card">
                        <span className="metric-label">Total Cost</span>
                        <span className="metric-value-large">
                          ₹{selectedCampaign.total_cost.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedCampaign.total_cost && selectedCampaign.revenue && (
                      <div className="metric-card">
                        <span className="metric-label">ROI</span>
                        <span
                          className={`metric-value-large ${
                            calculateROI(selectedCampaign) > 0 ? 'positive' : 'negative'
                          }`}
                        >
                          {calculateROI(selectedCampaign) > 0 ? '+' : ''}
                          {calculateROI(selectedCampaign).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {selectedCampaign.leads_count !== undefined && (
                      <div className="metric-card">
                        <span className="metric-label">Leads Generated</span>
                        <span className="metric-value-large">{selectedCampaign.leads_count}</span>
                      </div>
                    )}
                    {selectedCampaign.clicks !== undefined && (
                      <div className="metric-card">
                        <span className="metric-label">Clicks</span>
                        <span className="metric-value-large">{selectedCampaign.clicks}</span>
                      </div>
                    )}
                    {selectedCampaign.impressions !== undefined && (
                      <div className="metric-card">
                        <span className="metric-label">Impressions</span>
                        <span className="metric-value-large">
                          {selectedCampaign.impressions.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
                )}
              </div>
            </div>
          </div>
        )}

        {showCampaignForm && (
          <CampaignForm
            campaignId={editingCampaignId}
            onClose={() => {
              setShowCampaignForm(false);
              setEditingCampaignId(undefined);
            }}
            onSuccess={() => {
              loadData();
              setShowCampaignForm(false);
              setEditingCampaignId(undefined);
            }}
          />
        )}
      </div>
    </div>
  );
};

