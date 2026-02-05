import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';
import FixedAsset from '../src/models/FixedAsset.js';

describe('Accounting – Fixed Assets API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const categoryId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('assets-test@coheron.com', 'Test@Pass123!');
  });

  function sampleAsset(extra: Record<string, any> = {}) {
    return {
      name: 'Office Laptop',
      category_id: categoryId,
      purchase_date: '2024-06-01',
      purchase_value: 120000,
      current_value: 120000,
      useful_life_years: 5,
      depreciation_method: 'straight_line',
      salvage_value: 0,
      ...extra,
    };
  }

  // ── Categories ────────────────────────────────────────────────
  describe('GET /api/accounting/fixed-assets/categories', () => {
    it('should list asset categories', async () => {
      const res = await request(app)
        .get('/api/accounting/fixed-assets/categories')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Assets CRUD ───────────────────────────────────────────────
  describe('POST /api/accounting/fixed-assets', () => {
    it('should create an asset', async () => {
      const res = await request(app)
        .post('/api/accounting/fixed-assets')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleAsset());
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Office Laptop');
      expect(res.body.state).toBe('draft');
    });
  });

  describe('GET /api/accounting/fixed-assets', () => {
    it('should return paginated assets', async () => {
      await request(app).post('/api/accounting/fixed-assets').set('Authorization', `Bearer ${token}`)
        .send(sampleAsset({ name: 'Asset X', code: `FA-X-${Date.now()}` }));
      await request(app).post('/api/accounting/fixed-assets').set('Authorization', `Bearer ${token}`)
        .send(sampleAsset({ name: 'Asset Y', code: `FA-Y-${Date.now()}` }));

      const res = await request(app).get('/api/accounting/fixed-assets').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/accounting/fixed-assets/:id', () => {
    it('should return an asset by ID', async () => {
      const created = await request(app).post('/api/accounting/fixed-assets').set('Authorization', `Bearer ${token}`)
        .send(sampleAsset());
      const res = await request(app).get(`/api/accounting/fixed-assets/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Office Laptop');
    });

    it('should return 404 for non-existent asset', async () => {
      const res = await request(app).get(`/api/accounting/fixed-assets/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ── Depreciation ──────────────────────────────────────────────
  describe('POST /api/accounting/fixed-assets/:id/depreciate', () => {
    it('should record depreciation for an open asset', async () => {
      // Create asset then set to open state via model (route ignores state field)
      const created = await request(app).post('/api/accounting/fixed-assets').set('Authorization', `Bearer ${token}`)
        .send(sampleAsset());
      await FixedAsset.findByIdAndUpdate(created.body._id, { state: 'open' });

      const res = await request(app)
        .post(`/api/accounting/fixed-assets/${created.body._id}/depreciate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ period_start: '2024-07-01', period_end: '2024-07-31' });
      expect(res.status).toBe(201);
      expect(res.body.depreciation_amount).toBeGreaterThan(0);
    });

    it('should reject depreciation for draft asset', async () => {
      const created = await request(app).post('/api/accounting/fixed-assets').set('Authorization', `Bearer ${token}`)
        .send(sampleAsset());
      const res = await request(app)
        .post(`/api/accounting/fixed-assets/${created.body._id}/depreciate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ period_start: '2024-07-01', period_end: '2024-07-31' });
      expect(res.status).toBe(400);
    });
  });

  // ── Disposal ──────────────────────────────────────────────────
  describe('POST /api/accounting/fixed-assets/:id/dispose', () => {
    it('should dispose of an open asset and calculate gain/loss', async () => {
      const created = await request(app).post('/api/accounting/fixed-assets').set('Authorization', `Bearer ${token}`)
        .send(sampleAsset());
      await FixedAsset.findByIdAndUpdate(created.body._id, { state: 'open' });

      const res = await request(app)
        .post(`/api/accounting/fixed-assets/${created.body._id}/dispose`)
        .set('Authorization', `Bearer ${token}`)
        .send({ disposal_date: '2025-01-01', disposal_type: 'sale', disposal_value: 100000 });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('gain_loss');
    });

    it('should return 404 for non-existent asset', async () => {
      const res = await request(app)
        .post(`/api/accounting/fixed-assets/${fakeId}/dispose`)
        .set('Authorization', `Bearer ${token}`)
        .send({ disposal_date: '2025-01-01', disposal_type: 'sale', disposal_value: 0 });
      expect(res.status).toBe(404);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/accounting/fixed-assets');
      expect(res.status).toBe(401);
    });
  });
});
