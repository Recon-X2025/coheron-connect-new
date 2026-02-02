import React, { useState } from 'react';
import { CheckCircle, XCircle, Send, FileCheck, Truck } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import './OrderWorkflow.css';

interface OrderWorkflowProps {
  order: any;
  onStateChange: () => void;
}

type OrderState = 'draft' | 'sent' | 'sale' | 'done' | 'cancel';

interface WorkflowStep {
  state: OrderState;
  label: string;
  icon: React.ReactNode;
  action?: string;
  description: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    state: 'draft',
    label: 'Draft',
    icon: <FileCheck size={20} />,
    action: 'Send Quotation',
    description: 'Order is in draft state',
  },
  {
    state: 'sent',
    label: 'Quotation Sent',
    icon: <Send size={20} />,
    action: 'Confirm Order',
    description: 'Quotation has been sent to customer',
  },
  {
    state: 'sale',
    label: 'Sales Order',
    icon: <CheckCircle size={20} />,
    action: 'Lock Order',
    description: 'Order has been confirmed',
  },
  {
    state: 'done',
    label: 'Locked',
    icon: <Truck size={20} />,
    description: 'Order is locked and delivered',
  },
  {
    state: 'cancel',
    label: 'Cancelled',
    icon: <XCircle size={20} />,
    description: 'Order has been cancelled',
  },
];

export const OrderWorkflow: React.FC<OrderWorkflowProps> = ({ order, onStateChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex((step) => step.state === order.state);
  };

  const canTransitionTo = (targetState: OrderState): boolean => {
    const currentState = order.state;
    const transitions: Record<OrderState, OrderState[]> = {
      draft: ['sent', 'cancel'],
      sent: ['sale', 'cancel'],
      sale: ['done', 'cancel'],
      done: [],
      cancel: [],
    };
    const allowedStates = transitions[currentState as OrderState];
    return allowedStates ? allowedStates.includes(targetState) : false;
  };

  const handleStateTransition = async (newState: OrderState) => {
    if (!canTransitionTo(newState)) {
      setError(`Cannot transition from ${order.state} to ${newState}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In Odoo, state transitions are done via specific methods
      let method = '';
      let values: any = {};

      switch (newState) {
        case 'sent':
          method = 'action_quotation_send';
          break;
        case 'sale':
          method = 'action_confirm';
          break;
        case 'done':
          method = 'action_done';
          break;
        case 'cancel':
          method = 'action_cancel';
          values = { state: 'cancel' };
          break;
        default:
          values = { state: newState };
      }

      const orderId = order._id || order.id;
      if (!orderId) {
        setError('Order ID not found');
        return;
      }

      if (method) {
        // Call the workflow method via state update
        await apiService.update('/sale-orders', orderId, { state: newState });
      } else {
        // Direct state update
        await apiService.update('/sale-orders', orderId, values);
      }

      onStateChange();
    } catch (err: any) {
      setError(err.message || 'Failed to update order state');
      console.error('State transition error:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = getCurrentStepIndex();
  const currentStep = workflowSteps[currentStepIndex];

  return (
    <div className="order-workflow">
      <div className="workflow-header">
        <h3>Order Workflow</h3>
        <span className="current-state-badge" data-state={order.state}>
          {currentStep?.label}
        </span>
      </div>

      {error && (
        <div className="workflow-error">
          {error}
        </div>
      )}

      <div className="workflow-steps">
        {workflowSteps.map((step, index) => {
          const isActive = step.state === order.state;
          const isCompleted = index < currentStepIndex;
          const isAccessible = index <= currentStepIndex + 1 || canTransitionTo(step.state);

          return (
            <div
              key={step.state}
              className={`workflow-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${!isAccessible ? 'disabled' : ''}`}
            >
              <div className="step-indicator">
                <div className="step-icon">
                  {isCompleted ? (
                    <CheckCircle size={24} className="completed-icon" />
                  ) : (
                    step.icon
                  )}
                </div>
                {index < workflowSteps.length - 1 && (
                  <div className={`step-connector ${isCompleted ? 'completed' : ''}`} />
                )}
              </div>

              <div className="step-content">
                <div className="step-label">{step.label}</div>
                <div className="step-description">{step.description}</div>

                {isActive && step.action && getNextState(step.state) && canTransitionTo(getNextState(step.state)!) && (
                  <button
                    className="step-action-btn"
                    onClick={() => {
                      const nextState = getNextState(step.state);
                      if (nextState) {
                        handleStateTransition(nextState);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Processing...
                      </>
                    ) : (
                      step.action
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {order.state === 'cancel' && (
        <div className="workflow-note">
          <p>This order has been cancelled and cannot be modified.</p>
        </div>
      )}
    </div>
  );
};

function getNextState(currentState: OrderState): OrderState | null {
  const nextStates: Record<OrderState, OrderState | null> = {
    draft: 'sent',
    sent: 'sale',
    sale: 'done',
    done: null,
    cancel: null,
  };
  return nextStates[currentState] || null;
}

export default OrderWorkflow;

