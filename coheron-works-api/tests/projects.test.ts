import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Projects API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('projects-test@coheron.com', 'Test@Pass123!');
  });

  describe('POST /api/projects', () => {
    it('should create a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'ERP Rollout', description: 'Implement new ERP system' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('ERP Rollout');
      expect(res.body.code).toBeDefined();
    });
  });

  describe('GET /api/projects', () => {
    it('should return paginated projects', async () => {
      await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Project Alpha' });
      await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Project Beta' });

      const res = await request(app).get('/api/projects').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a project by ID', async () => {
      const created = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Fetch Project' });
      const res = await request(app).get(`/api/projects/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Fetch Project');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).get(`/api/projects/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update a project', async () => {
      const created = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Update Project' });
      const res = await request(app)
        .put(`/api/projects/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Project', status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Project');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', async () => {
      const created = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Delete Project' });
      const res = await request(app).delete(`/api/projects/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Stakeholders ──────────────────────────────────────────────
  describe('POST /api/projects/:id/stakeholders', () => {
    it('should add a stakeholder', async () => {
      const project = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Stakeholder Project' });
      const res = await request(app)
        .post(`/api/projects/${project.body._id}/stakeholders`)
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: userId, role: 'sponsor' });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/projects/:id/stakeholders', () => {
    it('should list stakeholders', async () => {
      const project = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
        .send({ name: 'List Stakeholders' });
      await request(app).post(`/api/projects/${project.body._id}/stakeholders`).set('Authorization', `Bearer ${token}`)
        .send({ user_id: userId, role: 'member' });
      const res = await request(app).get(`/api/projects/${project.body._id}/stakeholders`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Approvals ─────────────────────────────────────────────────
  describe('POST /api/projects/:id/approvals', () => {
    it('should request approval', async () => {
      const project = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Approval Project' });
      const res = await request(app)
        .post(`/api/projects/${project.body._id}/approvals`)
        .set('Authorization', `Bearer ${token}`)
        .send({ approval_type: 'budget', approver_id: userId, description: 'Budget approval needed' });
      expect(res.status).toBe(201);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });
  });
});
