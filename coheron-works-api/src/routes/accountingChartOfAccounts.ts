import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all accounts (Chart of Accounts)
router.get('/', async (req, res) => {
  try {
    const { account_type, parent_id, search, deprecated } = req.query;
    let query = `
      SELECT a.*, 
             (SELECT COUNT(*) FROM account_account WHERE parent_id = a.id) as child_count
      FROM account_account a
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (account_type) {
      query += ` AND a.account_type = $${paramCount++}`;
      params.push(account_type);
    }

    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === 'null') {
        query += ` AND a.parent_id IS NULL`;
      } else {
        query += ` AND a.parent_id = $${paramCount++}`;
        params.push(parent_id);
      }
    }

    if (search) {
      query += ` AND (a.code ILIKE $${paramCount} OR a.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (deprecated !== undefined) {
      query += ` AND a.deprecated = $${paramCount++}`;
      params.push(deprecated === 'true');
    }

    query += ' ORDER BY a.code';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get account by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM account_account WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create account
router.post('/', async (req, res) => {
  try {
    const {
      code,
      name,
      account_type,
      parent_id,
      internal_type,
      reconcile,
      currency_id,
      tag_ids,
      notes,
    } = req.body;

    // Calculate level based on parent
    let level = 0;
    if (parent_id) {
      const parentResult = await pool.query(
        'SELECT level FROM account_account WHERE id = $1',
        [parent_id]
      );
      if (parentResult.rows.length > 0) {
        level = parentResult.rows[0].level + 1;
      }
    }

    const result = await pool.query(
      `INSERT INTO account_account 
       (code, name, account_type, parent_id, level, internal_type, reconcile, currency_id, tag_ids, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        code,
        name,
        account_type,
        parent_id || null,
        level,
        internal_type || null,
        reconcile || false,
        currency_id || null,
        tag_ids || null,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating account:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Account code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update account
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      account_type,
      parent_id,
      internal_type,
      reconcile,
      deprecated,
      currency_id,
      tag_ids,
      notes,
    } = req.body;

    // Recalculate level if parent changed
    let level = null;
    if (parent_id !== undefined) {
      if (parent_id) {
        const parentResult = await pool.query(
          'SELECT level FROM account_account WHERE id = $1',
          [parent_id]
        );
        if (parentResult.rows.length > 0) {
          level = parentResult.rows[0].level + 1;
        }
      } else {
        level = 0;
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (account_type !== undefined) {
      updates.push(`account_type = $${paramCount++}`);
      params.push(account_type);
    }
    if (parent_id !== undefined) {
      updates.push(`parent_id = $${paramCount++}`);
      params.push(parent_id || null);
    }
    if (level !== null) {
      updates.push(`level = $${paramCount++}`);
      params.push(level);
    }
    if (internal_type !== undefined) {
      updates.push(`internal_type = $${paramCount++}`);
      params.push(internal_type);
    }
    if (reconcile !== undefined) {
      updates.push(`reconcile = $${paramCount++}`);
      params.push(reconcile);
    }
    if (deprecated !== undefined) {
      updates.push(`deprecated = $${paramCount++}`);
      params.push(deprecated);
    }
    if (currency_id !== undefined) {
      updates.push(`currency_id = $${paramCount++}`);
      params.push(currency_id);
    }
    if (tag_ids !== undefined) {
      updates.push(`tag_ids = $${paramCount++}`);
      params.push(tag_ids);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      params.push(notes);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(req.params.id);
    const query = `UPDATE account_account SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account (soft delete by setting deprecated)
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE account_account SET deprecated = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account deprecated successfully' });
  } catch (error) {
    console.error('Error deprecating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get account balance
router.get('/:id/balance', async (req, res) => {
  try {
    const { date_start, date_end } = req.query;
    const accountId = req.params.id;

    let query = `
      SELECT 
        COALESCE(SUM(debit), 0) as total_debit,
        COALESCE(SUM(credit), 0) as total_credit,
        COALESCE(SUM(debit) - SUM(credit), 0) as balance
      FROM account_move_line
      WHERE account_id = $1
    `;
    const params: any[] = [accountId];

    if (date_start) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(date_start);
    }
    if (date_end) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(date_end);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching account balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

