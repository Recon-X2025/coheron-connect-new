import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';

describe('Payroll API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const employeeId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('payroll-test@coheron.com', 'Test@Pass123!');
  });

  // ── Salary Structures ─────────────────────────────────────────
  describe('POST /api/payroll/salary-structure', () => {
    it('should create a salary component', async () => {
      const res = await request(app)
        .post('/api/payroll/salary-structure')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employee_id: employeeId,
          component_type: 'earning',
          component_name: 'Basic Salary',
          amount: 50000,
          calculation_type: 'fixed',
          percentage: 0,
        });
      expect(res.status).toBe(201);
      expect(res.body.component_name).toBe('Basic Salary');
    });
  });

  describe('GET /api/payroll/salary-structure/:employee_id', () => {
    it('should list salary components for employee', async () => {
      await request(app).post('/api/payroll/salary-structure').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, component_type: 'earning', component_name: 'Basic', amount: 50000, calculation_type: 'fixed', percentage: 0 });
      await request(app).post('/api/payroll/salary-structure').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, component_type: 'earning', component_name: 'HRA', amount: 20000, calculation_type: 'percentage', percentage: 40 });

      const res = await request(app)
        .get(`/api/payroll/salary-structure/${employeeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PUT /api/payroll/salary-structure/:id', () => {
    it('should update a salary component', async () => {
      const created = await request(app).post('/api/payroll/salary-structure').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, component_type: 'earning', component_name: 'Bonus', amount: 5000, calculation_type: 'fixed', percentage: 0 });

      const res = await request(app)
        .put(`/api/payroll/salary-structure/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 8000 });
      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(8000);
    });
  });

  describe('DELETE /api/payroll/salary-structure/:id', () => {
    it('should delete a salary component', async () => {
      const created = await request(app).post('/api/payroll/salary-structure').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, component_type: 'deduction', component_name: 'PF', amount: 1800, calculation_type: 'fixed', percentage: 0 });
      const res = await request(app).delete(`/api/payroll/salary-structure/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Payslips ──────────────────────────────────────────────────
  describe('POST /api/payroll/payslips', () => {
    it('should create a payslip', async () => {
      const res = await request(app)
        .post('/api/payroll/payslips')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employee_id: employeeId,
          name: 'January 2025 Payslip',
          date_from: '2025-01-01',
          date_to: '2025-01-31',
          basic_wage: 50000,
          gross_wage: 70000,
          net_wage: 60000,
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('January 2025 Payslip');
      expect(res.body.basic_wage).toBe(50000);
    });
  });

  describe('GET /api/payroll/payslips', () => {
    it('should list payslips', async () => {
      await request(app).post('/api/payroll/payslips').set('Authorization', `Bearer ${token}`)
        .send({ employee_id: employeeId, name: 'PS-1', date_from: '2025-01-01', date_to: '2025-01-31', basic_wage: 50000, gross_wage: 70000, net_wage: 60000 });

      const res = await request(app).get('/api/payroll/payslips').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Stats ─────────────────────────────────────────────────────
  describe('GET /api/payroll/stats', () => {
    it('should return payroll statistics', async () => {
      const res = await request(app).get('/api/payroll/stats').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total_employees');
      expect(res.body).toHaveProperty('this_month_payroll');
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/payroll/payslips');
      expect(res.status).toBe(401);
    });
  });
});
