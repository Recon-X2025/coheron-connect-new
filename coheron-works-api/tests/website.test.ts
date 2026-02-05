import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';
import { WebsiteSite } from '../src/models/WebsiteSite.js';

describe('Website API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    token = await getAuthToken('website-test@coheron.com', 'Test@Pass123!');
  });

  // ── Sites ────────────────────────────────────────────────────
  describe('POST /api/website/sites', () => {
    it('should create a website site', async () => {
      const res = await request(app)
        .post('/api/website/sites')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Main Store', domain: `store-${Date.now()}.coheron.com` });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Main Store');
    });
  });

  describe('GET /api/website/sites', () => {
    it('should return paginated sites', async () => {
      await WebsiteSite.create({ name: 'Site A', domain: `a-${Date.now()}.coheron.com` });
      await WebsiteSite.create({ name: 'Site B', domain: `b-${Date.now()}.coheron.com` });

      const res = await request(app).get('/api/website/sites').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  // ── Pages ────────────────────────────────────────────────────
  describe('POST /api/website', () => {
    it('should create a website page', async () => {
      const site = await WebsiteSite.create({ name: 'Page Site', domain: `pages-${Date.now()}.coheron.com` });
      const res = await request(app)
        .post('/api/website')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Home Page', url: '/home', slug: `home-${Date.now()}`, site_id: site._id.toString(), status: 'draft' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Home Page');
    });
  });

  describe('GET /api/website', () => {
    it('should return paginated pages', async () => {
      const res = await request(app).get('/api/website').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/website/:id', () => {
    it('should return a page by ID', async () => {
      const site = await WebsiteSite.create({ name: 'Get Site', domain: `get-${Date.now()}.coheron.com` });
      const created = await request(app).post('/api/website').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Detail Page', url: '/detail', slug: `detail-${Date.now()}`, site_id: site._id.toString() });
      const res = await request(app).get(`/api/website/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Detail Page');
    });

    it('should return 404 for non-existent page', async () => {
      const res = await request(app).get(`/api/website/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/website/:id', () => {
    it('should update a page', async () => {
      const site = await WebsiteSite.create({ name: 'Update Site', domain: `upd-${Date.now()}.coheron.com` });
      const created = await request(app).post('/api/website').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Old Page', url: '/old', slug: `old-${Date.now()}`, site_id: site._id.toString() });
      const res = await request(app)
        .put(`/api/website/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Page' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Page');
    });
  });

  describe('DELETE /api/website/:id', () => {
    it('should delete a page', async () => {
      const site = await WebsiteSite.create({ name: 'Del Site', domain: `del-${Date.now()}.coheron.com` });
      const created = await request(app).post('/api/website').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Delete Page', url: '/delete', slug: `del-${Date.now()}`, site_id: site._id.toString() });
      const res = await request(app).delete(`/api/website/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/website');
      expect(res.status).toBe(401);
    });
  });
});
