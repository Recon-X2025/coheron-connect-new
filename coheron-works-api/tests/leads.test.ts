import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './helpers.js';

describe('Leads API', () => {
  const sampleLead = {
    name: 'Test Lead',
    email: 'lead@example.com',
    phone: '+1234567890',
    expected_revenue: 5000,
    probability: 50,
    stage: 'new',
    type: 'lead',
  };

  describe('POST /api/leads', () => {
    it('should create a lead', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send(sampleLead);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Lead');
      expect(res.body.email).toBe('lead@example.com');
      expect(res.body.stage).toBe('new');
    });
  });

  describe('GET /api/leads', () => {
    it('should return paginated leads', async () => {
      await request(app).post('/api/leads').send(sampleLead);
      await request(app).post('/api/leads').send({ ...sampleLead, name: 'Lead 2', email: 'lead2@example.com' });

      const res = await request(app).get('/api/leads');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by stage', async () => {
      await request(app).post('/api/leads').send(sampleLead);
      await request(app).post('/api/leads').send({ ...sampleLead, name: 'Qualified Lead', email: 'q@test.com', stage: 'qualified' });

      const res = await request(app).get('/api/leads?stage=qualified');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].stage).toBe('qualified');
    });

    it('should filter by search', async () => {
      await request(app).post('/api/leads').send(sampleLead);
      await request(app).post('/api/leads').send({ ...sampleLead, name: 'Other Person', email: 'other@xyz.com' });

      const res = await request(app).get('/api/leads?search=Test');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('should return a lead by ID', async () => {
      const created = await request(app).post('/api/leads').send(sampleLead);
      const res = await request(app).get(`/api/leads/${created.body._id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Lead');
    });

    it('should return 404 for non-existent lead', async () => {
      const res = await request(app).get('/api/leads/507f1f77bcf86cd799439011');
      expect(res.status).toBe(404);
    });
  });
});
