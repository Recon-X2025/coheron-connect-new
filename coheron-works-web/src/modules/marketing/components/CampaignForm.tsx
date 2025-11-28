import React, { useState, useEffect } from 'react';
import { X, Save, Target, Users, DollarSign, FileText } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import './CampaignForm.css';

export interface CampaignFormData {
  name: string;
  campaign_type: 'email' | 'social' | 'sms' | 'event' | 'referral' | 'ads' | 'other';
  objective: 'leads' | 'awareness' | 'revenue' | 'engagement';
  start_date: string;
  end_date: string;
  budget: number;
  budget_limit: number;
  target_kpis: {
    ctr?: number;
    cpl?: number;
    cpa?: number;
    roi?: number;
  };
  audience_segment_id?: number;
  description?: string;
}

interface CampaignFormProps {
  campaignId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  campaignId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'basics' | 'audience' | 'budget' | 'kpis'>('basics');
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    campaign_type: 'email',
    objective: 'leads',
    start_date: '',
    end_date: '',
    budget: 0,
    budget_limit: 0,
    target_kpis: {},
  });

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<any>(`/campaigns/${campaignId}`);
      const campaign = Array.isArray(response) ? response[0] : response;
      setFormData({
        name: campaign?.name || '',
        campaign_type: campaign?.campaign_type || 'email',
        objective: campaign?.objective || 'leads',
        start_date: campaign?.start_date || '',
        end_date: campaign?.end_date || '',
        budget: campaign?.budget || 0,
        budget_limit: campaign?.budget_limit || 0,
        target_kpis: campaign?.target_kpis || {},
        description: campaign?.description || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      setError('Start and end dates are required');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (campaignId) {
        await apiService.update('/campaigns', campaignId, formData);
      } else {
        await apiService.create('/campaigns', {
          ...formData,
          state: 'draft',
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.userMessage || 
                          err.response?.data?.error || 
                          err.response?.data?.message ||
                          err.message || 
                          'Failed to save campaign. Please try again.';
      setError(errorMessage);
      console.error('Error saving campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'basics', label: 'Basics', icon: FileText },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'budget', label: 'Budget', icon: DollarSign },
    { id: 'kpis', label: 'KPIs', icon: Target },
  ];

  if (loading && campaignId) {
    return (
      <div className="campaign-form-overlay">
        <div className="campaign-form-modal">
          <LoadingSpinner size="medium" message="Loading campaign..." />
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-form-overlay" onClick={onClose}>
      <div className="campaign-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="campaign-form-header">
          <h2>{campaignId ? 'Edit Campaign' : 'Create New Campaign'}</h2>
          <button className="form-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="campaign-form-steps">
          {steps.map((stepItem) => {
            const Icon = stepItem.icon;
            const stepIndex = steps.findIndex((s) => s.id === step);
            const currentIndex = steps.findIndex((s) => s.id === stepItem.id);
            return (
              <button
                key={stepItem.id}
                className={`form-step ${step === stepItem.id ? 'active' : ''} ${
                  currentIndex < stepIndex ? 'completed' : ''
                }`}
                onClick={() => setStep(stepItem.id as any)}
              >
                <Icon size={18} />
                <span>{stepItem.label}</span>
              </button>
            );
          })}
        </div>

        <div className="campaign-form-content">
          {error && <div className="form-error">{error}</div>}

          {step === 'basics' && (
            <div className="form-step-content">
              <div className="form-field">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Q4 Product Launch"
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Campaign Type *</label>
                  <select
                    value={formData.campaign_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        campaign_type: e.target.value as CampaignFormData['campaign_type'],
                      })
                    }
                  >
                    <option value="email">Email</option>
                    <option value="social">Social Media</option>
                    <option value="sms">SMS / WhatsApp</option>
                    <option value="event">Event</option>
                    <option value="referral">Referral</option>
                    <option value="ads">Digital Ads</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Objective *</label>
                  <select
                    value={formData.objective}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        objective: e.target.value as CampaignFormData['objective'],
                      })
                    }
                  >
                    <option value="leads">Generate Leads</option>
                    <option value="awareness">Brand Awareness</option>
                    <option value="revenue">Drive Revenue</option>
                    <option value="engagement">Increase Engagement</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Campaign description and goals..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {step === 'audience' && (
            <div className="form-step-content">
              <div className="form-field">
                <label>Audience Segment</label>
                <select
                  value={formData.audience_segment_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      audience_segment_id: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">Select segment...</option>
                  <option value="1">All Customers</option>
                  <option value="2">High-Value Customers (LTV &gt; ₹1L)</option>
                  <option value="3">New Leads (Last 30 days)</option>
                  <option value="4">Inactive Customers (No purchase in 90 days)</option>
                  <option value="5">Product Interest Segment</option>
                </select>
                <p className="field-hint">
                  Segments can be based on demographics, behavior, CRM lifecycle stage, or custom attributes
                </p>
              </div>

              <div className="info-box">
                <h4>Audience Segmentation Options</h4>
                <ul>
                  <li>Demographics (Age, Location, Industry)</li>
                  <li>Product Usage & Behavior</li>
                  <li>CRM Lifecycle Stage</li>
                  <li>Customer Value Tier (LTV, RFM)</li>
                  <li>Custom Attributes</li>
                </ul>
                <p className="note">Dynamic lists auto-update based on criteria. Static lists remain fixed.</p>
              </div>
            </div>
          )}

          {step === 'budget' && (
            <div className="form-step-content">
              <div className="form-row">
                <div className="form-field">
                  <label>Budget *</label>
                  <input
                    type="number"
                    value={formData.budget || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-field">
                  <label>Budget Limit (Alert Threshold)</label>
                  <input
                    type="number"
                    value={formData.budget_limit || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, budget_limit: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <p className="field-hint">Get notified when spending approaches this limit</p>
                </div>
              </div>

              <div className="info-box">
                <h4>Budget Tracking</h4>
                <p>
                  Budget will be tracked against actual spend from invoices, vendor costs, and agency payouts
                  integrated with the Finance module.
                </p>
              </div>
            </div>
          )}

          {step === 'kpis' && (
            <div className="form-step-content">
              <div className="form-row">
                <div className="form-field">
                  <label>Target CTR (%)</label>
                  <input
                    type="number"
                    value={formData.target_kpis.ctr || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_kpis: {
                          ...formData.target_kpis,
                          ctr: parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="e.g., 2.5"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div className="form-field">
                  <label>Target CPL (Cost per Lead)</label>
                  <input
                    type="number"
                    value={formData.target_kpis.cpl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_kpis: {
                          ...formData.target_kpis,
                          cpl: parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="e.g., 500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Target CPA (Cost per Acquisition)</label>
                  <input
                    type="number"
                    value={formData.target_kpis.cpa || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_kpis: {
                          ...formData.target_kpis,
                          cpa: parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="e.g., 2000"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-field">
                  <label>Target ROI (%)</label>
                  <input
                    type="number"
                    value={formData.target_kpis.roi || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_kpis: {
                          ...formData.target_kpis,
                          roi: parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="e.g., 150"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="info-box">
                <h4>KPI Tracking</h4>
                <p>
                  These KPIs will be tracked in real-time and compared against actual performance in the
                  analytics dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="campaign-form-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <div className="form-actions">
            {step !== 'basics' && (
              <button
                className="btn-secondary"
                onClick={() => {
                  const stepIndex = steps.findIndex((s) => s.id === step);
                  if (stepIndex > 0) {
                    setStep(steps[stepIndex - 1].id as any);
                  }
                }}
                disabled={loading}
              >
                Previous
              </button>
            )}
            {step !== 'kpis' ? (
              <button
                className="btn-primary"
                onClick={() => {
                  const stepIndex = steps.findIndex((s) => s.id === step);
                  if (stepIndex < steps.length - 1) {
                    setStep(steps[stepIndex + 1].id as any);
                  }
                }}
                disabled={loading}
              >
                Next
              </button>
            ) : (
              <Button icon={<Save size={18} />} onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : campaignId ? 'Update Campaign' : 'Create Campaign'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignForm;

