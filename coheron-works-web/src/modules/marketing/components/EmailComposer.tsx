import React, { useState } from 'react';
import { X, Send, Mail, Users, FileText } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import './EmailComposer.css';

interface EmailComposerProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: number;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body_html: string;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  onClose,
  onSuccess,
  campaignId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'compose' | 'recipients' | 'preview'>('compose');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    body_html: '',
    recipient_ids: [] as number[],
    email_from: '',
    reply_to: '',
  });

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templateData = await apiService.get<EmailTemplate[]>('/email/templates');
      setTemplates(templateData);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: number) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormData({
        ...formData,
        subject: template.subject,
        body_html: template.body_html,
      });
    }
  };

  const handleSend = async () => {
    if (!formData.subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    if (!formData.body_html.trim()) {
      setError('Please enter email content');
      return;
    }

    if (formData.recipient_ids.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create mass mailing record
      await apiService.create('/email/mailings', {
        name: formData.subject,
        subject: formData.subject,
        body_html: formData.body_html,
        mailing_model_id: 1,
        contact_list_ids: formData.recipient_ids,
        campaign_id: campaignId,
        email_from: formData.email_from,
        reply_to: formData.reply_to,
        state: 'draft',
      } as any);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
      console.error('Email sending error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-composer-overlay" onClick={onClose}>
      <div className="email-composer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="composer-header">
          <div className="composer-title">
            <Mail size={24} />
            <h2>Compose Email</h2>
          </div>
          <button className="composer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="composer-steps">
          <button
            className={`step ${step === 'compose' ? 'active' : ''}`}
            onClick={() => setStep('compose')}
          >
            <FileText size={18} />
            Compose
          </button>
          <button
            className={`step ${step === 'recipients' ? 'active' : ''}`}
            onClick={() => setStep('recipients')}
          >
            <Users size={18} />
            Recipients
          </button>
          <button
            className={`step ${step === 'preview' ? 'active' : ''}`}
            onClick={() => setStep('preview')}
          >
            <Send size={18} />
            Preview
          </button>
        </div>

        <div className="composer-content">
          {error && (
            <div className="composer-error">
              {error}
            </div>
          )}

          {step === 'compose' && (
            <div className="compose-step">
              <div className="form-field">
                <label>Email Template (Optional)</label>
                <select
                  value={selectedTemplate || ''}
                  onChange={(e) =>
                    handleTemplateSelect(parseInt(e.target.value))
                  }
                >
                  <option value="">Select a template...</option>
                  {templates.map((template, idx) => (
                    <option key={template.id || (template as any)._id || idx} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>

              <div className="form-field">
                <label>Email Content *</label>
                <textarea
                  value={formData.body_html}
                  onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                  placeholder="Enter your email content here..."
                  rows={12}
                  className="email-body-editor"
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>From Email</label>
                  <input
                    type="email"
                    value={formData.email_from}
                    onChange={(e) => setFormData({ ...formData, email_from: e.target.value })}
                    placeholder="sender@example.com"
                  />
                </div>

                <div className="form-field">
                  <label>Reply To</label>
                  <input
                    type="email"
                    value={formData.reply_to}
                    onChange={(e) => setFormData({ ...formData, reply_to: e.target.value })}
                    placeholder="reply@example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'recipients' && (
            <div className="recipients-step">
              <p>Recipient selection will be implemented with partner selection component.</p>
              <p className="note">For now, this is a placeholder. In production, this would allow selecting partners, leads, or custom lists.</p>
            </div>
          )}

          {step === 'preview' && (
            <div className="preview-step">
              <div className="email-preview">
                <div className="preview-header">
                  <strong>Subject:</strong> {formData.subject || '(No subject)'}
                </div>
                <div className="preview-body" dangerouslySetInnerHTML={{ __html: formData.body_html || '<p>No content</p>' }} />
              </div>
            </div>
          )}
        </div>

        <div className="composer-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <div className="composer-actions">
            {step !== 'compose' && (
              <button
                className="btn-secondary"
                onClick={() => {
                  const steps: ('compose' | 'recipients' | 'preview')[] = ['compose', 'recipients', 'preview'];
                  const currentIndex = steps.indexOf(step);
                  if (currentIndex > 0) {
                    setStep(steps[currentIndex - 1]);
                  }
                }}
                disabled={loading}
              >
                Previous
              </button>
            )}
            {step !== 'preview' ? (
              <button
                className="btn-primary"
                onClick={() => {
                  const steps: ('compose' | 'recipients' | 'preview')[] = ['compose', 'recipients', 'preview'];
                  const currentIndex = steps.indexOf(step);
                  if (currentIndex < steps.length - 1) {
                    setStep(steps[currentIndex + 1]);
                  }
                }}
                disabled={loading}
              >
                Next
              </button>
            ) : (
              <button className="btn-primary" onClick={handleSend} disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="small" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Email
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;

