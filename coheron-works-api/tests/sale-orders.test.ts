import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, getAuthToken } from './helpers.js';

describe('Sale Orders API', () => {
  let token: string;
  const sampleOrder = {
    name: 'SO-001',
    partner_id: '507f1f77bcf86cd799439011',
    order_line: [
      { product_id: '507f1f77bcf86cd799439012', product_uom_qty: 2, price_unit: 50 },
      { product_id: '507f1f77bcf86cd799439013', product_uom_qty: 1, price_unit: 100 },
    ],
  };

  beforeAll(async () => {
    token = await getAuthToken('saleorders-test@coheron.com', 'Test@Pass123!');
  });

  describe('POST /api/sale-orders', () => {
    it('should create a sale order with calculated total', async () => {
      const res = await request(app)
        .post('/api/sale-orders')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleOrder);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('SO-001');
      expect(res.body.amount_total).toBe(200); // 2*50 + 1*100
      expect(res.body.order_line).toHaveLength(2);
    });
  });

  describe('GET /api/sale-orders', () => {
    it('should return paginated sale orders', async () => {
      await request(app).post('/api/sale-orders').set('Authorization', `Bearer ${token}`).send(sampleOrder);
      await request(app).post('/api/sale-orders').set('Authorization', `Bearer ${token}`).send({ ...sampleOrder, name: 'SO-002' });

      const res = await request(app).get('/api/sale-orders').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by search', async () => {
      await request(app).post('/api/sale-orders').set('Authorization', `Bearer ${token}`).send(sampleOrder);
      await request(app).post('/api/sale-orders').set('Authorization', `Bearer ${token}`).send({ ...sampleOrder, name: 'PO-001' });

      const res = await request(app).get('/api/sale-orders?search=SO').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/sale-orders/:id', () => {
    it('should return a sale order by ID', async () => {
      const created = await request(app).post('/api/sale-orders').set('Authorization', `Bearer ${token}`).send(sampleOrder);
      const res = await request(app).get(`/api/sale-orders/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('SO-001');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).get('/api/sale-orders/507f1f77bcf86cd799439011').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
