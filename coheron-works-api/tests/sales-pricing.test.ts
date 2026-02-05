import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Sales – Pricing API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const productId = new mongoose.Types.ObjectId().toString();
  const partnerId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('pricing-test@coheron.com', 'Test@Pass123!');
  });

  // ── Price Lists ───────────────────────────────────────────────
  describe('POST /api/sales/pricing/price-lists', () => {
    it('should create a price list', async () => {
      const res = await request(app)
        .post('/api/sales/pricing/price-lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Retail Price List', currency: 'INR' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Retail Price List');
    });
  });

  describe('GET /api/sales/pricing/price-lists', () => {
    it('should return paginated price lists', async () => {
      await request(app).post('/api/sales/pricing/price-lists').set('Authorization', `Bearer ${token}`)
        .send({ name: 'PL A', currency: 'INR' });

      const res = await request(app).get('/api/sales/pricing/price-lists').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/sales/pricing/price-lists/:id/products', () => {
    it('should add a product to a price list', async () => {
      const pl = await request(app).post('/api/sales/pricing/price-lists').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Product PL', currency: 'INR' });
      const res = await request(app)
        .post(`/api/sales/pricing/price-lists/${pl.body._id}/products`)
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, price: 999 });
      expect(res.status).toBe(201);
    });
  });

  // ── Customer Prices ───────────────────────────────────────────
  describe('POST /api/sales/pricing/customer-prices', () => {
    it('should set a customer-specific price', async () => {
      const res = await request(app)
        .post('/api/sales/pricing/customer-prices')
        .set('Authorization', `Bearer ${token}`)
        .send({ partner_id: partnerId, product_id: productId, price: 850 });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/sales/pricing/customer-prices/:partnerId', () => {
    it('should return customer prices', async () => {
      await request(app).post('/api/sales/pricing/customer-prices').set('Authorization', `Bearer ${token}`)
        .send({ partner_id: partnerId, product_id: productId, price: 800 });

      const res = await request(app).get(`/api/sales/pricing/customer-prices/${partnerId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Pricing Rules ─────────────────────────────────────────────
  describe('POST /api/sales/pricing/pricing-rules', () => {
    it('should create a pricing rule', async () => {
      const res = await request(app)
        .post('/api/sales/pricing/pricing-rules')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '10% Volume Discount', rule_type: 'discount', discount_percent: 10 });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/sales/pricing/pricing-rules', () => {
    it('should return paginated pricing rules', async () => {
      const res = await request(app).get('/api/sales/pricing/pricing-rules').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  // ── Price Calculation ─────────────────────────────────────────
  describe('POST /api/sales/pricing/calculate-price', () => {
    it('should calculate final price', async () => {
      const res = await request(app)
        .post('/api/sales/pricing/calculate-price')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, quantity: 5 });
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/sales/pricing/price-lists');
      expect(res.status).toBe(401);
    });
  });
});
