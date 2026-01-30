import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';

export async function executeUpdateField(config: any, context: any) {
  const { field, value } = config;
  if (!field || !context.entityType || !context.entityId) {
    throw new Error('update_field requires field, entityType, and entityId');
  }

  const Model = mongoose.model(context.entityType);
  await Model.findByIdAndUpdate(context.entityId, { [field]: value });
  logger.info({ entityType: context.entityType, entityId: context.entityId, field, value }, 'Workflow: field updated');
  return { field, value };
}
