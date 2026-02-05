import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('POS API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const storeId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const productId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('pos-test@coheron.com', 'Test@Pass123!');
  });

  // ── Terminals ─────────────────────────────────────────────────
  describe('POST /api/pos/terminals', () => {
    it('should create a POS terminal', async () => {
      const res = await request(app)
        .post('/api/pos/terminals')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Terminal 1', code: 'T-001', store_id: storeId });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Terminal 1');
    });
  });

  describe('GET /api/pos/terminals', () => {
    it('should return paginated terminals', async () => {
      await request(app).post('/api/pos/terminals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Term A', code: `T-A-${Date.now()}`, store_id: storeId });

      const res = await request(app).get('/api/pos/terminals').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('DELETE /api/pos/terminals/:id', () => {
    it('should delete a terminal', async () => {
      const created = await request(app).post('/api/pos/terminals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Del Term', code: `T-DEL-${Date.now()}`, store_id: storeId });
      const res = await request(app).delete(`/api/pos/terminals/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Sessions ──────────────────────────────────────────────────
  describe('POST /api/pos/sessions', () => {
    it('should create a POS session', async () => {
      const term = await request(app).post('/api/pos/terminals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Session Term', code: `T-S-${Date.now()}`, store_id: storeId });

      const res = await request(app)
        .post('/api/pos/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ store_id: storeId, terminal_id: term.body._id, user_id: userId, opening_balance: 5000 });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/pos/sessions', () => {
    it('should return paginated sessions', async () => {
      const res = await request(app).get('/api/pos/sessions').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/pos/sessions/:id/close', () => {
    it('should close a session', async () => {
      const term = await request(app).post('/api/pos/terminals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Close Term', code: `T-CL-${Date.now()}`, store_id: storeId });
      const session = await request(app).post('/api/pos/sessions').set('Authorization', `Bearer ${token}`)
        .send({ store_id: storeId, terminal_id: term.body._id, user_id: userId, opening_balance: 5000 });
      const res = await request(app)
        .post(`/api/pos/sessions/${session.body._id}/close`)
        .set('Authorization', `Bearer ${token}`)
        .send({ closing_balance: 12000 });
      expect(res.status).toBe(200);
    });
  });

  // ── Orders ────────────────────────────────────────────────────
  describe('POST /api/pos/orders', () => {
    it('should create a POS order', async () => {
      const term = await request(app).post('/api/pos/terminals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Order Term', code: `T-ORD-${Date.now()}`, store_id: storeId });
      const session = await request(app).post('/api/pos/sessions').set('Authorization', `Bearer ${token}`)
        .send({ store_id: storeId, terminal_id: term.body._id, user_id: userId });
      const res = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          store_id: storeId,
          terminal_id: term.body._id,
          session_id: session.body._id,
          lines: [{ product_id: productId, qty: 2, price_unit: 150 }],
        });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/pos/orders', () => {
    it('should return paginated POS orders', async () => {
      const res = await request(app).get('/api/pos/orders').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/pos/orders/:id/void', () => {
    it('should void an order', async () => {
      const term = await request(app).post('/api/pos/terminals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Void Term', code: `T-V-${Date.now()}`, store_id: storeId });
      const session = await request(app).post('/api/pos/sessions').set('Authorization', `Bearer ${token}`)
        .send({ store_id: storeId, terminal_id: term.body._id, user_id: userId });
      const order = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${token}`)
        .send({ store_id: storeId, terminal_id: term.body._id, session_id: session.body._id, lines: [{ product_id: productId, qty: 1, price_unit: 100 }] });
      const res = await request(app)
        .post(`/api/pos/orders/${order.body._id}/void`)
        .set('Authorization', `Bearer ${token}`)
        .send({ void_reason: 'Customer changed mind' });
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/pos/orders');
      expect(res.status).toBe(401);
    });
  });
});
