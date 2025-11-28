import { useState, useEffect } from 'react';
import { Zap, Plus, Play, Pause, Trash2, Edit, Settings, Search } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './AutomationEngine.css';

interface Workflow {
  id: number;
  name: string;
  description?: string;
  trigger_type: 'record_created' | 'record_updated' | 'field_changed' | 'stage_changed' | 'scheduled' | 'webhook';
  trigger_model?: string;
  trigger_conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  state: 'active' | 'inactive' | 'draft';
  execution_count: number;
  last_executed_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

interface WorkflowAction {
  id: number;
  type: 'send_email' | 'create_task' | 'update_field' | 'assign_user' | 'create_record' | 'send_notification' | 'webhook';
  config: Record<string, any>;
  order: number;
}

export const AutomationEngine = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [filters, setFilters] = useState({
    state: '',
    trigger_type: '',
    search: '',
  });

  useEffect(() => {
    loadWorkflows();
  }, [filters]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<Workflow>('/crm/automation/workflows', filters);
      setWorkflows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleState = async (id: number, currentState: string) => {
    try {
      const newState = currentState === 'active' ? 'inactive' : 'active';
      await apiService.getAxiosInstance().patch(`/crm/automation/workflows/${id}`, { state: newState });
      loadWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      showToast('Failed to update workflow', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await apiService.getAxiosInstance().delete(`/crm/automation/workflows/${id}`);
      loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      showToast('Failed to delete workflow', 'error');
    }
  };

  const handleSaveWorkflow = async (workflow: Partial<Workflow>) => {
    try {
      if (workflow.id) {
        await apiService.getAxiosInstance().put(`/crm/automation/workflows/${workflow.id}`, workflow);
      } else {
        await apiService.create<Workflow>('/crm/automation/workflows', workflow);
      }
      loadWorkflows();
      setShowForm(false);
      setSelectedWorkflow(null);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      showToast('Failed to save workflow', 'error');
    }
  };

  const getStateBadge = (state: string) => {
    const badges: Record<string, { label: string; class: string; icon: any }> = {
      active: { label: 'Active', class: 'badge-green', icon: Play },
      inactive: { label: 'Inactive', class: 'badge-gray', icon: Pause },
      draft: { label: 'Draft', class: 'badge-yellow', icon: Settings },
    };
    return badges[state] || { label: state, class: 'badge-gray', icon: Settings };
  };

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      record_created: 'Record Created',
      record_updated: 'Record Updated',
      field_changed: 'Field Changed',
      stage_changed: 'Stage Changed',
      scheduled: 'Scheduled',
      webhook: 'Webhook',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="automation-engine">
      <div className="automation-header">
        <h2>Automation Engine</h2>
        <Button
          size="sm"
          onClick={() => {
            setSelectedWorkflow(null);
            setShowForm(true);
          }}
        >
          <Plus size={16} /> New Workflow
        </Button>
      </div>

      <div className="automation-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search workflows..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select
          value={filters.state}
          onChange={(e) => setFilters({ ...filters, state: e.target.value })}
        >
          <option value="">All States</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={filters.trigger_type}
          onChange={(e) => setFilters({ ...filters, trigger_type: e.target.value })}
        >
          <option value="">All Triggers</option>
          <option value="record_created">Record Created</option>
          <option value="record_updated">Record Updated</option>
          <option value="field_changed">Field Changed</option>
          <option value="stage_changed">Stage Changed</option>
          <option value="scheduled">Scheduled</option>
          <option value="webhook">Webhook</option>
        </select>
      </div>

      <div className="workflows-grid">
        {workflows.length === 0 ? (
          <div className="empty-state">
            <Zap size={64} />
            <p>No workflows configured</p>
            <Button onClick={() => setShowForm(true)}>Create First Workflow</Button>
          </div>
        ) : (
          workflows
            .filter((wf) =>
              filters.search
                ? wf.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                  wf.description?.toLowerCase().includes(filters.search.toLowerCase())
                : true
            )
            .map((workflow) => {
              const badge = getStateBadge(workflow.state);
              const Icon = badge.icon;
              return (
                <div key={workflow.id} className="workflow-card">
                  <div className="workflow-card-header">
                    <div className="workflow-icon">
                      <Zap size={24} />
                    </div>
                    <div className="workflow-info">
                      <h3>{workflow.name}</h3>
                      {workflow.description && (
                        <p className="workflow-description">{workflow.description}</p>
                      )}
                    </div>
                    <span className={`state-badge ${badge.class}`}>
                      <Icon size={14} />
                      {badge.label}
                    </span>
                  </div>

                  <div className="workflow-details">
                    <div className="detail-row">
                      <span className="detail-label">Trigger:</span>
                      <span className="detail-value">{getTriggerLabel(workflow.trigger_type)}</span>
                    </div>
                    {workflow.trigger_model && (
                      <div className="detail-row">
                        <span className="detail-label">Model:</span>
                        <span className="detail-value">{workflow.trigger_model}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Actions:</span>
                      <span className="detail-value">{workflow.actions.length}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Executions:</span>
                      <span className="detail-value">{workflow.execution_count}</span>
                    </div>
                    {workflow.last_executed_at && (
                      <div className="detail-row">
                        <span className="detail-label">Last Executed:</span>
                        <span className="detail-value">
                          {new Date(workflow.last_executed_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="workflow-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleToggleState(workflow.id, workflow.state)}
                    >
                      {workflow.state === 'active' ? (
                        <>
                          <Pause size={16} /> Pause
                        </>
                      ) : (
                        <>
                          <Play size={16} /> Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedWorkflow(workflow);
                        setShowForm(true);
                      }}
                    >
                      <Edit size={16} /> Edit
                    </Button>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => handleDelete(workflow.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {showForm && (
        <WorkflowForm
          workflow={selectedWorkflow || undefined}
          onClose={() => {
            setShowForm(false);
            setSelectedWorkflow(null);
          }}
          onSave={handleSaveWorkflow}
        />
      )}
    </div>
  );
};

// Workflow Form Component
interface WorkflowFormProps {
  workflow?: Workflow;
  onClose: () => void;
  onSave: (workflow: Partial<Workflow>) => void;
}

const WorkflowForm = ({ workflow, onClose, onSave }: WorkflowFormProps) => {
  const [formData, setFormData] = useState({
    name: workflow?.name || '',
    description: workflow?.description || '',
    trigger_type: workflow?.trigger_type || 'record_created',
    trigger_model: workflow?.trigger_model || '',
    state: workflow?.state || 'draft',
  });

  const [actions, setActions] = useState<WorkflowAction[]>(workflow?.actions || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: workflow?.id,
      ...formData,
      actions: actions,
    });
  };

  const handleAddAction = () => {
    setActions([
      ...actions,
      {
        id: Date.now(),
        type: 'send_email',
        config: {},
        order: actions.length + 1,
      },
    ]);
  };

  const handleRemoveAction = (id: number) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const handleActionChange = (id: number, field: string, value: any) => {
    setActions(
      actions.map((action) =>
        action.id === id ? { ...action, [field]: value } : action
      )
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{workflow ? 'Edit Workflow' : 'Create Workflow'}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Workflow Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Trigger Type *</label>
              <select
                value={formData.trigger_type}
                onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as any })}
                required
              >
                <option value="record_created">Record Created</option>
                <option value="record_updated">Record Updated</option>
                <option value="field_changed">Field Changed</option>
                <option value="stage_changed">Stage Changed</option>
                <option value="scheduled">Scheduled</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>
            <div className="form-group">
              <label>Model</label>
              <select
                value={formData.trigger_model}
                onChange={(e) => setFormData({ ...formData, trigger_model: e.target.value })}
              >
                <option value="">All Models</option>
                <option value="crm.lead">Lead</option>
                <option value="crm.opportunity">Opportunity</option>
                <option value="crm.contact">Contact</option>
                <option value="sale.order">Sale Order</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>State</label>
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value as any })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="actions-section">
            <div className="section-header">
              <h4>Actions</h4>
              <Button type="button" size="sm" variant="secondary" onClick={handleAddAction}>
                <Plus size={16} /> Add Action
              </Button>
            </div>
            <div className="actions-list">
              {actions.length === 0 ? (
                <p className="empty-message">No actions configured. Add an action to execute when trigger fires.</p>
              ) : (
                actions.map((action, index) => (
                  <div key={action.id} className="action-item">
                    <div className="action-header">
                      <span className="action-order">{index + 1}</span>
                      <select
                        value={action.type}
                        onChange={(e) => handleActionChange(action.id, 'type', e.target.value)}
                      >
                        <option value="send_email">Send Email</option>
                        <option value="create_task">Create Task</option>
                        <option value="update_field">Update Field</option>
                        <option value="assign_user">Assign User</option>
                        <option value="create_record">Create Record</option>
                        <option value="send_notification">Send Notification</option>
                        <option value="webhook">Webhook</option>
                      </select>
                      <button
                        type="button"
                        className="remove-action-btn"
                        onClick={() => handleRemoveAction(action.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="action-config">
                      <input
                        type="text"
                        placeholder="Action configuration (JSON)"
                        value={JSON.stringify(action.config)}
                        onChange={(e) => {
                          try {
                            const config = JSON.parse(e.target.value);
                            handleActionChange(action.id, 'config', config);
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">{workflow ? 'Update' : 'Create'} Workflow</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

