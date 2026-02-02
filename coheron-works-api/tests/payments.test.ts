import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from './helpers.js';
import Invoice from '../src/models/Invoice.js';
import { PaymentRecordingService } from '../src/services/paymentRecordingService.js';
import DocumentSequence from '../src/models/DocumentSequence.js';

describe('Payments', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const partnerId = new mongoose.Types.ObjectId();
  let paymentService: PaymentRecordingService;

  beforeEach(async () => {
    paymentService = new PaymentRecordingService();

    // Create a partner document for credit limit operations
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

    // Create document sequences needed by PaymentRecordingService
    await DocumentSequence.create([
      {
        tenant_id: tenantId,
        document_type: 'payment',
        prefix: 'PAY-',
        current_number: 0,
        padding: 5,
        is_active: true,
      },
      {
        tenant_id: tenantId,
        document_type: 'journal_entry',
        prefix: 'JE-',
        current_number: 0,
        padding: 5,
        is_active: true,
      },
    ]);
  });

  async function createTestInvoice(amount: number, amountPaid = 0) {
    const invoice = await Invoice.create({
      name: `INV-${Date.now()}`,
      partner_id: partnerId,
      tenant_id: tenantId,
      amount_total: amount,
      amount_paid: amountPaid,
      amount_residual: amount - amountPaid,
      state: 'posted',
      payment_state: amountPaid > 0 ? 'partial' : 'not_paid',
      payments: [],
    });
    return invoice;
  }

  describe('Full payment', () => {
    it('should record a full payment and mark invoice as paid', async () => {
      const invoice = await createTestInvoice(1000);

      const result = await paymentService.recordPayment(
        tenantId.toString(),
        invoice._id.toString(),
        1000,
        'bank_transfer',
        'REF-001'
      );

      expect(result.amount).toBe(1000);
      expect(result.total_paid).toBe(1000);
      expect(result.status).toBe('paid');
      expect(result.payment_number).toMatch(/^PAY-/);
    });
  });

  describe('Partial payment', () => {
    it('should record a partial payment and set status to partial', async () => {
      const invoice = await createTestInvoice(1000);

      const result = await paymentService.recordPayment(
        tenantId.toString(),
        invoice._id.toString(),
        400,
        'bank_transfer',
        'REF-PARTIAL'
      );

      expect(result.amount).toBe(400);
      expect(result.total_paid).toBe(400);
      expect(result.status).toBe('partial');
    });

    it('should allow multiple partial payments that sum to full', async () => {
      const invoice = await createTestInvoice(1000);

      const first = await paymentService.recordPayment(
        tenantId.toString(),
        invoice._id.toString(),
        400,
        'bank_transfer',
        'REF-P1'
      );
      expect(first.status).toBe('partial');
      expect(first.total_paid).toBe(400);

      const second = await paymentService.recordPayment(
        tenantId.toString(),
        invoice._id.toString(),
        600,
        'bank_transfer',
        'REF-P2'
      );
      expect(second.status).toBe('paid');
      expect(second.total_paid).toBe(1000);
    });
  });

  describe('Overpayment', () => {
    it('should reject a payment that exceeds the residual amount', async () => {
      const invoice = await createTestInvoice(1000);

      await expect(
        paymentService.recordPayment(
          tenantId.toString(),
          invoice._id.toString(),
          1500,
          'bank_transfer',
          'REF-OVER'
        )
      ).rejects.toThrow(/Payment exceeds residual/);
    });

    it('should reject overpayment after a partial payment', async () => {
      const invoice = await createTestInvoice(1000);

      await paymentService.recordPayment(
        tenantId.toString(),
        invoice._id.toString(),
        700,
        'bank_transfer',
        'REF-P1'
      );

      await expect(
        paymentService.recordPayment(
          tenantId.toString(),
          invoice._id.toString(),
          400,
          'bank_transfer',
          'REF-P2'
        )
      ).rejects.toThrow(/Payment exceeds residual/);
    });
  });

  describe('Invoice API (REST)', () => {
    it('should create an invoice via the API', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .send({
          name: 'INV-API-001',
          partner_id: partnerId.toString(),
          amount_total: 500,
          state: 'draft',
          payment_state: 'not_paid',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('INV-API-001');
      expect(res.body.amount_total).toBe(500);
      expect(res.body.payment_state).toBe('not_paid');
    });
  });
});
