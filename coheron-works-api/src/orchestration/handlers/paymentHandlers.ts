import { eventBus } from '../EventBus.js';
import { PAYMENT_RECORDED } from '../events.js';
import autoJournalService from '../../services/autoJournalService.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../types.js';

export function registerPaymentHandlers(): void {
  eventBus.subscribe(PAYMENT_RECORDED, async function handlePaymentJournal(event: DomainEvent) {
    const { invoice_id, amount, partner_id, payment_number } = event.payload;
    if (!invoice_id || !event.tenant_id) return;

    try {
      await autoJournalService.createPaymentJournal(
        event.tenant_id,
        invoice_id,
        amount || 0,
        partner_id || '',
      );
      logger.info({ paymentNumber: payment_number }, 'Auto-journal created for payment');
    } catch (err) {
      logger.error({ err, paymentNumber: payment_number }, 'Failed to create payment auto-journal');
      throw err;
    }
  });
}
