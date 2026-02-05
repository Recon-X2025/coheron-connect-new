import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Employees API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const deptId = new mongoose.Types.ObjectId().toString();
  const managerId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('employees-test@coheron.com', 'Test@Pass123!');
  });

  const sampleEmployee = {
    employee_id: 'EMP-001',
    name: 'Jane Doe',
    work_email: 'jane@coheron.com',
    work_phone: '+1234567890',
    job_title: 'Software Engineer',
    department_id: deptId,
    manager_id: managerId,
    hire_date: '2024-01-15',
    employment_type: 'full_time',
  };

  describe('POST /api/employees', () => {
    it('should create an employee', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleEmployee);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Jane Doe');
      expect(res.body.employee_id).toBe('EMP-001');
    });
  });

  describe('GET /api/employees', () => {
    it('should return paginated employees', async () => {
      await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
        .send(sampleEmployee);
      await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
        .send({ ...sampleEmployee, employee_id: 'EMP-002', name: 'John Smith', work_email: 'john@coheron.com' });

      const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should return an employee by ID', async () => {
      const created = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
        .send(sampleEmployee);
      const res = await request(app).get(`/api/employees/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Jane Doe');
    });

    it('should return 404 for non-existent employee', async () => {
      const res = await request(app).get(`/api/employees/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update an employee', async () => {
      const created = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
        .send(sampleEmployee);
      const res = await request(app)
        .put(`/api/employees/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ job_title: 'Senior Engineer' });
      expect(res.status).toBe(200);
      expect(res.body.job_title).toBe('Senior Engineer');
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should delete an employee', async () => {
      const created = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
        .send(sampleEmployee);
      const res = await request(app).delete(`/api/employees/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const check = await request(app).get(`/api/employees/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(check.status).toBe(404);
    });
  });

  describe('GET /api/employees/:id/leave-balances', () => {
    it('should return leave balances for an employee', async () => {
      const created = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
        .send(sampleEmployee);
      const res = await request(app)
        .get(`/api/employees/${created.body._id}/leave-balances`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.leave_balances).toBeDefined();
    });

    it('should return 404 for non-existent employee leave balances', async () => {
      const res = await request(app).get(`/api/employees/${fakeId}/leave-balances`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/employees/:id/documents', () => {
    it('should add a document to an employee', async () => {
      const created = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
        .send(sampleEmployee);
      const res = await request(app)
        .post(`/api/employees/${created.body._id}/documents`)
        .set('Authorization', `Bearer ${token}`)
        .send({ document_type: 'id_proof', name: 'Passport', file_url: '/files/passport.pdf' });
      expect(res.status).toBe(201);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/employees');
      expect(res.status).toBe(401);
    });
  });
});
