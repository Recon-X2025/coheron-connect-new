import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

export async function executeAssign(config: any, context: any) {
  const { assignField, assignTo } = config;
  if (!context.entityType || !context.entityId) {
    throw new Error('assign requires entityType and entityId');
  }

  const field = assignField || 'assigned_agent_id';
  const Model = mongoose.model(context.entityType);
  await Model.findByIdAndUpdate(context.entityId, { [field]: assignTo });
  logger.info({ entityType: context.entityType, entityId: context.entityId, field, assignTo }, 'Workflow: entity assigned');
  return { field, assignTo };
}
