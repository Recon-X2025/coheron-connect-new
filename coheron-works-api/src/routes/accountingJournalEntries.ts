import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all journal entries
router.get('/', async (req, res) => {
  try {
    const { journal_id, state, date_from, date_to, partner_id, search } = req.query;
    let query = `
      SELECT m.*, 
             j.name as journal_name,
             j.code as journal_code,
             p.name as partner_name
      FROM account_move m
      LEFT JOIN account_journal j ON m.journal_id = j.id
      LEFT JOIN partners p ON m.partner_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (journal_id) {
      query += ` AND m.journal_id = $${paramCount++}`;
      params.push(journal_id);
    }

    if (state) {
      query += ` AND m.state = $${paramCount++}`;
      params.push(state);
    }

    if (date_from) {
      query += ` AND m.date >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND m.date <= $${paramCount++}`;
      params.push(date_to);
    }

    if (partner_id) {
      query += ` AND m.partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (search) {
      query += ` AND (m.name ILIKE $${paramCount} OR m.ref ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY m.date DESC, m.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get journal entry by ID with lines
router.get('/:id', async (req, res) => {
  try {
    const moveResult = await pool.query(
      `SELECT m.*, 
              j.name as journal_name,
              j.code as journal_code,
              p.name as partner_name
       FROM account_move m
       LEFT JOIN account_journal j ON m.journal_id = j.id
       LEFT JOIN partners p ON m.partner_id = p.id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (moveResult.rows.length === 0) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    const linesResult = await pool.query(
      `SELECT l.*, 
              a.code as account_code,
              a.name as account_name,
              p.name as partner_name
       FROM account_move_line l
       LEFT JOIN account_account a ON l.account_id = a.id
       LEFT JOIN partners p ON l.partner_id = p.id
       WHERE l.move_id = $1
       ORDER BY l.id`,
      [req.params.id]
    );

    res.json({
      ...moveResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create journal entry
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      journal_id,
      date,
      ref,
      move_type,
      partner_id,
      currency_id,
      lines,
    } = req.body;

    // Generate journal entry number
    const journalResult = await client.query(
      'SELECT code FROM account_journal WHERE id = $1',
      [journal_id]
    );
    if (journalResult.rows.length === 0) {
      throw new Error('Journal not found');
    }

    const journalCode = journalResult.rows[0].code;
    const dateStr = new Date(date).toISOString().slice(0, 10).replace(/-/g, '');
    const name = `${journalCode}/${dateStr}/${Date.now().toString().slice(-6)}`;

    // Calculate total
    let amountTotal = 0;
    if (lines && lines.length > 0) {
      lines.forEach((line: any) => {
        amountTotal += parseFloat(line.debit || 0) - parseFloat(line.credit || 0);
      });
    }

    // Create move
    const moveResult = await client.query(
      `INSERT INTO account_move 
       (name, journal_id, date, ref, move_type, partner_id, amount_total, currency_id, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
       RETURNING *`,
      [name, journal_id, date, ref || null, move_type || 'entry', partner_id || null, amountTotal, currency_id || null]
    );

    const moveId = moveResult.rows[0].id;

    // Create move lines
    if (lines && lines.length > 0) {
      for (const line of lines) {
        const balance = parseFloat(line.debit || 0) - parseFloat(line.credit || 0);
        await client.query(
          `INSERT INTO account_move_line 
           (move_id, account_id, partner_id, name, debit, credit, balance, date, date_maturity, 
            cost_center_id, project_id, product_id, tax_ids)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            moveId,
            line.account_id,
            line.partner_id || null,
            line.name || '',
            line.debit || 0,
            line.credit || 0,
            balance,
            line.date || date,
            line.date_maturity || null,
            line.cost_center_id || null,
            line.project_id || null,
            line.product_id || null,
            line.tax_ids || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete entry with lines
    const completeResult = await pool.query(
      `SELECT m.*, 
              j.name as journal_name,
              j.code as journal_code
       FROM account_move m
       LEFT JOIN account_journal j ON m.journal_id = j.id
       WHERE m.id = $1`,
      [moveId]
    );

    const linesResult = await pool.query(
      `SELECT l.*, a.code as account_code, a.name as account_name
       FROM account_move_line l
       LEFT JOIN account_account a ON l.account_id = a.id
       WHERE l.move_id = $1
       ORDER BY l.id`,
      [moveId]
    );

    res.status(201).json({
      ...completeResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating journal entry:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update journal entry
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { date, ref, partner_id, lines } = req.body;
    const moveId = req.params.id;

    // Check if entry is posted
    const moveCheck = await client.query(
      'SELECT state FROM account_move WHERE id = $1',
      [moveId]
    );

    if (moveCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    if (moveCheck.rows[0].state === 'posted') {
      return res.status(400).json({ error: 'Cannot modify posted entry' });
    }

    // Update move
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (date !== undefined) {
      updates.push(`date = $${paramCount++}`);
      params.push(date);
    }
    if (ref !== undefined) {
      updates.push(`ref = $${paramCount++}`);
      params.push(ref);
    }
    if (partner_id !== undefined) {
      updates.push(`partner_id = $${paramCount++}`);
      params.push(partner_id);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(moveId);
      await client.query(
        `UPDATE account_move SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        params
      );
    }

    // Update lines if provided
    if (lines !== undefined) {
      // Delete existing lines
      await client.query('DELETE FROM account_move_line WHERE move_id = $1', [moveId]);

      // Insert new lines
      for (const line of lines) {
        const balance = parseFloat(line.debit || 0) - parseFloat(line.credit || 0);
        await client.query(
          `INSERT INTO account_move_line 
           (move_id, account_id, partner_id, name, debit, credit, balance, date, date_maturity,
            cost_center_id, project_id, product_id, tax_ids)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            moveId,
            line.account_id,
            line.partner_id || null,
            line.name || '',
            line.debit || 0,
            line.credit || 0,
            balance,
            line.date || date,
            line.date_maturity || null,
            line.cost_center_id || null,
            line.project_id || null,
            line.product_id || null,
            line.tax_ids || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated entry
    const result = await pool.query(
      `SELECT m.*, j.name as journal_name, j.code as journal_code
       FROM account_move m
       LEFT JOIN account_journal j ON m.journal_id = j.id
       WHERE m.id = $1`,
      [moveId]
    );

    const linesResult = await pool.query(
      `SELECT l.*, a.code as account_code, a.name as account_name
       FROM account_move_line l
       LEFT JOIN account_account a ON l.account_id = a.id
       WHERE l.move_id = $1
       ORDER BY l.id`,
      [moveId]
    );

    res.json({
      ...result.rows[0],
      lines: linesResult.rows,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating journal entry:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// Post journal entry
router.post('/:id/post', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const moveId = req.params.id;

    // Verify entry exists and is in draft
    const moveResult = await client.query(
      'SELECT * FROM account_move WHERE id = $1',
      [moveId]
    );

    if (moveResult.rows.length === 0) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    if (moveResult.rows[0].state !== 'draft') {
      return res.status(400).json({ error: 'Entry is not in draft state' });
    }

    // Verify lines balance (debits = credits)
    const linesResult = await client.query(
      `SELECT SUM(debit) as total_debit, SUM(credit) as total_credit
       FROM account_move_line
       WHERE move_id = $1`,
      [moveId]
    );

    const totalDebit = parseFloat(linesResult.rows[0].total_debit || 0);
    const totalCredit = parseFloat(linesResult.rows[0].total_credit || 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ 
        error: 'Entry is not balanced',
        details: { total_debit: totalDebit, total_credit: totalCredit }
      });
    }

    // Update state to posted
    await client.query(
      `UPDATE account_move 
       SET state = 'posted', 
           posted_at = CURRENT_TIMESTAMP,
           posted_by = $1
       WHERE id = $2`,
      [req.body.user_id || 1, moveId] // TODO: Get from auth
    );

    await client.query('COMMIT');

    const updatedResult = await pool.query(
      'SELECT * FROM account_move WHERE id = $1',
      [moveId]
    );

    res.json(updatedResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error posting journal entry:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// Cancel journal entry
router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE account_move 
       SET state = 'cancel', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND state = 'posted'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journal entry not found or cannot be cancelled' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cancelling journal entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete journal entry
router.delete('/:id', async (req, res) => {
  try {
    const moveCheck = await pool.query(
      'SELECT state FROM account_move WHERE id = $1',
      [req.params.id]
    );

    if (moveCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    if (moveCheck.rows[0].state === 'posted') {
      return res.status(400).json({ error: 'Cannot delete posted entry' });
    }

    const result = await pool.query(
      'DELETE FROM account_move WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

