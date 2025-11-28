import React, { useState } from 'react';
import { X, CheckCircle, User, Building2, TrendingUp } from 'lucide-react';
import { odooService } from '../../../services/odooService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import type { Lead, Partner } from '../../../types/odoo';
import './LeadConversion.css';

interface LeadConversionProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConversionOptions {
  action: 'create_opportunity' | 'create_partner' | 'create_opportunity_and_partner';
  partnerName?: string;
  opportunityName?: string;
  expectedRevenue?: number;
  probability?: number;
}

export const LeadConversion: React.FC<LeadConversionProps> = ({
  lead,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ConversionOptions>({
    action: 'create_opportunity_and_partner',
    partnerName: lead.name,
    opportunityName: `${lead.name} - Opportunity`,
    expectedRevenue: lead.expected_revenue,
    probability: lead.probability,
  });

  const handleConvert = async () => {
    setLoading(true);
    setError(null);

    try {
      // In Odoo, lead conversion is typically done via a wizard
      // We'll simulate the conversion process
      
      let partnerId = lead.partner_id;
      
      // Create partner if needed
      if (options.action === 'create_partner' || options.action === 'create_opportunity_and_partner') {
        if (!partnerId || options.partnerName !== lead.name) {
          const newPartner = await odooService.create<Partner>('res.partner', {
            name: options.partnerName || lead.name,
            email: lead.email,
            phone: lead.phone,
            type: 'contact',
          });
          partnerId = newPartner;
        }
      }

      // Create opportunity if needed
      if (options.action === 'create_opportunity' || options.action === 'create_opportunity_and_partner') {
        await odooService.create('crm.lead', {
          name: options.opportunityName || `${lead.name} - Opportunity`,
          partner_id: partnerId,
          type: 'opportunity',
          expected_revenue: options.expectedRevenue || lead.expected_revenue,
          probability: options.probability || lead.probability,
          stage: 'qualified',
        });
      }

      // Mark lead as converted (update stage to 'won' or archive)
      await odooService.write('crm.lead', [lead.id], {
        stage: 'won',
        active: false, // Archive the lead
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to convert lead');
      console.error('Lead conversion error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lead-conversion-overlay" onClick={onClose}>
      <div className="lead-conversion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lead-conversion-header">
          <div className="lead-conversion-title">
            <CheckCircle size={24} />
            <h2>Convert Lead</h2>
          </div>
          <button className="lead-conversion-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="lead-conversion-content">
          <div className="lead-info">
            <h3>{lead.name}</h3>
            <p className="lead-details">
              <span>Expected Revenue: ₹{lead.expected_revenue.toLocaleString()}</span>
              <span>Probability: {lead.probability}%</span>
            </p>
          </div>

          {error && (
            <div className="lead-conversion-error">
              {error}
            </div>
          )}

          <div className="conversion-options">
            <h4>Conversion Options</h4>
            
            <div className="option-group">
              <label className="option-radio">
                <input
                  type="radio"
                  name="action"
                  value="create_opportunity_and_partner"
                  checked={options.action === 'create_opportunity_and_partner'}
                  onChange={(e) => setOptions({ ...options, action: e.target.value as any })}
                />
                <div className="option-content">
                  <Building2 size={20} />
                  <div>
                    <strong>Create Opportunity & Partner</strong>
                    <span>Create both a new opportunity and partner record</span>
                  </div>
                </div>
              </label>

              <label className="option-radio">
                <input
                  type="radio"
                  name="action"
                  value="create_opportunity"
                  checked={options.action === 'create_opportunity'}
                  onChange={(e) => setOptions({ ...options, action: e.target.value as any })}
                />
                <div className="option-content">
                  <TrendingUp size={20} />
                  <div>
                    <strong>Create Opportunity Only</strong>
                    <span>Create a new opportunity using existing partner</span>
                  </div>
                </div>
              </label>

              <label className="option-radio">
                <input
                  type="radio"
                  name="action"
                  value="create_partner"
                  checked={options.action === 'create_partner'}
                  onChange={(e) => setOptions({ ...options, action: e.target.value as any })}
                />
                <div className="option-content">
                  <User size={20} />
                  <div>
                    <strong>Create Partner Only</strong>
                    <span>Create a new partner record only</span>
                  </div>
                </div>
              </label>
            </div>

            {(options.action === 'create_partner' || options.action === 'create_opportunity_and_partner') && (
              <div className="form-field">
                <label>Partner Name</label>
                <input
                  type="text"
                  value={options.partnerName || ''}
                  onChange={(e) => setOptions({ ...options, partnerName: e.target.value })}
                  placeholder="Enter partner name"
                />
              </div>
            )}

            {(options.action === 'create_opportunity' || options.action === 'create_opportunity_and_partner') && (
              <>
                <div className="form-field">
                  <label>Opportunity Name</label>
                  <input
                    type="text"
                    value={options.opportunityName || ''}
                    onChange={(e) => setOptions({ ...options, opportunityName: e.target.value })}
                    placeholder="Enter opportunity name"
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Expected Revenue</label>
                    <input
                      type="number"
                      value={options.expectedRevenue || ''}
                      onChange={(e) => setOptions({ ...options, expectedRevenue: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-field">
                    <label>Probability (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={options.probability || ''}
                      onChange={(e) => setOptions({ ...options, probability: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lead-conversion-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleConvert} disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                Converting...
              </>
            ) : (
              'Convert Lead'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadConversion;

