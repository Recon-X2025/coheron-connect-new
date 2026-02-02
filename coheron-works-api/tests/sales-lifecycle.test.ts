import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app, getAuthToken } from './helpers.js';
import Quotation from '../src/models/Quotation.js';
import { SaleOrder } from '../src/models/SaleOrder.js';
import Invoice from '../src/models/Invoice.js';
import DocumentSequence from '../src/models/DocumentSequence.js';
import { SalesLifecycleService } from '../src/services/salesLifecycleService.js';
import { PaymentRecordingService } from '../src/services/paymentRecordingService.js';

describe('Sales Lifecycle', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const partnerId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  let salesService: SalesLifecycleService;
  let paymentService: PaymentRecordingService;

  beforeEach(async () => {
    salesService = new SalesLifecycleService();
    paymentService = new PaymentRecordingService();

    // Create a partner document for credit limit checks
    const db = mongoose.connection.db;
    if (db) {
      await db.collection('partners').insertOne({
        _id: partnerId,
        tenant_id: tenantId,
        name: 'Test Partner',
        credit_limit: 0,
        current_credit_used: 0,
      });
    }

    // Create all document sequences needed for the lifecycle
    await DocumentSequence.create([
      { tenant_id: tenantId, document_type: 'quotation', prefix: 'QTN-', current_number: 0, padding: 5, is_active: true },
      { tenant_id: tenantId, document_type: 'sale_order', prefix: 'SO-', current_number: 0, padding: 5, is_active: true },
      { tenant_id: tenantId, document_type: 'invoice', prefix: 'INV-', current_number: 0, padding: 5, is_active: true },
      { tenant_id: tenantId, document_type: 'payment', prefix: 'PAY-', current_number: 0, padding: 5, is_active: true },
      { tenant_id: tenantId, document_type: 'journal_entry', prefix: 'JE-', current_number: 0, padding: 5, is_active: true },
    ]);
  });

  async function createQuotation() {
    return Quotation.create({
      tenant_id: tenantId,
      quotation_number: `QTN-MANUAL-${Date.now()}`,
      partner_id: partnerId,
      lines: [
        { product_id: productId, quantity: 2, unit_price: 500 },
      ],
      grand_total: 1000,
      state: 'draft',
    });
  }

  describe('Quotation to Sale Order', () => {
    it('should convert a draft quotation to a sale order', async () => {
      const quotation = await createQuotation();

      const saleOrder = await salesService.convertQuotationToOrder(
        tenantId.toString(),
        quotation._id.toString(),
        userId.toString()
      );

      expect(saleOrder).toBeDefined();
      expect(saleOrder.state).toBe('draft');
      expect(saleOrder.partner_id.toString()).toBe(partnerId.toString());
      expect(saleOrder.amount_total).toBe(1000);

      // Verify quotation state was updated
      const updatedQuotation = await Quotation.findById(quotation._id);
      expect(updatedQuotation!.state).toBe('converted');
    });

    it('should reject conversion of a cancelled quotation', async () => {
      const quotation = await Quotation.create({
        tenant_id: tenantId,
        quotation_number: `QTN-CANCELLED-${Date.now()}`,
        partner_id: partnerId,
        lines: [{ product_id: productId, quantity: 1, unit_price: 100 }],
        amount_total: 100,
        state: 'cancelled',
      });

      await expect(
        salesService.convertQuotationToOrder(
          tenantId.toString(),
          quotation._id.toString(),
          userId.toString()
        )
      ).rejects.toThrow(/cannot be converted/i);
    });
  });

  describe('Confirm Sale Order', () => {
    it('should confirm a draft sale order', async () => {
      const quotation = await createQuotation();
      const saleOrder = await salesService.convertQuotationToOrder(
        tenantId.toString(),
        quotation._id.toString(),
        userId.toString()
      );

      const confirmed = await salesService.confirmSaleOrder(
        tenantId.toString(),
        saleOrder._id.toString()
      );

      expect(confirmed.state).toBe('sale');
      expect(confirmed.confirmation_date).toBeDefined();
    });

    it('should reject confirming an already confirmed order', async () => {
      const quotation = await createQuotation();
      const saleOrder = await salesService.convertQuotationToOrder(
        tenantId.toString(),
        quotation._id.toString(),
        userId.toString()
      );

      await salesService.confirmSaleOrder(tenantId.toString(), saleOrder._id.toString());

      await expect(
        salesService.confirmSaleOrder(tenantId.toString(), saleOrder._id.toString())
      ).rejects.toThrow(/Only draft orders can be confirmed/i);
    });
  });

  describe('Create Invoice from Order', () => {
    it('should create an invoice from a confirmed order', async () => {
      const quotation = await createQuotation();
      const saleOrder = await salesService.convertQuotationToOrder(
        tenantId.toString(),
        quotation._id.toString(),
        userId.toString()
      );

      await salesService.confirmSaleOrder(tenantId.toString(), saleOrder._id.toString());

      const invoice = await salesService.createInvoiceFromOrder(
        tenantId.toString(),
        saleOrder._id.toString(),
        userId.toString()
      );

      expect(invoice).toBeDefined();
      expect(invoice.amount_total).toBe(1000);
      expect(invoice.partner_id.toString()).toBe(partnerId.toString());

      // Verify order updated to invoiced
      const updatedOrder = await SaleOrder.findById(saleOrder._id);
      expect(updatedOrder!.invoice_status).toBe('invoiced');
    });

    it('should reject invoicing a draft (unconfirmed) order', async () => {
      const quotation = await createQuotation();
      const saleOrder = await salesService.convertQuotationToOrder(
        tenantId.toString(),
        quotation._id.toString(),
        userId.toString()
      );

      await expect(
        salesService.createInvoiceFromOrder(
          tenantId.toString(),
          saleOrder._id.toString(),
          userId.toString()
        )
      ).rejects.toThrow(/Order must be confirmed before invoicing/i);
    });
  });

  describe('Cancel Sale Order', () => {
    it('should cancel a draft order', async () => {
      const quotation = await createQuotation();
      const saleOrder = await salesService.convertQuotationToOrder(
        tenantId.toString(),
        quotation._id.toString(),
        userId.toString()
      );

      const cancelled = await salesService.cancelSaleOrder(
        tenantId.toString(),
        saleOrder._id.toString()
      );

      expect(cancelled.state).toBe('cancel');
    });

    it('should not allow confirming a cancelled order', async () => {
      const quotation = await createQuotation();
      const saleOrder = await salesService.convertQuotationToOrder(
        tenantId.toString(),
        quotation._id.toString(),
        userId.toString()
      );

      await salesService.cancelSaleOrder(tenantId.toString(), saleOrder._id.toString());

      await expect(
        salesService.confirmSaleOrder(tenantId.toString(), saleOrder._id.toString())
      ).rejects.toThrow(/Only draft orders can be confirmed/i);
    });
  });

  describe('Full lifecycle: Quotation → Order → Invoice → Payment', () => {
    it('should complete the full sales lifecycle', async () => {
      // Step 1: Create quotation
      const quotation = await createQuotation();
      expect(quotation.state).toBe('draft');

      // Step 2: Convert to sale order
      const saleOrder = await salesService.convertQuotationToOrder(
        tenantId.toString(),
        quotation._id.toString(),
        userId.toString()
      );
      expect(saleOrder.state).toBe('draft');

      // Step 3: Confirm order
      const confirmed = await salesService.confirmSaleOrder(
        tenantId.toString(),
        saleOrder._id.toString()
      );
      expect(confirmed.state).toBe('sale');

      // Step 4: Create invoice
      const invoice = await salesService.createInvoiceFromOrder(
        tenantId.toString(),
        saleOrder._id.toString(),
        userId.toString()
      );
      expect(invoice.amount_total).toBe(1000);

      // Step 5: Record payment
      const payment = await paymentService.recordPayment(
        tenantId.toString(),
        invoice._id.toString(),
        1000,
        'bank_transfer',
        'FULL-PAY'
      );
      expect(payment.status).toBe('paid');
      expect(payment.total_paid).toBe(1000);
    });
  });
});
