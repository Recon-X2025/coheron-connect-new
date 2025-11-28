import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const { state, payment_state, search } = req.query;
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (state) {
      query += ` AND state = $${paramCount++}`;
      params.push(state);
    }

    if (payment_state) {
      query += ` AND payment_state = $${paramCount++}`;
      params.push(payment_state);
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    const {
      name,
      partner_id,
      invoice_date,
      amount_total,
      amount_residual,
      state,
      payment_state,
      move_type,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO invoices (name, partner_id, invoice_date, amount_total, amount_residual, state, payment_state, move_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        partner_id,
        invoice_date || new Date(),
        amount_total || 0,
        amount_residual || amount_total || 0,
        state || 'draft',
        payment_state || 'not_paid',
        move_type || 'out_invoice',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const { state, payment_state, amount_residual } = req.body;

    const result = await pool.query(
      `UPDATE invoices 
       SET state = COALESCE($1, state), 
           payment_state = COALESCE($2, payment_state),
           amount_residual = COALESCE($3, amount_residual)
       WHERE id = $4
       RETURNING *`,
      [state, payment_state, amount_residual, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

