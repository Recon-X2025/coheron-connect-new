import { eventBus } from '../EventBus.js';
import { dispatchWebhooks } from '../gateway/WebhookDispatcher.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../types.js';

export function registerWebhookBridge(): void {
  eventBus.subscribeAll(async function webhookBridge(event: DomainEvent) {
    try {
      await dispatchWebhooks(event);
    } catch (err) {
      logger.error({ err, eventType: event.type }, 'Webhook bridge failed');
    }
  });
}
