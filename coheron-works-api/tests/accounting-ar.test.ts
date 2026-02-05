import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';
import AccountCustomer from '../src/models/AccountCustomer.js';

describe('Accounting – Accounts Receivable API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    token = await getAuthToken('ar-test@coheron.com', 'Test@Pass123!');
  });

  /** Helper: create a customer directly via model */
  async function createCustomer(code: string) {
    const customer = await AccountCustomer.create({
      partner_id: new mongoose.Types.ObjectId(),
      customer_code: code,
    });
    return customer;
  }

  // ── Customers ─────────────────────────────────────────────────
  describe('GET /api/accounting/accounts-receivable/customers', () => {
    it('should list customers', async () => {
      await createCustomer('C-1');
      const res = await request(app).get('/api/accounting/accounts-receivable/customers').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Receipts ──────────────────────────────────────────────────
  describe('POST /api/accounting/accounts-receivable/receipts', () => {
    it('should create a receipt', async () => {
      const customer = await createCustomer('C-REC');
      const res = await request(app)
        .post('/api/accounting/accounts-receivable/receipts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customer_id: customer._id.toString(),
          amount: 5000,
          payment_date: '2025-02-01',
          payment_method: 'bank_transfer',
        });
      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(5000);
      expect(res.body.state).toBe('draft');
      expect(res.body.name).toBeDefined();
    });
  });

  describe('GET /api/accounting/accounts-receivable/receipts', () => {
    it('should list receipts', async () => {
      const customer = await createCustomer('C-RLIST');
      await request(app).post('/api/accounting/accounts-receivable/receipts').set('Authorization', `Bearer ${token}`)
        .send({ customer_id: customer._id.toString(), amount: 1000, payment_date: '2025-02-01', payment_method: 'cash' });

      const res = await request(app).get('/api/accounting/accounts-receivable/receipts').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/accounting/accounts-receivable/receipts/:id', () => {
    it('should return a receipt by ID', async () => {
      const customer = await createCustomer('C-RGET');
      const created = await request(app).post('/api/accounting/accounts-receivable/receipts').set('Authorization', `Bearer ${token}`)
        .send({ customer_id: customer._id.toString(), amount: 2000, payment_date: '2025-02-05', payment_method: 'cheque' });
      const res = await request(app).get(`/api/accounting/accounts-receivable/receipts/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(2000);
    });

    it('should return 404 for non-existent receipt', async () => {
      const res = await request(app).get(`/api/accounting/accounts-receivable/receipts/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ── Aging ─────────────────────────────────────────────────────
  describe('GET /api/accounting/accounts-receivable/aging', () => {
    it('should return aging report', async () => {
      const res = await request(app).get('/api/accounting/accounts-receivable/aging').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/accounting/accounts-receivable/receipts');
      expect(res.status).toBe(401);
    });
  });
});
