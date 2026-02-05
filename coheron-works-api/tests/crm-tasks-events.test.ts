import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('CRM Tasks & Events API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('crm-tasks-test@coheron.com', 'Test@Pass123!');
  });

  // ── Tasks ─────────────────────────────────────────────────────
  describe('POST /api/crm/tasks', () => {
    it('should create a CRM task', async () => {
      const res = await request(app)
        .post('/api/crm/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Follow up with client',
          task_type: 'call',
          assigned_to_id: userId,
          created_by_id: userId,
          priority: 'high',
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Follow up with client');
      expect(res.body.state).toBe('pending');
    });
  });

  describe('GET /api/crm/tasks', () => {
    it('should return paginated tasks', async () => {
      await request(app).post('/api/crm/tasks').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Task A', task_type: 'task', assigned_to_id: userId, created_by_id: userId });
      await request(app).post('/api/crm/tasks').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Task B', task_type: 'task', assigned_to_id: userId, created_by_id: userId });

      const res = await request(app).get('/api/crm/tasks').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter tasks by state', async () => {
      await request(app).post('/api/crm/tasks').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Pending Task', task_type: 'task', assigned_to_id: userId, created_by_id: userId, state: 'pending' });
      await request(app).post('/api/crm/tasks').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Done Task', task_type: 'task', assigned_to_id: userId, created_by_id: userId, state: 'done' });

      const res = await request(app).get('/api/crm/tasks?state=done').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.state === 'done')).toBe(true);
    });
  });

  describe('GET /api/crm/tasks/:id', () => {
    it('should return a task by ID', async () => {
      const created = await request(app).post('/api/crm/tasks').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Fetch Me', task_type: 'email', assigned_to_id: userId, created_by_id: userId });
      const res = await request(app).get(`/api/crm/tasks/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Fetch Me');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).get(`/api/crm/tasks/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/crm/tasks/:id', () => {
    it('should delete a task', async () => {
      const created = await request(app).post('/api/crm/tasks').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Delete Me', task_type: 'task', assigned_to_id: userId, created_by_id: userId });
      const res = await request(app).delete(`/api/crm/tasks/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Events ────────────────────────────────────────────────────
  describe('POST /api/crm/events', () => {
    it('should create an event', async () => {
      const res = await request(app)
        .post('/api/crm/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Product Demo',
          start_date: '2025-06-01T10:00:00Z',
          end_date: '2025-06-01T11:00:00Z',
          organizer_id: userId,
          created_by_id: userId,
          event_type: 'meeting',
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Product Demo');
    });
  });

  describe('GET /api/crm/events', () => {
    it('should return paginated events', async () => {
      await request(app).post('/api/crm/events').set('Authorization', `Bearer ${token}`)
        .send({ title: 'Event A', start_date: '2025-06-01', organizer_id: userId, created_by_id: userId });
      await request(app).post('/api/crm/events').set('Authorization', `Bearer ${token}`)
        .send({ title: 'Event B', start_date: '2025-06-02', organizer_id: userId, created_by_id: userId });

      const res = await request(app).get('/api/crm/events').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token for tasks', async () => {
      const res = await request(app).get('/api/crm/tasks');
      expect(res.status).toBe(401);
    });
  });
});
