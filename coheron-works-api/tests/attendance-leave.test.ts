import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Attendance & Leave API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const employeeId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('attendance-test@coheron.com', 'Test@Pass123!');
  });

  // ── Attendance ────────────────────────────────────────────────
  describe('POST /api/attendance', () => {
    it('should record attendance', async () => {
      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employee_id: employeeId,
          date: '2025-01-15',
          check_in: '2025-01-15T09:00:00Z',
          check_out: '2025-01-15T18:00:00Z',
          hours_worked: 9,
          status: 'present',
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('present');
    });
  });

  describe('GET /api/attendance', () => {
    it('should list attendance records', async () => {
      await request(app).post('/api/attendance').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, date: '2025-01-15', check_in: '09:00', check_out: '18:00', hours_worked: 9, status: 'present' });
      await request(app).post('/api/attendance').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, date: '2025-01-16', check_in: '09:00', check_out: '18:00', hours_worked: 9, status: 'present' });

      const res = await request(app).get('/api/attendance').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Leave Types ───────────────────────────────────────────────
  describe('POST /api/leave/types', () => {
    it('should create a leave type', async () => {
      const res = await request(app)
        .post('/api/leave/types')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sick Leave', code: 'SL', type: 'sick', max_days: 12, is_paid: true });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Sick Leave');
    });
  });

  describe('GET /api/leave/types', () => {
    it('should list leave types', async () => {
      await request(app).post('/api/leave/types').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Casual Leave', code: 'CL', type: 'casual', max_days: 10 });

      const res = await request(app).get('/api/leave/types').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE /api/leave/types/:id', () => {
    it('should delete a leave type', async () => {
      const created = await request(app).post('/api/leave/types').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Delete Type', code: 'DT', type: 'earned', max_days: 5 });
      const res = await request(app).delete(`/api/leave/types/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Leave Requests ────────────────────────────────────────────
  describe('POST /api/leave/requests', () => {
    it('should create a leave request', async () => {
      const res = await request(app)
        .post('/api/leave/requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employee_id: employeeId,
          leave_type: 'sick_leave',
          from_date: '2025-02-01',
          to_date: '2025-02-03',
          days: 3,
          reason: 'Flu',
          contact_during_leave: '+1234567890',
        });
      expect(res.status).toBe(201);
      expect(res.body.leave_type).toBe('sick_leave');
    });
  });

  describe('GET /api/leave/requests', () => {
    it('should list leave requests', async () => {
      await request(app).post('/api/leave/requests').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, leave_type: 'casual', from_date: '2025-03-01', to_date: '2025-03-02', days: 2, reason: 'Personal', contact_during_leave: '+1' });

      const res = await request(app).get('/api/leave/requests').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /api/leave/requests/:id/approve', () => {
    it('should approve a leave request', async () => {
      const created = await request(app).post('/api/leave/requests').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, leave_type: 'casual', from_date: '2025-04-01', to_date: '2025-04-02', days: 2, reason: 'Trip', contact_during_leave: '+1' });

      const res = await request(app)
        .put(`/api/leave/requests/${created.body._id}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'approved', approved_by: new mongoose.Types.ObjectId().toString() });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
    });
  });

  // ── Leave Balance ─────────────────────────────────────────────
  describe('GET /api/leave/balance/:employee_id', () => {
    it('should return leave balance for an employee', async () => {
      const res = await request(app)
        .get(`/api/leave/balance/${employeeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Auth guard ────────────────────────────────────────────────
  describe('Auth guard', () => {
    it('should return 401 without token for attendance', async () => {
      const res = await request(app).get('/api/attendance');
      expect(res.status).toBe(401);
    });
  });
});
