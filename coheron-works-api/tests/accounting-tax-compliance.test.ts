import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Accounting – Tax Compliance API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const tenantId = new mongoose.Types.ObjectId().toString();
  const partnerId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('tax-compliance-test@coheron.com', 'Test@Pass123!');
  });

  // ── TDS Entries ──────────────────────────────────────────────
  describe('POST /api/accounting/tds', () => {
    it('should create a TDS entry', async () => {
      const res = await request(app)
        .post('/api/accounting/tds')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tenant_id: tenantId,
          section: '194C',
          deductee_name: 'Vendor Corp',
          deductee_pan: 'ABCDE1234F',
          deductee_type: 'company',
          payment_date: '2025-01-15',
          payment_amount: 100000,
          tds_rate: 2,
          tds_amount: 2000,
          total_deduction: 2000,
          status: 'pending',
          quarter: 'Q3',
          financial_year: '2024-25',
          partner_id: partnerId,
        });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/accounting/tds', () => {
    it('should return paginated TDS entries', async () => {
      await request(app).post('/api/accounting/tds').set('Authorization', `Bearer ${token}`)
        .send({
          tenant_id: tenantId,
          section: '194A',
          deductee_name: 'Interest Inc',
          deductee_pan: 'XYZAB5678G',
          payment_date: '2025-02-01',
          payment_amount: 50000,
          tds_rate: 10,
          tds_amount: 5000,
          total_deduction: 5000,
          status: 'pending',
          quarter: 'Q3',
          financial_year: '2024-25',
        });

      const res = await request(app).get('/api/accounting/tds').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by quarter', async () => {
      const res = await request(app).get('/api/accounting/tds?quarter=Q3').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/accounting/tds/:id', () => {
    it('should return a TDS entry by ID', async () => {
      const created = await request(app).post('/api/accounting/tds').set('Authorization', `Bearer ${token}`)
        .send({
          tenant_id: tenantId,
          section: '194J',
          deductee_name: 'Prof Services',
          deductee_pan: 'PQRST9876H',
          payment_date: '2025-03-01',
          payment_amount: 80000,
          tds_rate: 10,
          tds_amount: 8000,
          total_deduction: 8000,
        });
      const res = await request(app).get(`/api/accounting/tds/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ── GST Returns ──────────────────────────────────────────────
  describe('POST /api/accounting/gst-returns', () => {
    it('should create a GST return', async () => {
      const res = await request(app)
        .post('/api/accounting/gst-returns')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tenant_id: tenantId,
          return_type: 'GSTR1',
          period: '2025-01',
          financial_year: '2024-25',
          gstin: '29ABCDE1234F1Z5',
          status: 'draft',
        });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/accounting/gst-returns', () => {
    it('should return paginated GST returns', async () => {
      await request(app).post('/api/accounting/gst-returns').set('Authorization', `Bearer ${token}`)
        .send({
          tenant_id: tenantId,
          return_type: 'GSTR3B',
          period: '2025-02',
          financial_year: '2024-25',
          gstin: '29ABCDE1234F1Z5',
          status: 'draft',
        });

      const res = await request(app).get('/api/accounting/gst-returns').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by return_type', async () => {
      const res = await request(app).get('/api/accounting/gst-returns?return_type=GSTR1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/accounting/gst-returns/:id', () => {
    it('should return a GST return by ID', async () => {
      const created = await request(app).post('/api/accounting/gst-returns').set('Authorization', `Bearer ${token}`)
        .send({
          tenant_id: tenantId,
          return_type: 'GSTR9',
          period: '2025-03',
          financial_year: '2024-25',
          gstin: '29ABCDE1234F1Z5',
        });
      const res = await request(app).get(`/api/accounting/gst-returns/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/accounting/tds');
      expect(res.status).toBe(401);
    });
  });
});
