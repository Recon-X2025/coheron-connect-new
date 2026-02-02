import { eventBus } from '../EventBus.js';
import { DELIVERY_COMPLETED } from '../events.js';
import autoJournalService from '../../services/autoJournalService.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../types.js';

export function registerInventoryHandlers(): void {
  eventBus.subscribe(DELIVERY_COMPLETED, async function handleDeliveryCompleted(event: DomainEvent) {
    const { delivery_id } = event.payload;
    if (!delivery_id || !event.tenant_id) return;

    try {
      // COGS journal — cost would come from payload or be calculated
      const cogsCost = event.payload.cogs_cost || 0;
      if (cogsCost > 0) {
        await autoJournalService.createInventoryJournal(event.tenant_id, delivery_id, cogsCost);
        logger.info({ deliveryId: delivery_id }, 'COGS journal created for delivery');
      }
    } catch (err) {
      logger.error({ err, deliveryId: delivery_id }, 'Failed to create delivery COGS journal');
      throw err;
    }
  });
}
