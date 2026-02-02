import { eventBus } from '../EventBus.js';
import { SALEORDER_CONFIRMED, SALEORDER_CANCELLED } from '../events.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../types.js';

export function registerSaleOrderHandlers(): void {
  eventBus.subscribe(SALEORDER_CONFIRMED, async function handleOrderConfirmed(event: DomainEvent) {
    const { order_id } = event.payload;
    logger.info({ orderId: order_id }, 'Sale order confirmed — stock reservation placeholder');
    // Future: stock reservation logic
  });

  eventBus.subscribe(SALEORDER_CANCELLED, async function handleOrderCancelled(event: DomainEvent) {
    const { order_id } = event.payload;
    logger.info({ orderId: order_id }, 'Sale order cancelled — credit release notification placeholder');
    // Future: credit release notification
  });
}
