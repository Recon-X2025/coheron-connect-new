import { eventBus } from '../EventBus.js';
import { INVOICE_CREATED } from '../events.js';
import autoJournalService from '../../services/autoJournalService.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../types.js';

export function registerInvoiceHandlers(): void {
  eventBus.subscribe(INVOICE_CREATED, async function handleInvoiceCreatedJournal(event: DomainEvent) {
    const { invoice_id, amount_total, tax_amount, partner_id } = event.payload;
    if (!invoice_id || !event.tenant_id) return;

    try {
      await autoJournalService.createInvoiceJournal(
        event.tenant_id,
        invoice_id,
        amount_total || 0,
        tax_amount || 0,
        partner_id || '',
      );
      logger.info({ invoiceId: invoice_id }, 'Auto-journal created for invoice');
    } catch (err) {
      logger.error({ err, invoiceId: invoice_id }, 'Failed to create invoice auto-journal');
      throw err; // Re-throw to mark handler as failed
    }
  });
}
