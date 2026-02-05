import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Platform – Reports API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const tenantId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('reports-test@coheron.com', 'Test@Pass123!');
  });

  describe('POST /api/reports', () => {
    it('should create a report', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sales Summary',
          module: 'sales',
          entity: 'sale_orders',
          tenant_id: tenantId,
          columns: [{ field: 'name', label: 'Order Name', type: 'string' }],
          filters: [{ field: 'status', operator: 'eq', value: 'confirmed' }],
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Sales Summary');
    });
  });

  describe('GET /api/reports', () => {
    it('should return paginated reports', async () => {
      await request(app).post('/api/reports').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Report A', module: 'crm', entity: 'leads', tenant_id: tenantId });
      await request(app).post('/api/reports').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Report B', module: 'hr', entity: 'employees', tenant_id: tenantId });

      const res = await request(app).get('/api/reports').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should return a report by ID', async () => {
      const created = await request(app).post('/api/reports').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Get Report', module: 'inventory', entity: 'products', tenant_id: tenantId });
      const res = await request(app).get(`/api/reports/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Get Report');
    });

    it('should return 404 for non-existent report', async () => {
      const res = await request(app).get(`/api/reports/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/reports/:id', () => {
    it('should update a report', async () => {
      const created = await request(app).post('/api/reports').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Old Report', module: 'accounting', entity: 'journal_entries', tenant_id: tenantId });
      const res = await request(app)
        .put(`/api/reports/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Report' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Report');
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('should delete a report', async () => {
      const created = await request(app).post('/api/reports').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Delete Report', module: 'support', entity: 'tickets', tenant_id: tenantId });
      const res = await request(app).delete(`/api/reports/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/reports');
      expect(res.status).toBe(401);
    });
  });
});
