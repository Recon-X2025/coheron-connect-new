import { Workflow } from '../models/Workflow.js';
import { WorkflowRun } from '../models/WorkflowRun.js';
import mongoose from 'mongoose';
import logger from '../shared/utils/logger.js';
import { executeUpdateField } from './workflowActions/updateFieldAction.js';
import { executeSendEmail } from './workflowActions/sendEmailAction.js';
import { executeSendNotification } from './workflowActions/sendNotificationAction.js';
import { executeAssign } from './workflowActions/assignAction.js';
import { executeCreateTask } from './workflowActions/createTaskAction.js';
import { executeWebhook } from './workflowActions/webhookAction.js';

export function evaluateConditions(conditions: any[], entity: any): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    const fieldValue = entity[condition.field];
    switch (condition.operator) {
      case 'equals': return fieldValue == condition.value;
      case 'not_equals': return fieldValue != condition.value;
      case 'contains': return String(fieldValue || '').includes(String(condition.value));
      case 'greater_than': return Number(fieldValue) > Number(condition.value);
      case 'less_than': return Number(fieldValue) < Number(condition.value);
      case 'is_empty': return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'is_not_empty': return !!fieldValue && fieldValue !== '' && !(Array.isArray(fieldValue) && fieldValue.length === 0);
      default: return true;
    }
  });
}

const actionExecutors: Record<string, (config: any, context: any) => Promise<any>> = {
  update_field: executeUpdateField,
  send_email: executeSendEmail,
  send_notification: executeSendNotification,
  assign: executeAssign,
  create_task: executeCreateTask,
  webhook: executeWebhook,
};

export async function executeWorkflow(workflowId: string, entityType?: string, entityId?: string) {
  const workflow = await Workflow.findById(workflowId);
  if (!workflow || !workflow.is_active) {
    logger.warn({ workflowId }, 'Workflow not found or inactive');
    return;
  }

  let entity: any = null;
  if (entityType && entityId) {
    try {
      const Model = mongoose.model(entityType);
      entity = await Model.findById(entityId).lean();
    } catch {
      logger.warn({ entityType, entityId }, 'Could not load entity for workflow');
    }
  }

  if (!evaluateConditions(workflow.conditions || [], entity || {})) {
    logger.info({ workflowId }, 'Workflow conditions not met, skipping');
    return;
  }

  const run = await WorkflowRun.create({
    workflow_id: workflowId,
    trigger_record_id: entityId ? new mongoose.Types.ObjectId(entityId) : undefined,
    status: 'running',
    steps: (workflow.actions || []).map((a: any) => ({
      action_id: a._id,
      action_type: a.type,
      status: 'pending',
    })),
    tenant_id: workflow.tenant_id,
  });

  const context = { entityType, entityId, entity, tenantId: workflow.tenant_id?.toString() };
  let allSuccess = true;

  const sortedActions = [...(workflow.actions || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  for (let i = 0; i < sortedActions.length; i++) {
    const action = sortedActions[i] as any;
    const executor = actionExecutors[action.type];

    const stepUpdate: any = { [`steps.${i}.started_at`]: new Date() };

    if (!executor) {
      stepUpdate[`steps.${i}.status`] = 'skipped';
      stepUpdate[`steps.${i}.error`] = `Unknown action type: ${action.type}`;
      await WorkflowRun.findByIdAndUpdate(run._id, { $set: stepUpdate });
      continue;
    }

    try {
      const result = await executor(action.config || {}, context);
      stepUpdate[`steps.${i}.status`] = 'completed';
      stepUpdate[`steps.${i}.completed_at`] = new Date();
      stepUpdate[`steps.${i}.result`] = result;
      await WorkflowRun.findByIdAndUpdate(run._id, { $set: stepUpdate });
    } catch (err: any) {
      allSuccess = false;
      stepUpdate[`steps.${i}.status`] = 'failed';
      stepUpdate[`steps.${i}.completed_at`] = new Date();
      stepUpdate[`steps.${i}.error`] = err.message;
      await WorkflowRun.findByIdAndUpdate(run._id, { $set: stepUpdate });
      logger.error({ err, workflowId, actionType: action.type }, 'Workflow action failed');
    }
  }

  await WorkflowRun.findByIdAndUpdate(run._id, {
    status: allSuccess ? 'completed' : 'failed',
    completed_at: new Date(),
  });

  await Workflow.findByIdAndUpdate(workflowId, {
    $inc: { execution_count: 1 },
    last_executed_at: new Date(),
    last_execution_status: allSuccess ? 'success' : 'failure',
  });

  logger.info({ workflowId, runId: run._id, status: allSuccess ? 'completed' : 'failed' }, 'Workflow execution finished');
}
