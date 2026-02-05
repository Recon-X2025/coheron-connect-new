import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Support – Tickets & Teams API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('support-test@coheron.com', 'Test@Pass123!');
  });

  // ── Teams ─────────────────────────────────────────────────────
  describe('POST /api/support/teams', () => {
    it('should create a support team', async () => {
      const res = await request(app)
        .post('/api/support/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Tier 1 Support', description: 'First line' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Tier 1 Support');
    });
  });

  describe('GET /api/support/teams', () => {
    it('should list support teams', async () => {
      await request(app).post('/api/support/teams').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Team Alpha' });

      const res = await request(app).get('/api/support/teams').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Tickets ───────────────────────────────────────────────────
  describe('POST /api/support/tickets', () => {
    it('should create a ticket', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subject: 'Login not working',
          description: 'Cannot login after password reset',
          priority: 'high',
          ticket_type: 'bug',
        });
      expect(res.status).toBe(201);
      expect(res.body.subject).toBe('Login not working');
      expect(res.body.ticket_number).toBeDefined();
    });
  });

  describe('GET /api/support/tickets', () => {
    it('should return paginated tickets', async () => {
      await request(app).post('/api/support/tickets').set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Ticket A', description: 'Desc A' });
      await request(app).post('/api/support/tickets').set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Ticket B', description: 'Desc B' });

      const res = await request(app).get('/api/support/tickets').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by search', async () => {
      await request(app).post('/api/support/tickets').set('Authorization', `Bearer ${token}`)
        .send({ subject: 'UniqueSearch123', description: 'find me' });

      const res = await request(app).get('/api/support/tickets?search=UniqueSearch123').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/support/tickets/:id', () => {
    it('should return a ticket by ID', async () => {
      const created = await request(app).post('/api/support/tickets').set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Get Ticket', description: 'Detail view' });
      const res = await request(app).get(`/api/support/tickets/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.subject).toBe('Get Ticket');
    });

    it('should return 404 for non-existent ticket', async () => {
      const res = await request(app).get(`/api/support/tickets/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/support/tickets/:id', () => {
    it('should update a ticket', async () => {
      const created = await request(app).post('/api/support/tickets').set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Update Me', description: 'original' });
      const res = await request(app)
        .put(`/api/support/tickets/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ priority: 'urgent' });
      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('urgent');
    });
  });

  describe('POST /api/support/tickets/:id/notes', () => {
    it('should add a note to a ticket', async () => {
      const created = await request(app).post('/api/support/tickets').set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Note Ticket', description: 'Add notes' });
      const res = await request(app)
        .post(`/api/support/tickets/${created.body._id}/notes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Investigated the issue', author_id: userId });
      expect(res.status).toBe(201);
    });
  });

  describe('POST /api/support/tickets/:id/escalate', () => {
    it('should escalate a ticket', async () => {
      const created = await request(app).post('/api/support/tickets').set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Escalate Ticket', description: 'Needs escalation' });
      const res = await request(app)
        .post(`/api/support/tickets/${created.body._id}/escalate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ level: 2, reason: 'Customer VIP' });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/support/tickets/:id', () => {
    it('should delete a ticket', async () => {
      const created = await request(app).post('/api/support/tickets').set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Delete Me', description: 'Bye' });
      const res = await request(app).delete(`/api/support/tickets/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/support/tickets');
      expect(res.status).toBe(401);
    });
  });
});
