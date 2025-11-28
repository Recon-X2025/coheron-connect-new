import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ========== BANK ACCOUNTS ==========

// Get all bank accounts
router.get('/accounts', async (req, res) => {
  try {
    const { is_active } = req.query;
    let query = `
      SELECT b.*, 
             j.name as journal_name,
             a.code as account_code,
             a.name as account_name
      FROM account_bank_account b
      LEFT JOIN account_journal j ON b.journal_id = j.id
      LEFT JOIN account_account a ON b.account_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (is_active !== undefined) {
      query += ` AND b.is_active = $1`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY b.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create bank account
router.post('/accounts', async (req, res) => {
  try {
    const {
      name,
      bank_name,
      account_number,
      routing_number,
      iban,
      swift_code,
      account_type,
      currency_id,
      journal_id,
      account_id,
      balance_start,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO account_bank_account 
       (name, bank_name, account_number, routing_number, iban, swift_code, account_type, 
        currency_id, journal_id, account_id, balance_start, balance_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING *`,
      [
        name,
        bank_name || null,
        account_number || null,
        routing_number || null,
        iban || null,
        swift_code || null,
        account_type || 'checking',
        currency_id || null,
        journal_id || null,
        account_id || null,
        balance_start || 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bank account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== BANK STATEMENTS ==========

// Get all bank statements
router.get('/statements', async (req, res) => {
  try {
    const { bank_account_id, state, date_from, date_to } = req.query;
    let query = `
      SELECT s.*, 
             b.name as bank_account_name,
             b.account_number
      FROM account_bank_statement s
      LEFT JOIN account_bank_account b ON s.bank_account_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (bank_account_id) {
      query += ` AND s.bank_account_id = $${paramCount++}`;
      params.push(bank_account_id);
    }

    if (state) {
      query += ` AND s.state = $${paramCount++}`;
      params.push(state);
    }

    if (date_from) {
      query += ` AND s.date_start >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND s.date_end <= $${paramCount++}`;
      params.push(date_to);
    }

    query += ' ORDER BY s.date_start DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bank statements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statement by ID with lines
router.get('/statements/:id', async (req, res) => {
  try {
    const statementResult = await pool.query(
      `SELECT s.*, b.name as bank_account_name
       FROM account_bank_statement s
       LEFT JOIN account_bank_account b ON s.bank_account_id = b.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (statementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bank statement not found' });
    }

    const linesResult = await pool.query(
      `SELECT l.*, 
              p.name as partner_name,
              m.name as move_name
       FROM account_bank_statement_line l
       LEFT JOIN partners p ON l.partner_id = p.id
       LEFT JOIN account_move m ON l.move_id = m.id
       WHERE l.statement_id = $1
       ORDER BY l.date, l.id`,
      [req.params.id]
    );

    res.json({
      ...statementResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching bank statement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create bank statement
router.post('/statements', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      name,
      bank_account_id,
      date_start,
      date_end,
      balance_start,
      lines,
      imported_file_path,
    } = req.body;

    // Calculate balance_end from lines
    let balanceEnd = balance_start;
    if (lines && lines.length > 0) {
      for (const line of lines) {
        balanceEnd += parseFloat(line.amount || 0);
      }
    }

    // Create statement
    const statementResult = await client.query(
      `INSERT INTO account_bank_statement 
       (name, bank_account_id, date_start, date_end, balance_start, balance_end, imported_file_path, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
       RETURNING *`,
      [
        name,
        bank_account_id,
        date_start,
        date_end,
        balance_start,
        balanceEnd,
        imported_file_path || null,
      ]
    );

    const statementId = statementResult.rows[0].id;

    // Create statement lines
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await client.query(
          `INSERT INTO account_bank_statement_line 
           (statement_id, date, name, amount, partner_id, ref, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            statementId,
            line.date || date_start,
            line.name || '',
            line.amount || 0,
            line.partner_id || null,
            line.ref || null,
            line.note || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete statement
    const completeResult = await pool.query(
      'SELECT * FROM account_bank_statement WHERE id = $1',
      [statementId]
    );

    const linesResult = await pool.query(
      'SELECT * FROM account_bank_statement_line WHERE statement_id = $1 ORDER BY date, id',
      [statementId]
    );

    res.status(201).json({
      ...completeResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating bank statement:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// Reconcile statement line
router.post('/statements/:statementId/lines/:lineId/reconcile', async (req, res) => {
  try {
    const { move_id, payment_id, receipt_id } = req.body;

    const result = await pool.query(
      `UPDATE account_bank_statement_line 
       SET reconciled = true, move_id = $1, payment_id = $2, receipt_id = $3
       WHERE id = $4 AND statement_id = $5
       RETURNING *`,
      [move_id || null, payment_id || null, receipt_id || null, req.params.lineId, req.params.statementId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Statement line not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error reconciling statement line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm statement (finalize reconciliation)
router.post('/statements/:id/confirm', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE account_bank_statement 
       SET state = 'confirm', balance_end_real = balance_end, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND state = 'open'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Statement not found or cannot be confirmed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error confirming statement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

