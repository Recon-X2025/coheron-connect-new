import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, getAuthToken } from './helpers.js';

describe('Marketing – Campaigns API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    token = await getAuthToken('campaigns-test@coheron.com', 'Test@Pass123!');
  });

  describe('POST /api/campaigns', () => {
    it('should create a campaign', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Summer Sale', campaign_type: 'email', state: 'draft' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Summer Sale');
    });
  });

  describe('GET /api/campaigns', () => {
    it('should return paginated campaigns', async () => {
      await request(app).post('/api/campaigns').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Campaign A' });
      await request(app).post('/api/campaigns').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Campaign B' });

      const res = await request(app).get('/api/campaigns').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by search', async () => {
      await request(app).post('/api/campaigns').set('Authorization', `Bearer ${token}`)
        .send({ name: 'UniqueXyzCampaign' });

      const res = await request(app).get('/api/campaigns?search=UniqueXyz').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/campaigns/:id', () => {
    it('should return a campaign by ID', async () => {
      const created = await request(app).post('/api/campaigns').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Get Campaign' });
      const res = await request(app).get(`/api/campaigns/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Get Campaign');
    });

    it('should return 404 for non-existent campaign', async () => {
      const res = await request(app).get(`/api/campaigns/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/campaigns/:id', () => {
    it('should update a campaign', async () => {
      const created = await request(app).post('/api/campaigns').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Old Campaign' });
      const res = await request(app)
        .put(`/api/campaigns/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Campaign' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Campaign');
    });
  });

  describe('DELETE /api/campaigns/:id', () => {
    it('should delete a campaign', async () => {
      const created = await request(app).post('/api/campaigns').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Delete Campaign' });
      const res = await request(app).delete(`/api/campaigns/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/campaigns');
      expect(res.status).toBe(401);
    });
  });
});
