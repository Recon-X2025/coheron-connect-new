import { Queue } from 'bullmq';
import { redisConnection } from '../../jobs/connection.js';
import { Workflow } from '../../models/Workflow.js';
import logger from '../utils/logger.js';

const workflowQueue = new Queue('workflow', { connection: redisConnection });

export async function triggerWorkflows(
  triggerType: 'on_create' | 'on_update' | 'on_delete',
  entityType: string,
  entityId: string,
  tenantId?: string,
) {
  if (process.env.WORKFLOW_ENABLED === 'false') return;

  try {
    const filter: any = {
      is_active: true,
      'trigger.type': triggerType,
      'trigger.entity': entityType,
    };
    if (tenantId) filter.tenant_id = tenantId;

    const workflows = await Workflow.find(filter).select('_id').lean();

    for (const wf of workflows) {
      await workflowQueue.add('trigger', {
        workflowId: wf._id.toString(),
        triggeredBy: 'event',
        entityType,
        entityId,
      });
    }

    if (workflows.length > 0) {
      logger.info({ triggerType, entityType, entityId, count: workflows.length }, 'Workflows triggered');
    }
  } catch (err) {
    logger.error({ err, triggerType, entityType, entityId }, 'Failed to trigger workflows');
  }
}
