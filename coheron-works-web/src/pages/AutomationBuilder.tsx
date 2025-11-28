import { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Play,
  Save,
  Trash2,
  Filter,
  ArrowRight,
  Settings,
  Clock,
  Mail,
  User,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supportDeskService, type AutomationRule } from '../services/supportDeskService';
import './AutomationBuilder.css';

export const AutomationBuilder: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Rule builder state
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('ticket_created');
  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => {
    loadRules();
  }, [isActive]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await supportDeskService.getAutomationRules({ is_active: isActive });
      setRules(data);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRuleClick = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description || '');
    setTriggerEvent(rule.trigger_event);
    setConditions(
      typeof rule.trigger_conditions === 'string'
        ? JSON.parse(rule.trigger_conditions)
        : rule.trigger_conditions || []
    );
    setActions(
      typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions || []
    );
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        field: '',
        operator: 'equals',
        value: '',
      },
    ]);
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        type: 'assign_agent',
        value: '',
      },
    ]);
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const saveRule = async () => {
    if (!ruleName || !triggerEvent || conditions.length === 0 || actions.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (selectedRule) {
        await supportDeskService.updateAutomationRule(selectedRule.id, {
          name: ruleName,
          description: ruleDescription,
          trigger_event: triggerEvent,
          trigger_conditions: conditions,
          actions: actions,
        });
      } else {
        await supportDeskService.createAutomationRule({
          name: ruleName,
          description: ruleDescription,
          trigger_event: triggerEvent,
          trigger_conditions: conditions,
          actions: actions,
        });
      }
      loadRules();
      setShowCreateModal(false);
      setSelectedRule(null);
      resetForm();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const resetForm = () => {
    setRuleName('');
    setRuleDescription('');
    setTriggerEvent('ticket_created');
    setConditions([]);
    setActions([]);
  };

  const triggerEvents = [
    { value: 'ticket_created', label: 'Ticket Created', icon: <Plus size={16} /> },
    { value: 'ticket_updated', label: 'Ticket Updated', icon: <Settings size={16} /> },
    { value: 'status_changed', label: 'Status Changed', icon: <ArrowRight size={16} /> },
    { value: 'sla_breach', label: 'SLA Breach', icon: <AlertCircle size={16} /> },
    { value: 'time_based', label: 'Time Based', icon: <Clock size={16} /> },
  ];

  const actionTypes = [
    { value: 'assign_agent', label: 'Assign Agent' },
    { value: 'assign_team', label: 'Assign Team' },
    { value: 'set_priority', label: 'Set Priority' },
    { value: 'set_status', label: 'Set Status' },
    { value: 'add_tag', label: 'Add Tag' },
    { value: 'send_email', label: 'Send Email' },
    { value: 'create_ticket', label: 'Create Ticket' },
  ];

  return (
    <div className="automation-builder">
      <div className="automation-header">
        <div>
          <h1>Automation Rules</h1>
          <p className="automation-subtitle">Create and manage workflow automation rules</p>
        </div>
        <div className="automation-actions">
          <div className="filter-toggle">
            <button
              className={isActive ? 'active' : ''}
              onClick={() => setIsActive(true)}
            >
              Active
            </button>
            <button
              className={!isActive ? 'active' : ''}
              onClick={() => setIsActive(false)}
            >
              All
            </button>
          </div>
          <Button icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
            New Rule
          </Button>
        </div>
      </div>

      <div className="automation-layout">
        {/* Rules List */}
        <div className="automation-sidebar">
          <div className="rules-list">
            {loading ? (
              <LoadingSpinner size="small" message="Loading rules..." />
            ) : rules.length === 0 ? (
              <div className="empty-state">
                <Zap size={32} />
                <p>No automation rules found</p>
              </div>
            ) : (
              rules.map((rule) => (
                <Card
                  key={rule.id}
                  className={`rule-item ${selectedRule?.id === rule.id ? 'active' : ''}`}
                  hover
                  onClick={() => handleRuleClick(rule)}
                >
                  <div className="rule-item-header">
                    <Zap size={18} className="rule-icon" />
                    <h4>{rule.name}</h4>
                    <span className={`rule-status ${rule.is_active ? 'active' : 'inactive'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="rule-description">{rule.description.substring(0, 80)}...</p>
                  )}
                  <div className="rule-meta">
                    <span className="rule-trigger">Triggers: {rule.trigger_event.replace('_', ' ')}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Rule Builder */}
        <div className="automation-main">
          {selectedRule || showCreateModal ? (
            <div className="rule-builder">
              <div className="rule-builder-header">
                <h2>{selectedRule ? 'Edit Rule' : 'Create New Rule'}</h2>
                <div className="builder-actions">
                  <Button variant="outline" size="sm" icon={<Play size={16} />}>
                    Test
                  </Button>
                  <Button size="sm" icon={<Save size={16} />} onClick={saveRule}>
                    Save
                  </Button>
                </div>
              </div>

              <div className="builder-form">
                <div className="form-group">
                  <label>Rule Name *</label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., Auto-assign high priority tickets"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    placeholder="Describe what this rule does..."
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Trigger Event *</label>
                  <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)}>
                    {triggerEvents.map((event) => (
                      <option key={event.value} value={event.value}>
                        {event.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="conditions-section">
                  <div className="section-header">
                    <h3>Conditions (IF)</h3>
                    <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={addCondition}>
                      Add Condition
                    </Button>
                  </div>
                  {conditions.length === 0 ? (
                    <div className="empty-section">
                      <p>No conditions. Add at least one condition.</p>
                    </div>
                  ) : (
                    <div className="conditions-list">
                      {conditions.map((condition, index) => (
                        <div key={index} className="condition-item">
                          <select
                            value={condition.field}
                            onChange={(e) => updateCondition(index, 'field', e.target.value)}
                          >
                            <option value="">Select field</option>
                            <option value="status">Status</option>
                            <option value="priority">Priority</option>
                            <option value="category">Category</option>
                            <option value="channel">Channel</option>
                            <option value="partner_id">Customer</option>
                          </select>
                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                          >
                            <option value="equals">Equals</option>
                            <option value="not_equals">Not Equals</option>
                            <option value="contains">Contains</option>
                            <option value="greater_than">Greater Than</option>
                            <option value="less_than">Less Than</option>
                          </select>
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => updateCondition(index, 'value', e.target.value)}
                            placeholder="Value"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Trash2 size={14} />}
                            onClick={() => removeCondition(index)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="actions-section">
                  <div className="section-header">
                    <h3>Actions (THEN)</h3>
                    <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={addAction}>
                      Add Action
                    </Button>
                  </div>
                  {actions.length === 0 ? (
                    <div className="empty-section">
                      <p>No actions. Add at least one action.</p>
                    </div>
                  ) : (
                    <div className="actions-list">
                      {actions.map((action, index) => (
                        <div key={index} className="action-item">
                          <select
                            value={action.type}
                            onChange={(e) => updateAction(index, 'type', e.target.value)}
                          >
                            {actionTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={action.value}
                            onChange={(e) => updateAction(index, 'value', e.target.value)}
                            placeholder="Action value"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Trash2 size={14} />}
                            onClick={() => removeAction(index)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-rule-selected">
              <Zap size={64} />
              <h3>Select or create a rule</h3>
              <p>Choose a rule from the list or create a new automation rule</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomationBuilder;

