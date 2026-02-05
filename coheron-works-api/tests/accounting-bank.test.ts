import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';
import BankStatement from '../src/models/BankStatement.js';

describe('Accounting – Bank Management API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    token = await getAuthToken('bank-test@coheron.com', 'Test@Pass123!');
  });

  /** Helper: create a bank account */
  async function createBankAccount(name = 'Main Account') {
    const res = await request(app)
      .post('/api/accounting/bank/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, account_number: `ACC-${Date.now()}`, bank_name: 'Test Bank', account_type: 'checking' });
    return res.body;
  }

  // ── Bank Accounts ─────────────────────────────────────────────
  describe('POST /api/accounting/bank/accounts', () => {
    it('should create a bank account', async () => {
      const res = await request(app)
        .post('/api/accounting/bank/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Primary Account', account_number: 'BA-001', bank_name: 'HDFC', account_type: 'checking' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Primary Account');
    });
  });

  describe('GET /api/accounting/bank/accounts', () => {
    it('should return paginated bank accounts', async () => {
      await createBankAccount('Savings');
      await createBankAccount('Current');

      const res = await request(app).get('/api/accounting/bank/accounts').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  // ── Bank Statements ───────────────────────────────────────────
  describe('POST /api/accounting/bank/statements', () => {
    it('should create a bank statement', async () => {
      const account = await createBankAccount('Statement Acct');
      const res = await request(app)
        .post('/api/accounting/bank/statements')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Jan 2025 Statement',
          bank_account_id: account._id,
          date_start: '2025-01-01',
          date_end: '2025-01-31',
          balance_start: 100000,
          lines: [
            { date: '2025-01-05', description: 'Client Payment', amount: 50000 },
            { date: '2025-01-15', description: 'Rent', amount: -20000 },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.state).toBe('draft');
      expect(res.body.lines).toHaveLength(2);
    });
  });

  describe('GET /api/accounting/bank/statements', () => {
    it('should return paginated statements', async () => {
      const account = await createBankAccount('List Stmt Acct');
      await request(app).post('/api/accounting/bank/statements').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Stmt A', bank_account_id: account._id, date_start: '2025-01-01', date_end: '2025-01-31', balance_start: 0, lines: [] });

      const res = await request(app).get('/api/accounting/bank/statements').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/accounting/bank/statements/:id', () => {
    it('should return a statement by ID', async () => {
      const account = await createBankAccount('Get Stmt Acct');
      const created = await request(app).post('/api/accounting/bank/statements').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Fetch Stmt', bank_account_id: account._id, date_start: '2025-02-01', date_end: '2025-02-28', balance_start: 5000, lines: [] });

      const res = await request(app).get(`/api/accounting/bank/statements/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Fetch Stmt');
    });

    it('should return 404 for non-existent statement', async () => {
      const res = await request(app).get(`/api/accounting/bank/statements/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ── Confirm statement ─────────────────────────────────────────
  describe('POST /api/accounting/bank/statements/:id/confirm', () => {
    it('should confirm an open statement', async () => {
      const account = await createBankAccount('Confirm Acct');
      const created = await request(app).post('/api/accounting/bank/statements').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Confirm Stmt', bank_account_id: account._id, date_start: '2025-03-01', date_end: '2025-03-31', balance_start: 0, lines: [] });

      // Move statement to 'open' state (the create route always starts with 'draft')
      await BankStatement.findByIdAndUpdate(created.body._id, { state: 'open' });

      const res = await request(app)
        .post(`/api/accounting/bank/statements/${created.body._id}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('confirm');
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/accounting/bank/accounts').send({});
      expect(res.status).toBe(401);
    });
  });
});
