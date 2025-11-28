import React, { useState } from 'react';
import { X, Save, User, Mail, Phone, Building, FileText, Link as LinkIcon } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import './LeadCaptureForm.css';

interface LeadCaptureFormProps {
  campaignId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
  campaignId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your name' },
    { id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'your@email.com' },
    { id: 'phone', label: 'Phone', type: 'phone', required: false, placeholder: '+91-12345-67890' },
    { id: 'company', label: 'Company', type: 'text', required: false, placeholder: 'Company name' },
  ]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formTitle, setFormTitle] = useState('Contact Us');
  const [formDescription, setFormDescription] = useState('Get in touch with us');

  const handleSubmit = async () => {
    const requiredFields = formFields.filter((f) => f.required);
    const missingFields = requiredFields.filter((f) => !formData[f.id]?.trim());

    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.map((f) => f.label).join(', ')}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create lead
      const leadData = {
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        company: formData.company || '',
        campaign_id: campaignId,
        source: 'web_form',
        type: 'lead',
      };

      await apiService.post('/leads', leadData);

      // Trigger lead scoring if enabled
      if (campaignId) {
        await apiService.post(`/campaigns/${campaignId}/leads/score`, { lead_id: leadData }).catch(() => {});
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.userMessage || 
                          err.response?.data?.error || 
                          err.response?.data?.message ||
                          err.message || 
                          'Failed to submit form. Please try again.';
      setError(errorMessage);
      console.error('Error submitting form:', err);
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
    };
    setFormFields([...formFields, newField]);
  };

  const removeField = (fieldId: string) => {
    setFormFields(formFields.filter((f) => f.id !== fieldId));
    const newData = { ...formData };
    delete newData[fieldId];
    setFormData(newData);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields(
      formFields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  return (
    <div className="lead-capture-form-overlay" onClick={onClose}>
      <div className="lead-capture-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-builder-header">
          <h2>Lead Capture Form Builder</h2>
          <button className="form-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="form-builder-content">
          {error && <div className="form-error">{error}</div>}

          <div className="form-settings">
            <div className="form-field">
              <label>Form Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Contact Us"
              />
            </div>
            <div className="form-field">
              <label>Form Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Get in touch with us"
                rows={2}
              />
            </div>
          </div>

          <div className="form-fields-section">
            <div className="section-header">
              <h3>Form Fields</h3>
              <Button size="sm" onClick={addField}>Add Field</Button>
            </div>

            <div className="form-fields-list">
              {formFields.map((field) => (
                <div key={field.id} className="form-field-item">
                  <div className="field-controls">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="field-label-input"
                      placeholder="Field label"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                      className="field-type-select"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="select">Dropdown</option>
                      <option value="textarea">Textarea</option>
                    </select>
                    <label className="required-toggle">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      />
                      Required
                    </label>
                    <button
                      className="remove-field-btn"
                      onClick={() => removeField(field.id)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {field.type === 'select' && (
                    <div className="field-options">
                      <label>Options (comma-separated)</label>
                      <input
                        type="text"
                        value={field.options?.join(', ') || ''}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: e.target.value.split(',').map((o) => o.trim()),
                          })
                        }
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-preview">
            <h3>Preview</h3>
            <div className="preview-form">
              <h4>{formTitle}</h4>
              <p>{formDescription}</p>
              {formFields.map((field) => (
                <div key={field.id} className="preview-field">
                  <label>
                    {field.label}
                    {field.required && <span className="required">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select>
                      <option>Select...</option>
                      {field.options?.map((opt, idx) => (
                        <option key={idx}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea placeholder={field.placeholder} rows={3} />
                  ) : (
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="form-builder-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <Button icon={<Save size={18} />} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureForm;

