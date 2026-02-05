import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Inventory – Warehouses & Stock API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const partnerId = new mongoose.Types.ObjectId().toString();
  const productId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('inv-wh-test@coheron.com', 'Test@Pass123!');
  });

  /** Helper: create a warehouse with string address */
  async function createWarehouse(code: string, name: string) {
    const res = await request(app)
      .post('/api/inventory/warehouses')
      .set('Authorization', `Bearer ${token}`)
      .send({ code, name, warehouse_type: 'internal', partner_id: partnerId, address: 'Mumbai, India' });
    return res.body;
  }

  // ── Warehouses ────────────────────────────────────────────────
  describe('POST /api/inventory/warehouses', () => {
    it('should create a warehouse', async () => {
      const res = await request(app)
        .post('/api/inventory/warehouses')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: `WH-01-${Date.now()}`, name: 'Main Warehouse', warehouse_type: 'internal', partner_id: partnerId });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Main Warehouse');
    });
  });

  describe('GET /api/inventory/warehouses', () => {
    it('should return paginated warehouses', async () => {
      await createWarehouse(`WH-A-${Date.now()}`, 'Warehouse A');
      await createWarehouse(`WH-B-${Date.now()}`, 'Warehouse B');
      const res = await request(app).get('/api/inventory/warehouses').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/inventory/warehouses/:id', () => {
    it('should return a warehouse by ID', async () => {
      const wh = await createWarehouse(`WH-GET-${Date.now()}`, 'Get Warehouse');
      const res = await request(app).get(`/api/inventory/warehouses/${wh._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Get Warehouse');
    });

    it('should return 404 for non-existent warehouse', async () => {
      const res = await request(app).get(`/api/inventory/warehouses/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ── Stock Quants ──────────────────────────────────────────────
  describe('GET /api/inventory/stock-quant', () => {
    it('should return stock quants', async () => {
      const res = await request(app).get('/api/inventory/stock-quant').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Transfers ─────────────────────────────────────────────────
  describe('POST /api/inventory/transfers', () => {
    it('should create a stock transfer', async () => {
      const from = await createWarehouse(`WH-FROM-${Date.now()}`, 'From WH');
      const to = await createWarehouse(`WH-TO-${Date.now()}`, 'To WH');

      const res = await request(app)
        .post('/api/inventory/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          from_warehouse_id: from._id,
          to_warehouse_id: to._id,
          lines: [{ product_id: productId, quantity: 10 }],
        });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/inventory/transfers', () => {
    it('should list transfers', async () => {
      const res = await request(app).get('/api/inventory/transfers').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  // ── GRN ───────────────────────────────────────────────────────
  describe('POST /api/inventory/grn', () => {
    it('should create a GRN', async () => {
      const wh = await createWarehouse(`WH-GRN-${Date.now()}`, 'GRN Warehouse');
      const res = await request(app)
        .post('/api/inventory/grn')
        .set('Authorization', `Bearer ${token}`)
        .send({
          partner_id: partnerId,
          warehouse_id: wh._id,
          lines: [{ product_id: productId, quantity: 50, unit_price: 100 }],
        });
      expect(res.status).toBe(201);
      expect(res.body.grn_number).toBeDefined();
    });
  });

  describe('GET /api/inventory/grn', () => {
    it('should return paginated GRNs', async () => {
      const res = await request(app).get('/api/inventory/grn').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/inventory/warehouses');
      expect(res.status).toBe(401);
    });
  });
});
