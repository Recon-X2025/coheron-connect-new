import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';
import AccountJournal from '../src/models/AccountJournal.js';

describe('Journal Entries API', () => {
  let token: string;
  let journalId: string;
  const accountId1 = new mongoose.Types.ObjectId().toString();
  const accountId2 = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('journal-test@coheron.com', 'Test@Pass123!');
  });

  beforeEach(async () => {
    const journal = await AccountJournal.create({
      name: 'General Journal',
      code: 'GEN',
      type: 'general',
    });
    journalId = journal._id.toString();
  });

  function balancedEntry() {
    return {
      journal_id: journalId,
      date: '2025-01-15',
      ref: 'Test Entry',
      lines: [
        { account_id: accountId1, debit: 1000, credit: 0, name: 'Debit line' },
        { account_id: accountId2, debit: 0, credit: 1000, name: 'Credit line' },
      ],
    };
  }

  function unbalancedEntry() {
    return {
      journal_id: journalId,
      date: '2025-01-15',
      ref: 'Unbalanced Entry',
      lines: [
        { account_id: accountId1, debit: 1000, credit: 0, name: 'Debit line' },
        { account_id: accountId2, debit: 0, credit: 500, name: 'Credit line' },
      ],
    };
  }

  describe('POST /api/accounting/journal-entries', () => {
    it('should create a balanced journal entry in draft state', async () => {
      const res = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send(balancedEntry());

      expect(res.status).toBe(201);
      expect(res.body.state).toBe('draft');
      expect(res.body.lines).toHaveLength(2);
      expect(res.body.lines[0].debit).toBe(1000);
      expect(res.body.lines[1].credit).toBe(1000);
    });

    it('should create an unbalanced entry (validation only on post)', async () => {
      const res = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send(unbalancedEntry());

      expect(res.status).toBe(201);
      expect(res.body.state).toBe('draft');
    });
  });

  describe('POST /api/accounting/journal-entries/:id/post', () => {
    it('should post a balanced journal entry', async () => {
      const created = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send(balancedEntry());
      expect(created.status).toBe(201);

      const res = await request(app)
        .post(`/api/accounting/journal-entries/${created.body._id}/post`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.state).toBe('posted');
    });

    it('should reject posting an unbalanced entry', async () => {
      const created = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send(unbalancedEntry());
      expect(created.status).toBe(201);

      const res = await request(app)
        .post(`/api/accounting/journal-entries/${created.body._id}/post`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Entry is not balanced');
      expect(res.body.details.total_debit).toBe(1000);
      expect(res.body.details.total_credit).toBe(500);
    });

    it('should reject posting an already-posted entry', async () => {
      const created = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send(balancedEntry());
      expect(created.status).toBe(201);

      const posted = await request(app)
        .post(`/api/accounting/journal-entries/${created.body._id}/post`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(posted.status).toBe(200);
      expect(posted.body.state).toBe('posted');

      const res = await request(app)
        .post(`/api/accounting/journal-entries/${created.body._id}/post`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Entry is not in draft state');
    });
  });

  describe('PUT /api/accounting/journal-entries/:id', () => {
    it('should reject modifying a posted entry', async () => {
      const created = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send(balancedEntry());

      await request(app)
        .post(`/api/accounting/journal-entries/${created.body._id}/post`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .put(`/api/accounting/journal-entries/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ref: 'Modified ref' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot modify posted entry');
    });
  });

  describe('DELETE /api/accounting/journal-entries/:id', () => {
    it('should reject deleting a posted entry', async () => {
      const created = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send(balancedEntry());

      await request(app)
        .post(`/api/accounting/journal-entries/${created.body._id}/post`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .delete(`/api/accounting/journal-entries/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot delete posted entry');
    });

    it('should allow deleting a draft entry', async () => {
      const created = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send(balancedEntry());

      const res = await request(app)
        .delete(`/api/accounting/journal-entries/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
