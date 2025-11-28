import React, { useState } from 'react';
import { X, Save, Trash2, ArrowRight, Clock, CheckCircle, Mail, User, Bell } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import './WorkflowBuilder.css';

interface WorkflowBuilderProps {
  campaignId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface WorkflowStep {
  id: string;
  type: 'wait' | 'condition' | 'send' | 'update' | 'notify' | 'assign';
  config: Record<string, any>;
}

interface Workflow {
  id?: number;
  name: string;
  trigger_type: string;
  trigger_conditions: Record<string, any>;
  steps: WorkflowStep[];
  is_active: boolean;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  campaignId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Workflow>({
    name: '',
    trigger_type: 'form_submission',
    trigger_conditions: {},
    steps: [],
    is_active: true,
  });

  const stepTypes = [
    { id: 'wait', label: 'Wait', icon: Clock, description: 'Wait for specified time' },
    { id: 'condition', label: 'Condition', icon: CheckCircle, description: 'Check condition' },
    { id: 'send', label: 'Send Email', icon: Mail, description: 'Send email to contact' },
    { id: 'update', label: 'Update Field', icon: User, description: 'Update contact field' },
    { id: 'notify', label: 'Notify', icon: Bell, description: 'Send notification' },
    { id: 'assign', label: 'Assign', icon: User, description: 'Assign to user/team' },
  ];

  const addStep = (type: WorkflowStep['type']) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      type,
      config: getDefaultConfig(type),
    };
    setWorkflow({
      ...workflow,
      steps: [...workflow.steps, newStep],
    });
  };

  const getDefaultConfig = (type: WorkflowStep['type']): Record<string, any> => {
    switch (type) {
      case 'wait':
        return { duration: 1, unit: 'days' };
      case 'condition':
        return { field: '', operator: 'equals', value: '' };
      case 'send':
        return { template_id: null, subject: '', body: '' };
      case 'update':
        return { field: '', value: '' };
      case 'notify':
        return { user_id: null, message: '' };
      case 'assign':
        return { user_id: null, team_id: null };
      default:
        return {};
    }
  };

  const removeStep = (stepId: string) => {
    setWorkflow({
      ...workflow,
      steps: workflow.steps.filter((s) => s.id !== stepId),
    });
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setWorkflow({
      ...workflow,
      steps: workflow.steps.map((s) =>
        s.id === stepId ? { ...s, ...updates } : s
      ),
    });
  };

  const handleSubmit = async () => {
    if (!workflow.name.trim()) {
      setError('Workflow name is required');
      return;
    }

    if (workflow.steps.length === 0) {
      setError('Add at least one step to the workflow');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const workflowData = {
        ...workflow,
        campaign_id: campaignId,
      };

      if (workflow.id) {
        await apiService.update('/marketing/workflows', workflow.id, workflowData);
      } else {
        await apiService.create('/marketing/workflows', workflowData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workflow-builder-overlay" onClick={onClose}>
      <div className="workflow-builder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="workflow-header">
          <h2>Marketing Automation Workflow</h2>
          <button className="form-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="workflow-content">
          {error && <div className="form-error">{error}</div>}

          <div className="workflow-settings">
            <div className="form-field">
              <label>Workflow Name *</label>
              <input
                type="text"
                value={workflow.name}
                onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
                placeholder="e.g., Lead Nurturing Sequence"
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Trigger Type</label>
                <select
                  value={workflow.trigger_type}
                  onChange={(e) => setWorkflow({ ...workflow, trigger_type: e.target.value })}
                >
                  <option value="form_submission">Form Submission</option>
                  <option value="email_open">Email Open</option>
                  <option value="email_click">Email Click</option>
                  <option value="lead_score_change">Lead Score Change</option>
                  <option value="cart_abandonment">Cart Abandonment</option>
                  <option value="page_visit">Page Visit</option>
                </select>
              </div>

              <div className="form-field">
                <label>Status</label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={workflow.is_active}
                    onChange={(e) => setWorkflow({ ...workflow, is_active: e.target.checked })}
                  />
                  <span>{workflow.is_active ? 'Active' : 'Inactive'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="workflow-steps-section">
            <div className="section-header">
              <h3>Workflow Steps</h3>
              <div className="step-type-buttons">
                {stepTypes.map((stepType) => {
                  const Icon = stepType.icon;
                  return (
                    <button
                      key={stepType.id}
                      className="step-type-btn"
                      onClick={() => addStep(stepType.id as WorkflowStep['type'])}
                      title={stepType.description}
                    >
                      <Icon size={18} />
                      <span>{stepType.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="workflow-steps">
              {workflow.steps.length === 0 ? (
                <div className="empty-steps">
                  <p>No steps added yet. Click the buttons above to add workflow steps.</p>
                </div>
              ) : (
                workflow.steps.map((step, index) => {
                  const stepType = stepTypes.find((st) => st.id === step.type);
                  const Icon = stepType?.icon || ArrowRight;

                  return (
                    <div key={step.id} className="workflow-step">
                      <div className="step-header">
                        <div className="step-number">{index + 1}</div>
                        <Icon size={20} />
                        <span className="step-type-label">{stepType?.label}</span>
                        <button
                          className="remove-step-btn"
                          onClick={() => removeStep(step.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="step-config">
                        {step.type === 'wait' && (
                          <div className="config-row">
                            <input
                              type="number"
                              value={step.config.duration || ''}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  config: { ...step.config, duration: parseInt(e.target.value) || 0 },
                                })
                              }
                              placeholder="Duration"
                              min="1"
                            />
                            <select
                              value={step.config.unit || 'days'}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  config: { ...step.config, unit: e.target.value },
                                })
                              }
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                            </select>
                          </div>
                        )}

                        {step.type === 'send' && (
                          <div className="config-fields">
                            <input
                              type="text"
                              value={step.config.subject || ''}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  config: { ...step.config, subject: e.target.value },
                                })
                              }
                              placeholder="Email subject"
                            />
                            <textarea
                              value={step.config.body || ''}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  config: { ...step.config, body: e.target.value },
                                })
                              }
                              placeholder="Email body"
                              rows={3}
                            />
                          </div>
                        )}

                        {step.type === 'condition' && (
                          <div className="config-row">
                            <input
                              type="text"
                              value={step.config.field || ''}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  config: { ...step.config, field: e.target.value },
                                })
                              }
                              placeholder="Field name"
                            />
                            <select
                              value={step.config.operator || 'equals'}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  config: { ...step.config, operator: e.target.value },
                                })
                              }
                            >
                              <option value="equals">Equals</option>
                              <option value="not_equals">Not Equals</option>
                              <option value="contains">Contains</option>
                              <option value="greater_than">Greater Than</option>
                              <option value="less_than">Less Than</option>
                            </select>
                            <input
                              type="text"
                              value={step.config.value || ''}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  config: { ...step.config, value: e.target.value },
                                })
                              }
                              placeholder="Value"
                            />
                          </div>
                        )}

                        {['update', 'notify', 'assign'].includes(step.type) && (
                          <div className="config-fields">
                            <input
                              type="text"
                              value={step.config.field || step.config.message || step.config.user_id || ''}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  config: { ...step.config, [step.type === 'update' ? 'field' : step.type === 'notify' ? 'message' : 'user_id']: e.target.value },
                                })
                              }
                              placeholder={
                                step.type === 'update'
                                  ? 'Field name'
                                  : step.type === 'notify'
                                  ? 'Notification message'
                                  : 'User ID'
                              }
                            />
                          </div>
                        )}
                      </div>

                      {index < workflow.steps.length - 1 && (
                        <div className="step-connector">
                          <ArrowRight size={20} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="workflow-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <Button icon={<Save size={18} />} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;

