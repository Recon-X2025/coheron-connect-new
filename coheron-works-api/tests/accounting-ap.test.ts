import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Accounting – Accounts Payable API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const partnerId = new mongoose.Types.ObjectId().toString();
  const productId = new mongoose.Types.ObjectId().toString();
  const journalId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('ap-test@coheron.com', 'Test@Pass123!');
  });

  // ── Vendors ───────────────────────────────────────────────────
  describe('POST /api/accounting/accounts-payable/vendors', () => {
    it('should create a vendor', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts-payable/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({ partner_id: partnerId, vendor_code: 'VEND-001' });
      expect(res.status).toBe(201);
      expect(res.body.vendor_code).toBe('VEND-001');
    });
  });

  describe('GET /api/accounting/accounts-payable/vendors', () => {
    it('should list vendors', async () => {
      await request(app).post('/api/accounting/accounts-payable/vendors').set('Authorization', `Bearer ${token}`)
        .send({ partner_id: new mongoose.Types.ObjectId().toString(), vendor_code: 'V-A' });

      const res = await request(app).get('/api/accounting/accounts-payable/vendors').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Bills ─────────────────────────────────────────────────────
  describe('POST /api/accounting/accounts-payable/bills', () => {
    it('should create a bill', async () => {
      // Create vendor first
      const vendor = await request(app).post('/api/accounting/accounts-payable/vendors').set('Authorization', `Bearer ${token}`)
        .send({ partner_id: new mongoose.Types.ObjectId().toString(), vendor_code: 'V-BILL' });

      const res = await request(app)
        .post('/api/accounting/accounts-payable/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendor_id: vendor.body._id,
          invoice_date: '2025-01-15',
          due_date: '2025-02-15',
          lines: [
            { product_id: productId, description: 'Office Supplies', quantity: 10, unit_price: 50 },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.state).toBe('draft');
      expect(res.body.name).toBeDefined();
    });
  });

  describe('GET /api/accounting/accounts-payable/bills', () => {
    it('should return paginated bills', async () => {
      const vendor = await request(app).post('/api/accounting/accounts-payable/vendors').set('Authorization', `Bearer ${token}`)
        .send({ partner_id: new mongoose.Types.ObjectId().toString(), vendor_code: 'V-LIST' });

      await request(app).post('/api/accounting/accounts-payable/bills').set('Authorization', `Bearer ${token}`)
        .send({ vendor_id: vendor.body._id, invoice_date: '2025-01-15', lines: [{ product_id: productId, quantity: 1, unit_price: 100 }] });

      const res = await request(app).get('/api/accounting/accounts-payable/bills').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/accounting/accounts-payable/bills/:id', () => {
    it('should return a bill by ID', async () => {
      const vendor = await request(app).post('/api/accounting/accounts-payable/vendors').set('Authorization', `Bearer ${token}`)
        .send({ partner_id: new mongoose.Types.ObjectId().toString(), vendor_code: 'V-GET' });

      const created = await request(app).post('/api/accounting/accounts-payable/bills').set('Authorization', `Bearer ${token}`)
        .send({ vendor_id: vendor.body._id, invoice_date: '2025-01-15', lines: [{ product_id: productId, quantity: 1, unit_price: 200 }] });

      const res = await request(app).get(`/api/accounting/accounts-payable/bills/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent bill', async () => {
      const res = await request(app).get(`/api/accounting/accounts-payable/bills/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ── Payments ──────────────────────────────────────────────────
  describe('POST /api/accounting/accounts-payable/payments', () => {
    it('should create a payment', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts-payable/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'PAY-001',
          payment_type: 'outbound',
          payment_method: 'bank_transfer',
          partner_id: partnerId,
          amount: 500,
          payment_date: '2025-01-20',
          journal_id: journalId,
        });
      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(500);
    });
  });

  describe('GET /api/accounting/accounts-payable/payments', () => {
    it('should return paginated payments', async () => {
      await request(app).post('/api/accounting/accounts-payable/payments').set('Authorization', `Bearer ${token}`)
        .send({ name: 'PAY-L1', payment_type: 'outbound', payment_method: 'cash', partner_id: partnerId, amount: 100, payment_date: '2025-01-20', journal_id: journalId });

      const res = await request(app).get('/api/accounting/accounts-payable/payments').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/accounting/accounts-payable/vendors');
      expect(res.status).toBe(401);
    });
  });
});
