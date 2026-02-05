import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Deals & Pipelines API', () => {
  let token: string;
  const tenantId = new mongoose.Types.ObjectId().toString();
  const fakeId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    token = await getAuthToken('deals-test@coheron.com', 'Test@Pass123!');
  });

  /** Helper: create a pipeline so deals have a valid pipeline_id */
  async function createPipeline(name = 'Test Pipeline') {
    const res = await request(app)
      .post('/api/pipelines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, tenant_id: tenantId });
    return res.body;
  }

  // ── Pipelines ────────────────────────────────────────────────
  describe('POST /api/pipelines', () => {
    it('should create a pipeline', async () => {
      const res = await request(app)
        .post('/api/pipelines')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sales Pipeline', tenant_id: tenantId, is_default: true });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Sales Pipeline');
    });
  });

  describe('GET /api/pipelines', () => {
    it('should list pipelines', async () => {
      await createPipeline('Pipeline A');
      await createPipeline('Pipeline B');

      const res = await request(app).get('/api/pipelines').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/pipelines/:id', () => {
    it('should return a pipeline by ID', async () => {
      const pipeline = await createPipeline('Fetch Me');
      const res = await request(app).get(`/api/pipelines/${pipeline._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Fetch Me');
    });

    it('should return 404 for non-existent pipeline', async () => {
      const res = await request(app).get(`/api/pipelines/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/pipelines/:id', () => {
    it('should update a pipeline', async () => {
      const pipeline = await createPipeline('Old Name');
      const res = await request(app).put(`/api/pipelines/${pipeline._id}`).set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
    });
  });

  describe('DELETE /api/pipelines/:id', () => {
    it('should delete a pipeline', async () => {
      const pipeline = await createPipeline('Delete Me');
      const res = await request(app).delete(`/api/pipelines/${pipeline._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Pipeline stages', () => {
    it('should add a stage to a pipeline', async () => {
      const pipeline = await createPipeline('With Stages');

      const res = await request(app)
        .post(`/api/pipelines/${pipeline._id}/stages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Qualification', order: 1, probability: 25 });
      expect(res.status).toBe(200);
      expect(res.body.stages).toBeDefined();
      expect(res.body.stages.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Deals ────────────────────────────────────────────────────
  describe('POST /api/deals', () => {
    it('should create a deal', async () => {
      const pipeline = await createPipeline('Deal Pipeline');
      const res = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Big Deal',
          pipeline_id: pipeline._id,
          tenant_id: tenantId,
          value: 50000,
          probability: 60,
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Big Deal');
    });
  });

  describe('GET /api/deals', () => {
    it('should return paginated deals', async () => {
      const pipeline = await createPipeline('List Pipeline');
      await request(app).post('/api/deals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Deal A', pipeline_id: pipeline._id, tenant_id: tenantId, value: 1000 });
      await request(app).post('/api/deals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Deal B', pipeline_id: pipeline._id, tenant_id: tenantId, value: 2000 });

      const res = await request(app).get('/api/deals').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter deals by search', async () => {
      const pipeline = await createPipeline('Search Pipeline');
      await request(app).post('/api/deals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Alpha Deal', pipeline_id: pipeline._id, tenant_id: tenantId });
      await request(app).post('/api/deals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Beta Deal', pipeline_id: pipeline._id, tenant_id: tenantId });

      const res = await request(app).get('/api/deals?search=Alpha').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alpha Deal');
    });
  });

  describe('GET /api/deals/:id', () => {
    it('should return a deal by ID', async () => {
      const pipeline = await createPipeline('GetById Pipeline');
      const created = await request(app).post('/api/deals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Get Me', pipeline_id: pipeline._id, tenant_id: tenantId });
      const res = await request(app).get(`/api/deals/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Get Me');
    });

    it('should return 404 for non-existent deal', async () => {
      const res = await request(app).get(`/api/deals/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Deal stage transition', () => {
    it('should update deal stage', async () => {
      const pipeline = await createPipeline('Stage Pipeline');
      const deal = await request(app).post('/api/deals').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Stage Deal', pipeline_id: pipeline._id, tenant_id: tenantId, value: 10000 });

      const res = await request(app)
        .post(`/api/deals/${deal.body._id}/stage`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stage_name: 'Negotiation' });
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/deals');
      expect(res.status).toBe(401);
    });
  });
});
