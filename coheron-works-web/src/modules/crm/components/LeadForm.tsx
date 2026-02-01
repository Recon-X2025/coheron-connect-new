import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { leadService, partnerService } from '../../../services/odooService';
import { showToast } from '../../../components/Toast';
import type { Lead, Partner } from '../../../types/odoo';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import './LeadForm.css';

interface LeadFormProps {
  lead?: Lead;
  onClose: () => void;
  onSave: () => void;
}

export const LeadForm = ({ lead, onClose, onSave }: LeadFormProps) => {
  useModalDismiss(true, onClose);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    partner_id: 0,
    expected_revenue: 0,
    probability: 0,
    stage: 'new' as Lead['stage'],
    priority: 'medium' as Lead['priority'],
    type: 'lead' as 'lead' | 'opportunity',
  });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPartners();
    if (lead) {
      setFormData({
        name: lead.name || '',
        email: (lead as any).email || '',
        phone: lead.phone || '',
        partner_id: lead.partner_id || 0,
        expected_revenue: lead.expected_revenue || 0,
        probability: lead.probability || 0,
        stage: lead.stage || 'new',
        priority: lead.priority || 'medium',
        type: (lead as any).type || 'lead',
      });
    }
  }, [lead]);

  const loadPartners = async () => {
    try {
      const data = await partnerService.getAll();
      setPartners(data);
    } catch (error) {
      console.error('Failed to load partners:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Please enter a lead name', 'error');
      return;
    }

    setLoading(true);
    try {
      if (lead) {
        await leadService.update(lead.id, formData);
        showToast('Lead updated successfully', 'success');
      } else {
        await leadService.create(formData);
        showToast('Lead created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save lead:', error);
      showToast(error?.message || 'Failed to save lead. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content lead-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{lead ? 'Edit Lead' : 'New Lead'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Lead Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter lead name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91-12345-67890"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="partner_id">Contact/Company</label>
            <select
              id="partner_id"
              name="partner_id"
              value={formData.partner_id}
              onChange={(e) => setFormData({ ...formData, partner_id: parseInt(e.target.value) || 0 })}
            >
              <option value={0}>Select Contact/Company</option>
              {partners.map((partner, idx) => (
                <option key={partner.id || (partner as any)._id || idx} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expected_revenue">Expected Revenue</label>
              <input
                type="number"
                id="expected_revenue"
                name="expected_revenue"
                step="0.01"
                min="0"
                value={formData.expected_revenue}
                onChange={(e) => setFormData({ ...formData, expected_revenue: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="probability">Probability (%)</label>
              <input
                type="number"
                id="probability"
                name="probability"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stage">Stage</label>
              <select
                id="stage"
                name="stage"
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as Lead['stage'] })}
              >
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="proposition">Proposition</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Lead['priority'] })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'lead' | 'opportunity' })}
            >
              <option value="lead">Lead</option>
              <option value="opportunity">Opportunity</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : lead ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

