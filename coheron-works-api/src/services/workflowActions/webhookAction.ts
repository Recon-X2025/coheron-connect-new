import axios from 'axios';
import logger from '../../utils/logger.js';

export async function executeWebhook(config: any, context: any) {
  const { url, method, headers, body } = config;
  if (!url) {
    throw new Error('webhook requires url');
  }

  const payload = body || { entityType: context.entityType, entityId: context.entityId, entity: context.entity };

  const response = await axios({
    method: method || 'POST',
    url,
    headers: headers || { 'Content-Type': 'application/json' },
    data: payload,
    timeout: 30000,
  });

  logger.info({ url, status: response.status }, 'Workflow: webhook called');
  return { status: response.status, data: response.data };
}
