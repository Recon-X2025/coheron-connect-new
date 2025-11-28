import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ========== CUSTOMERS ==========

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    const { search, is_active, credit_hold } = req.query;
    let query = `
      SELECT c.*, 
             p.name as partner_name, 
             p.email, 
             p.phone, 
             p.company,
             COALESCE(SUM(i.amount_residual), 0) as total_outstanding
      FROM account_customer c
      JOIN partners p ON c.partner_id = p.id
      LEFT JOIN invoices i ON i.partner_id = p.id AND i.payment_state != 'paid'
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (p.name ILIKE $${paramCount} OR c.customer_code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (is_active !== undefined) {
      query += ` AND c.is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (credit_hold !== undefined) {
      query += ` AND c.credit_hold = $${paramCount++}`;
      params.push(credit_hold === 'true');
    }

    query += ' GROUP BY c.id, p.id ORDER BY p.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer aging
router.get('/customers/:id/aging', async (req, res) => {
  try {
    const customerResult = await pool.query(
      'SELECT partner_id FROM account_customer WHERE id = $1',
      [req.params.id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const partnerId = customerResult.rows[0].partner_id;

    const agingResult = await pool.query(
      `SELECT 
        invoice_date,
        name as invoice_number,
        amount_total,
        amount_residual,
        due_date,
        CASE 
          WHEN due_date < CURRENT_DATE - INTERVAL '90 days' THEN 'over_90'
          WHEN due_date < CURRENT_DATE - INTERVAL '60 days' THEN '60_90'
          WHEN due_date < CURRENT_DATE - INTERVAL '30 days' THEN '30_60'
          WHEN due_date < CURRENT_DATE THEN '0_30'
          ELSE 'current'
        END as aging_bucket
       FROM invoices
       WHERE partner_id = $1 
         AND payment_state != 'paid'
         AND amount_residual > 0
       ORDER BY due_date ASC`,
      [partnerId]
    );

    res.json(agingResult.rows);
  } catch (error) {
    console.error('Error fetching customer aging:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== RECEIPTS ==========

// Get all receipts
router.get('/receipts', async (req, res) => {
  try {
    const { customer_id, invoice_id, state, date_from, date_to } = req.query;
    let query = `
      SELECT r.*, 
             c.customer_code,
             p.name as customer_name,
             i.name as invoice_number
      FROM account_receipt r
      LEFT JOIN account_customer c ON r.customer_id = c.id
      LEFT JOIN partners p ON c.partner_id = p.id
      LEFT JOIN invoices i ON r.invoice_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (customer_id) {
      query += ` AND r.customer_id = $${paramCount++}`;
      params.push(customer_id);
    }

    if (invoice_id) {
      query += ` AND r.invoice_id = $${paramCount++}`;
      params.push(invoice_id);
    }

    if (state) {
      query += ` AND r.state = $${paramCount++}`;
      params.push(state);
    }

    if (date_from) {
      query += ` AND r.payment_date >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND r.payment_date <= $${paramCount++}`;
      params.push(date_to);
    }

    query += ' ORDER BY r.payment_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipt by ID
router.get('/receipts/:id', async (req, res) => {
  try {
    const receiptResult = await pool.query(
      `SELECT r.*, 
              c.customer_code,
              p.name as customer_name
       FROM account_receipt r
       LEFT JOIN account_customer c ON r.customer_id = c.id
       LEFT JOIN partners p ON c.partner_id = p.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Get linked invoices
    const invoicesResult = await pool.query(
      `SELECT rel.*, i.name as invoice_number, i.amount_total, i.amount_residual
       FROM account_receipt_invoice_rel rel
       JOIN invoices i ON rel.invoice_id = i.id
       WHERE rel.receipt_id = $1`,
      [req.params.id]
    );

    res.json({
      ...receiptResult.rows[0],
      invoices: invoicesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create receipt
router.post('/receipts', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      customer_id,
      invoice_id,
      amount,
      currency_id,
      payment_date,
      payment_method,
      journal_id,
      communication,
      invoice_ids, // Array of invoice IDs to apply payment to
    } = req.body;

    // Generate receipt number
    const dateStr = new Date(payment_date).toISOString().slice(0, 10).replace(/-/g, '');
    const name = `REC/${dateStr}/${Date.now().toString().slice(-6)}`;

    // Create receipt
    const receiptResult = await client.query(
      `INSERT INTO account_receipt 
       (name, customer_id, invoice_id, amount, currency_id, payment_date, payment_method, journal_id, communication, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
       RETURNING *`,
      [
        name,
        customer_id,
        invoice_id || null,
        amount,
        currency_id || null,
        payment_date,
        payment_method || 'bank_transfer',
        journal_id || null,
        communication || null,
      ]
    );

    const receiptId = receiptResult.rows[0].id;

    // Link to invoices if provided
    if (invoice_ids && invoice_ids.length > 0) {
      let remainingAmount = amount;
      for (const invId of invoice_ids) {
        // Get invoice residual
        const invResult = await client.query(
          'SELECT amount_residual FROM invoices WHERE id = $1',
          [invId]
        );

        if (invResult.rows.length > 0) {
          const invoiceResidual = parseFloat(invResult.rows[0].amount_residual || 0);
          const applyAmount = Math.min(remainingAmount, invoiceResidual);

          await client.query(
            'INSERT INTO account_receipt_invoice_rel (receipt_id, invoice_id, amount) VALUES ($1, $2, $3)',
            [receiptId, invId, applyAmount]
          );

          // Update invoice residual
          await client.query(
            `UPDATE invoices 
             SET amount_residual = amount_residual - $1,
                 payment_state = CASE 
                   WHEN amount_residual - $1 <= 0 THEN 'paid'
                   ELSE 'partial'
                 END
             WHERE id = $2`,
            [applyAmount, invId]
          );

          remainingAmount -= applyAmount;
          if (remainingAmount <= 0) break;
        }
      }
    }

    await client.query('COMMIT');

    const completeResult = await pool.query(
      'SELECT * FROM account_receipt WHERE id = $1',
      [receiptId]
    );

    res.status(201).json(completeResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// Post receipt
router.post('/receipts/:id/post', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE account_receipt 
       SET state = 'posted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND state = 'draft'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found or cannot be posted' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error posting receipt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== AR AGING REPORT ==========

router.get('/aging', async (req, res) => {
  try {
    const { date_as_of } = req.query;
    const asOfDate = date_as_of || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        i.partner_id,
        p.name as customer_name,
        i.name as invoice_number,
        i.invoice_date,
        i.due_date,
        i.amount_total,
        i.amount_residual,
        CASE 
          WHEN i.due_date < $1::date - INTERVAL '90 days' THEN 'over_90'
          WHEN i.due_date < $1::date - INTERVAL '60 days' THEN '60_90'
          WHEN i.due_date < $1::date - INTERVAL '30 days' THEN '30_60'
          WHEN i.due_date < $1::date THEN '0_30'
          ELSE 'current'
        END as aging_bucket,
        CASE 
          WHEN i.due_date < $1::date - INTERVAL '90 days' THEN i.amount_residual
          ELSE 0
        END as over_90,
        CASE 
          WHEN i.due_date >= $1::date - INTERVAL '90 days' 
           AND i.due_date < $1::date - INTERVAL '60 days' THEN i.amount_residual
          ELSE 0
        END as days_60_90,
        CASE 
          WHEN i.due_date >= $1::date - INTERVAL '60 days' 
           AND i.due_date < $1::date - INTERVAL '30 days' THEN i.amount_residual
          ELSE 0
        END as days_30_60,
        CASE 
          WHEN i.due_date >= $1::date - INTERVAL '30 days' 
           AND i.due_date < $1::date THEN i.amount_residual
          ELSE 0
        END as days_0_30,
        CASE 
          WHEN i.due_date >= $1::date THEN i.amount_residual
          ELSE 0
        END as current
       FROM invoices i
       JOIN partners p ON i.partner_id = p.id
       WHERE i.payment_state != 'paid'
         AND i.amount_residual > 0
         AND i.move_type = 'out_invoice'
       ORDER BY i.due_date ASC, p.name`,
      [asOfDate]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching AR aging:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

