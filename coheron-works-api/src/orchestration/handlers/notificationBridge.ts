import { eventBus } from '../EventBus.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../types.js';
import * as events from '../events.js';

// Notification-worthy events and their messages
const notificationMap: Record<string, (event: DomainEvent) => { title: string; message: string }> = {
  [events.SALEORDER_CONFIRMED]: (e) => ({
    title: 'Sale Order Confirmed',
    message: `Order ${e.payload.order_name || e.payload.order_id} has been confirmed`,
  }),
  [events.SALEORDER_CANCELLED]: (e) => ({
    title: 'Sale Order Cancelled',
    message: `Order ${e.payload.order_name || e.payload.order_id} has been cancelled`,
  }),
  [events.INVOICE_CREATED]: (e) => ({
    title: 'Invoice Created',
    message: `Invoice ${e.payload.invoice_name || e.payload.invoice_id} created for ${e.payload.amount_total || 0}`,
  }),
  [events.PAYMENT_RECORDED]: (e) => ({
    title: 'Payment Recorded',
    message: `Payment ${e.payload.payment_number} of ${e.payload.amount} recorded`,
  }),
  [events.PURCHASEORDER_APPROVED]: (e) => ({
    title: 'Purchase Order Approved',
    message: `PO ${e.payload.order_name || e.payload.order_id} approved`,
  }),
};

export function registerNotificationBridge(): void {
  for (const eventType of Object.keys(notificationMap)) {
    eventBus.subscribe(eventType, async function notificationBridge(event: DomainEvent) {
      try {
        const { title, message } = notificationMap[event.type](event);
        // Emit via Socket.IO if available (global io instance)
        const io = (globalThis as any).__socketIO;
        if (io) {
          io.to(`tenant:${event.tenant_id}`).emit('notification', { title, message, event_type: event.type, timestamp: new Date() });
          io.to(`tenant:${event.tenant_id}`).emit('dashboard:update', { event_type: event.type });
        }
      } catch (err) {
        logger.error({ err, eventType: event.type }, 'Notification bridge failed');
      }
    });
  }
}
