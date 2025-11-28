import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ========== VENDORS ==========

// Get all vendors
router.get('/vendors', async (req, res) => {
  try {
    const { search, is_active } = req.query;
    let query = `
      SELECT v.*, p.name as partner_name, p.email, p.phone, p.company
      FROM account_vendor v
      JOIN partners p ON v.partner_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (p.name ILIKE $${paramCount} OR v.vendor_code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (is_active !== undefined) {
      query += ` AND v.is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY p.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create vendor
router.post('/vendors', async (req, res) => {
  try {
    const { partner_id, vendor_code, payment_term_id, credit_limit, tax_id, vendor_type, currency_id } = req.body;

    const result = await pool.query(
      `INSERT INTO account_vendor 
       (partner_id, vendor_code, payment_term_id, credit_limit, tax_id, vendor_type, currency_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [partner_id, vendor_code, payment_term_id || null, credit_limit || null, tax_id || null, vendor_type || null, currency_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Vendor code or partner already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ========== BILLS (PURCHASE INVOICES) ==========

// Get all bills
router.get('/bills', async (req, res) => {
  try {
    const { vendor_id, state, payment_state, date_from, date_to, search } = req.query;
    let query = `
      SELECT b.*, 
             v.vendor_code,
             p.name as vendor_name,
             j.name as journal_name
      FROM account_bill b
      LEFT JOIN account_vendor v ON b.vendor_id = v.id
      LEFT JOIN partners p ON v.partner_id = p.id
      LEFT JOIN account_journal j ON b.move_id IS NOT NULL
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (vendor_id) {
      query += ` AND b.vendor_id = $${paramCount++}`;
      params.push(vendor_id);
    }

    if (state) {
      query += ` AND b.state = $${paramCount++}`;
      params.push(state);
    }

    if (payment_state) {
      query += ` AND b.payment_state = $${paramCount++}`;
      params.push(payment_state);
    }

    if (date_from) {
      query += ` AND b.invoice_date >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND b.invoice_date <= $${paramCount++}`;
      params.push(date_to);
    }

    if (search) {
      query += ` AND (b.name ILIKE $${paramCount} OR b.reference ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY b.invoice_date DESC, b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bill by ID with lines
router.get('/bills/:id', async (req, res) => {
  try {
    const billResult = await pool.query(
      `SELECT b.*, 
              v.vendor_code,
              p.name as vendor_name,
              p.email as vendor_email
       FROM account_bill b
       LEFT JOIN account_vendor v ON b.vendor_id = v.id
       LEFT JOIN partners p ON v.partner_id = p.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (billResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const linesResult = await pool.query(
      `SELECT l.*, pr.name as product_name, pr.default_code as product_code
       FROM account_bill_line l
       LEFT JOIN products pr ON l.product_id = pr.id
       WHERE l.bill_id = $1
       ORDER BY l.id`,
      [req.params.id]
    );

    res.json({
      ...billResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create bill
router.post('/bills', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      vendor_id,
      invoice_date,
      due_date,
      reference,
      purchase_order_id,
      lines,
      currency_id,
    } = req.body;

    // Generate bill number
    const dateStr = new Date(invoice_date).toISOString().slice(0, 10).replace(/-/g, '');
    const name = `BILL/${dateStr}/${Date.now().toString().slice(-6)}`;

    // Calculate amounts
    let amountUntaxed = 0;
    let amountTax = 0;

    if (lines && lines.length > 0) {
      for (const line of lines) {
        const lineSubtotal = parseFloat(line.price_subtotal || 0);
        amountUntaxed += lineSubtotal;
        // TODO: Calculate tax based on tax_ids
        amountTax += parseFloat(line.tax_amount || 0);
      }
    }

    const amountTotal = amountUntaxed + amountTax;

    // Create bill
    const billResult = await client.query(
      `INSERT INTO account_bill 
       (name, vendor_id, invoice_date, due_date, reference, purchase_order_id, 
        amount_untaxed, amount_tax, amount_total, amount_residual, currency_id, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
       RETURNING *`,
      [
        name,
        vendor_id,
        invoice_date,
        due_date || null,
        reference || null,
        purchase_order_id || null,
        amountUntaxed,
        amountTax,
        amountTotal,
        amountTotal,
        currency_id || null,
      ]
    );

    const billId = billResult.rows[0].id;

    // Create bill lines
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await client.query(
          `INSERT INTO account_bill_line 
           (bill_id, product_id, name, quantity, price_unit, price_subtotal, tax_ids, account_id, cost_center_id, project_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            billId,
            line.product_id || null,
            line.name || '',
            line.quantity || 1,
            line.price_unit || 0,
            line.price_subtotal || 0,
            line.tax_ids || null,
            line.account_id || null,
            line.cost_center_id || null,
            line.project_id || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete bill
    const completeResult = await pool.query(
      `SELECT b.*, v.vendor_code, p.name as vendor_name
       FROM account_bill b
       LEFT JOIN account_vendor v ON b.vendor_id = v.id
       LEFT JOIN partners p ON v.partner_id = p.id
       WHERE b.id = $1`,
      [billId]
    );

    const linesResult = await pool.query(
      'SELECT * FROM account_bill_line WHERE bill_id = $1 ORDER BY id',
      [billId]
    );

    res.status(201).json({
      ...completeResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating bill:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// Post bill (create GL entry)
router.post('/bills/:id/post', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const billId = req.params.id;

    // Get bill
    const billResult = await client.query(
      'SELECT * FROM account_bill WHERE id = $1',
      [billId]
    );

    if (billResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = billResult.rows[0];

    if (bill.state !== 'draft') {
      return res.status(400).json({ error: 'Bill is not in draft state' });
    }

    // TODO: Create journal entry and move lines
    // This is a simplified version - full implementation would create proper GL entries

    await client.query(
      `UPDATE account_bill 
       SET state = 'posted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [billId]
    );

    await client.query('COMMIT');

    const updatedResult = await pool.query(
      'SELECT * FROM account_bill WHERE id = $1',
      [billId]
    );

    res.json(updatedResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error posting bill:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// ========== PAYMENTS ==========

// Get all payments
router.get('/payments', async (req, res) => {
  try {
    const { payment_type, partner_id, state, date_from, date_to } = req.query;
    let query = `
      SELECT p.*, 
             pt.name as partner_name,
             j.name as journal_name
      FROM account_payment p
      LEFT JOIN partners pt ON p.partner_id = pt.id
      LEFT JOIN account_journal j ON p.journal_id = j.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (payment_type) {
      query += ` AND p.payment_type = $${paramCount++}`;
      params.push(payment_type);
    }

    if (partner_id) {
      query += ` AND p.partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (state) {
      query += ` AND p.state = $${paramCount++}`;
      params.push(state);
    }

    if (date_from) {
      query += ` AND p.payment_date >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND p.payment_date <= $${paramCount++}`;
      params.push(date_to);
    }

    query += ' ORDER BY p.payment_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payment
router.post('/payments', async (req, res) => {
  try {
    const {
      payment_type,
      payment_method,
      partner_id,
      amount,
      currency_id,
      payment_date,
      journal_id,
      communication,
      bill_ids, // Array of bill IDs to pay
    } = req.body;

    // Generate payment reference
    const dateStr = new Date(payment_date).toISOString().slice(0, 10).replace(/-/g, '');
    const name = `PAY/${dateStr}/${Date.now().toString().slice(-6)}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create payment
      const paymentResult = await client.query(
        `INSERT INTO account_payment 
         (name, payment_type, payment_method, partner_id, amount, currency_id, payment_date, journal_id, communication, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
         RETURNING *`,
        [name, payment_type, payment_method, partner_id, amount, currency_id, payment_date, journal_id, communication || null]
      );

      const paymentId = paymentResult.rows[0].id;

      // Link to bills if provided
      if (bill_ids && bill_ids.length > 0) {
        for (const billId of bill_ids) {
          await client.query(
            'INSERT INTO account_payment_bill_rel (payment_id, bill_id, amount) VALUES ($1, $2, $3)',
            [paymentId, billId, amount / bill_ids.length] // Distribute amount equally
          );
        }
      }

      await client.query('COMMIT');

      const completeResult = await pool.query(
        'SELECT * FROM account_payment WHERE id = $1',
        [paymentId]
      );

      res.status(201).json(completeResult.rows[0]);
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Post payment
router.post('/payments/:id/post', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE account_payment 
       SET state = 'posted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND state = 'draft'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found or cannot be posted' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error posting payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

