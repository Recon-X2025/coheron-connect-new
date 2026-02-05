import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, getAuthToken } from './helpers.js';

describe('Accounting – Chart of Accounts API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    token = await getAuthToken('coa-test@coheron.com', 'Test@Pass123!');
  });

  const sample = { code: '1000', name: 'Cash', account_type: 'asset' };

  describe('POST /api/accounting/chart-of-accounts', () => {
    it('should create an account', async () => {
      const res = await request(app)
        .post('/api/accounting/chart-of-accounts')
        .set('Authorization', `Bearer ${token}`)
        .send(sample);
      expect(res.status).toBe(201);
      expect(res.body.code).toBe('1000');
      expect(res.body.name).toBe('Cash');
    });
  });

  describe('GET /api/accounting/chart-of-accounts', () => {
    it('should list accounts', async () => {
      await request(app).post('/api/accounting/chart-of-accounts').set('Authorization', `Bearer ${token}`)
        .send(sample);
      await request(app).post('/api/accounting/chart-of-accounts').set('Authorization', `Bearer ${token}`)
        .send({ code: '2000', name: 'Accounts Payable', account_type: 'liability' });

      const res = await request(app).get('/api/accounting/chart-of-accounts').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by account_type', async () => {
      await request(app).post('/api/accounting/chart-of-accounts').set('Authorization', `Bearer ${token}`)
        .send({ code: '3000', name: 'Revenue', account_type: 'income' });

      const res = await request(app).get('/api/accounting/chart-of-accounts?account_type=income').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.every((a: any) => a.account_type === 'income')).toBe(true);
    });
  });

  describe('GET /api/accounting/chart-of-accounts/:id', () => {
    it('should return an account by ID', async () => {
      const created = await request(app).post('/api/accounting/chart-of-accounts').set('Authorization', `Bearer ${token}`)
        .send({ code: '1100', name: 'Bank', account_type: 'asset' });
      const res = await request(app).get(`/api/accounting/chart-of-accounts/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Bank');
    });

    it('should return 404 for non-existent account', async () => {
      const res = await request(app).get(`/api/accounting/chart-of-accounts/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/accounting/chart-of-accounts/:id', () => {
    it('should update an account', async () => {
      const created = await request(app).post('/api/accounting/chart-of-accounts').set('Authorization', `Bearer ${token}`)
        .send({ code: '1200', name: 'Petty Cash', account_type: 'asset' });
      const res = await request(app)
        .put(`/api/accounting/chart-of-accounts/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Petty Cash Updated' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Petty Cash Updated');
    });
  });

  describe('DELETE /api/accounting/chart-of-accounts/:id (soft-delete)', () => {
    it('should deprecate an account', async () => {
      const created = await request(app).post('/api/accounting/chart-of-accounts').set('Authorization', `Bearer ${token}`)
        .send({ code: '9999', name: 'Deprecated', account_type: 'asset' });
      const res = await request(app)
        .delete(`/api/accounting/chart-of-accounts/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/accounting/chart-of-accounts/:id/balance', () => {
    it('should return balance for an account', async () => {
      const created = await request(app).post('/api/accounting/chart-of-accounts').set('Authorization', `Bearer ${token}`)
        .send({ code: '1300', name: 'Balance Acct', account_type: 'asset' });
      const res = await request(app)
        .get(`/api/accounting/chart-of-accounts/${created.body._id}/balance`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('balance');
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/accounting/chart-of-accounts');
      expect(res.status).toBe(401);
    });
  });
});
