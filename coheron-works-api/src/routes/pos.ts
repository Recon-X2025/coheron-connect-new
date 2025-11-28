import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// POS ORDERS
// ============================================

// Get all POS orders
router.get('/orders', async (req, res) => {
  try {
    const { state, store_id, terminal_id, session_id, start_date, end_date } = req.query;
    let query = `
      SELECT po.*,
             s.name as store_name,
             pt.name as terminal_name,
             ps.session_number,
             p.name as partner_name
      FROM pos_orders po
      LEFT JOIN stores s ON po.store_id = s.id
      LEFT JOIN pos_terminals pt ON po.terminal_id = pt.id
      LEFT JOIN pos_sessions ps ON po.session_id = ps.id
      LEFT JOIN partners p ON po.partner_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (state) {
      query += ` AND po.state = $${paramCount++}`;
      params.push(state);
    }

    if (store_id) {
      query += ` AND po.store_id = $${paramCount++}`;
      params.push(store_id);
    }

    if (terminal_id) {
      query += ` AND po.terminal_id = $${paramCount++}`;
      params.push(terminal_id);
    }

    if (session_id) {
      query += ` AND po.session_id = $${paramCount++}`;
      params.push(session_id);
    }

    if (start_date) {
      query += ` AND po.created_at >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND po.created_at <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' ORDER BY po.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching POS orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get POS order by ID
router.get('/orders/:id', async (req, res) => {
  try {
    const orderResult = await pool.query(
      `SELECT po.*, s.name as store_name, pt.name as terminal_name
       FROM pos_orders po
       LEFT JOIN stores s ON po.store_id = s.id
       LEFT JOIN pos_terminals pt ON po.terminal_id = pt.id
       WHERE po.id = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'POS order not found' });
    }

    const linesResult = await pool.query(
      `SELECT pol.*, p.name as product_name, p.default_code as product_code
       FROM pos_order_lines pol
       JOIN products p ON pol.product_id = p.id
       WHERE pol.order_id = $1
       ORDER BY pol.id`,
      [req.params.id]
    );

    res.json({
      ...orderResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching POS order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create POS order
router.post('/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      store_id,
      terminal_id,
      session_id,
      partner_id,
      customer_name,
      customer_phone,
      customer_email,
      order_type,
      amount_untaxed,
      amount_tax,
      amount_total,
      amount_discount,
      payment_method,
      user_id,
      cashier_id,
      lines,
    } = req.body;

    // Generate order number
    const orderCountResult = await client.query(
      "SELECT COUNT(*) as count FROM pos_orders WHERE order_number LIKE 'POS-%'"
    );
    const orderNumber = `POS-${String(parseInt(orderCountResult.rows[0].count) + 1).padStart(6, '0')}`;

    const orderResult = await client.query(
      `INSERT INTO pos_orders (
        name, order_number, store_id, terminal_id, session_id, partner_id,
        customer_name, customer_phone, customer_email, order_type, state,
        amount_untaxed, amount_tax, amount_total, amount_discount, amount_paid,
        payment_method, payment_status, user_id, cashier_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13, $14, $15, $16, 'pending', $17, $18)
      RETURNING *`,
      [
        orderNumber,
        orderNumber,
        store_id,
        terminal_id,
        session_id,
        partner_id,
        customer_name,
        customer_phone,
        customer_email,
        order_type || 'sale',
        amount_untaxed || 0,
        amount_tax || 0,
        amount_total || 0,
        amount_discount || 0,
        amount_total || 0,
        payment_method,
        user_id,
        cashier_id,
      ]
    );

    const order = orderResult.rows[0];

    // Insert order lines
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await client.query(
          `INSERT INTO pos_order_lines (order_id, product_id, qty, price_unit, discount, tax_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            order.id,
            line.product_id,
            line.qty,
            line.price_unit,
            line.discount || 0,
            line.tax_id,
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...order, lines: lines || [] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating POS order:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update POS order
router.put('/orders/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      customer_name,
      customer_phone,
      customer_email,
      amount_untaxed,
      amount_tax,
      amount_total,
      amount_discount,
      payment_method,
      state,
      lines,
    } = req.body;

    await client.query(
      `UPDATE pos_orders 
       SET customer_name = $1, customer_phone = $2, customer_email = $3,
           amount_untaxed = $4, amount_tax = $5, amount_total = $6,
           amount_discount = $7, payment_method = $8, state = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        customer_name,
        customer_phone,
        customer_email,
        amount_untaxed,
        amount_tax,
        amount_total,
        amount_discount,
        payment_method,
        state,
        req.params.id,
      ]
    );

    if (lines && Array.isArray(lines)) {
      await client.query('DELETE FROM pos_order_lines WHERE order_id = $1', [req.params.id]);
      for (const line of lines) {
        await client.query(
          `INSERT INTO pos_order_lines (order_id, product_id, qty, price_unit, discount, tax_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.params.id,
            line.product_id,
            line.qty,
            line.price_unit,
            line.discount || 0,
            line.tax_id,
          ]
        );
      }
    }

    await client.query('COMMIT');

    const result = await pool.query(
      `SELECT po.*, s.name as store_name, pt.name as terminal_name
       FROM pos_orders po
       LEFT JOIN stores s ON po.store_id = s.id
       LEFT JOIN pos_terminals pt ON po.terminal_id = pt.id
       WHERE po.id = $1`,
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating POS order:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Park order
router.post('/orders/:id/park', async (req, res) => {
  try {
    await pool.query(
      `UPDATE pos_orders 
       SET is_parked = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Order parked successfully' });
  } catch (error) {
    console.error('Error parking order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Void order
router.post('/orders/:id/void', async (req, res) => {
  try {
    const { void_reason, void_user_id } = req.body;
    await pool.query(
      `UPDATE pos_orders 
       SET is_void = true, void_reason = $1, void_user_id = $2, void_date = CURRENT_TIMESTAMP,
           state = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [void_reason, void_user_id, req.params.id]
    );
    res.json({ message: 'Order voided successfully' });
  } catch (error) {
    console.error('Error voiding order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process return
router.post('/orders/:id/return', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { return_lines, refund_method } = req.body;

    // Create return order
    const returnCountResult = await client.query(
      "SELECT COUNT(*) as count FROM pos_orders WHERE order_number LIKE 'RET-%'"
    );
    const returnNumber = `RET-${String(parseInt(returnCountResult.rows[0].count) + 1).padStart(6, '0')}`;

    const returnResult = await client.query(
      `INSERT INTO pos_orders (
        name, order_number, store_id, terminal_id, session_id, order_type, state,
        amount_total, payment_method, payment_status
      ) VALUES ($1, $2, (SELECT store_id FROM pos_orders WHERE id = $3), 
                 (SELECT terminal_id FROM pos_orders WHERE id = $3),
                 (SELECT session_id FROM pos_orders WHERE id = $3),
                 'return', 'confirmed', $4, $5, 'refunded')
      RETURNING *`,
      [returnNumber, returnNumber, req.params.id, 0, refund_method]
    );

    // TODO: Process refund and update inventory

    await client.query('COMMIT');
    res.json({ message: 'Return processed successfully', return_order: returnResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing return:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ============================================
// POS SESSIONS
// ============================================

// Get all sessions
router.get('/sessions', async (req, res) => {
  try {
    const { state, store_id, terminal_id, start_date, end_date } = req.query;
    let query = `
      SELECT ps.*,
             s.name as store_name,
             pt.name as terminal_name,
             u.name as user_name
      FROM pos_sessions ps
      LEFT JOIN stores s ON ps.store_id = s.id
      LEFT JOIN pos_terminals pt ON ps.terminal_id = pt.id
      LEFT JOIN users u ON ps.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (state) {
      query += ` AND ps.state = $${paramCount++}`;
      params.push(state);
    }

    if (store_id) {
      query += ` AND ps.store_id = $${paramCount++}`;
      params.push(store_id);
    }

    if (terminal_id) {
      query += ` AND ps.terminal_id = $${paramCount++}`;
      params.push(terminal_id);
    }

    if (start_date) {
      query += ` AND ps.start_at >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ps.start_at <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' ORDER BY ps.start_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching POS sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session by ID
router.get('/sessions/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, s.name as store_name, pt.name as terminal_name, u.name as user_name
       FROM pos_sessions ps
       LEFT JOIN stores s ON ps.store_id = s.id
       LEFT JOIN pos_terminals pt ON ps.terminal_id = pt.id
       LEFT JOIN users u ON ps.user_id = u.id
       WHERE ps.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create session
router.post('/sessions', async (req, res) => {
  try {
    const { store_id, terminal_id, user_id, opening_balance } = req.body;

    const sessionCountResult = await pool.query(
      "SELECT COUNT(*) as count FROM pos_sessions WHERE session_number LIKE 'SESS-%'"
    );
    const sessionNumber = `SESS-${String(parseInt(sessionCountResult.rows[0].count) + 1).padStart(6, '0')}`;

    const result = await pool.query(
      `INSERT INTO pos_sessions (
        name, session_number, store_id, terminal_id, user_id, opening_balance, state
      ) VALUES ($1, $2, $3, $4, $5, $6, 'opening')
      RETURNING *`,
      [sessionNumber, sessionNumber, store_id, terminal_id, user_id, opening_balance || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Open session
router.post('/sessions/:id/open', async (req, res) => {
  try {
    await pool.query(
      `UPDATE pos_sessions 
       SET state = 'opened', start_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Session opened successfully' });
  } catch (error) {
    console.error('Error opening session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close session
router.post('/sessions/:id/close', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { closing_balance } = req.body;

    // Calculate totals from orders
    const ordersResult = await client.query(
      `SELECT 
         COUNT(*) as total_orders,
         COALESCE(SUM(amount_total), 0) as total_sales,
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount_paid ELSE 0 END), 0) as total_cash,
         COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount_paid ELSE 0 END), 0) as total_card,
         COALESCE(SUM(CASE WHEN payment_method = 'upi' THEN amount_paid ELSE 0 END), 0) as total_upi,
         COALESCE(SUM(CASE WHEN payment_method NOT IN ('cash', 'card', 'upi') THEN amount_paid ELSE 0 END), 0) as total_other
       FROM pos_orders
       WHERE session_id = $1 AND state = 'paid'`,
      [req.params.id]
    );

    const totals = ordersResult.rows[0];
    const expectedBalance = parseFloat(totals.total_cash) || 0;
    const difference = (closing_balance || 0) - expectedBalance;

    await client.query(
      `UPDATE pos_sessions 
       SET state = 'closed', closing_balance = $1, expected_balance = $2, difference = $3,
           total_orders = $4, total_sales = $5, total_cash = $6, total_card = $7,
           total_upi = $8, total_other = $9, stop_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        closing_balance,
        expectedBalance,
        difference,
        totals.total_orders,
        totals.total_sales,
        totals.total_cash,
        totals.total_card,
        totals.total_upi,
        totals.total_other,
        req.params.id,
      ]
    );

    await client.query('COMMIT');
    res.json({ message: 'Session closed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error closing session:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Reconcile cash
router.post('/sessions/:id/reconcile', async (req, res) => {
  try {
    const { closing_balance, notes } = req.body;
    // Same logic as close session but with notes
    await pool.query(
      `UPDATE pos_sessions 
       SET closing_balance = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [closing_balance, notes, req.params.id]
    );
    res.json({ message: 'Cash reconciled successfully' });
  } catch (error) {
    console.error('Error reconciling cash:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POS TERMINALS
// ============================================

// Get all terminals
router.get('/terminals', async (req, res) => {
  try {
    const { store_id, is_active } = req.query;
    let query = `
      SELECT pt.*, s.name as store_name
      FROM pos_terminals pt
      LEFT JOIN stores s ON pt.store_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (store_id) {
      query += ` AND pt.store_id = $${paramCount++}`;
      params.push(store_id);
    }

    if (is_active !== undefined) {
      query += ` AND pt.is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY pt.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching terminals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get terminal by ID
router.get('/terminals/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pt.*, s.name as store_name
       FROM pos_terminals pt
       LEFT JOIN stores s ON pt.store_id = s.id
       WHERE pt.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Terminal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching terminal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create terminal
router.post('/terminals', async (req, res) => {
  try {
    const { name, code, store_id, is_active, printer_id, cash_drawer_enabled, barcode_scanner_enabled, hardware_config } = req.body;

    const result = await pool.query(
      `INSERT INTO pos_terminals (
        name, code, store_id, is_active, printer_id, cash_drawer_enabled,
        barcode_scanner_enabled, hardware_config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        name,
        code,
        store_id,
        is_active !== undefined ? is_active : true,
        printer_id,
        cash_drawer_enabled !== undefined ? cash_drawer_enabled : true,
        barcode_scanner_enabled !== undefined ? barcode_scanner_enabled : true,
        hardware_config ? JSON.stringify(hardware_config) : null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating terminal:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Terminal code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update terminal
router.put('/terminals/:id', async (req, res) => {
  try {
    const { name, code, store_id, is_active, printer_id, cash_drawer_enabled, barcode_scanner_enabled, hardware_config } = req.body;

    const result = await pool.query(
      `UPDATE pos_terminals 
       SET name = $1, code = $2, store_id = $3, is_active = $4, printer_id = $5,
           cash_drawer_enabled = $6, barcode_scanner_enabled = $7,
           hardware_config = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        name,
        code,
        store_id,
        is_active,
        printer_id,
        cash_drawer_enabled,
        barcode_scanner_enabled,
        hardware_config ? JSON.stringify(hardware_config) : null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Terminal not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating terminal:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Terminal code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete terminal
router.delete('/terminals/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pos_terminals WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Terminal not found' });
    }

    res.json({ message: 'Terminal deleted successfully' });
  } catch (error) {
    console.error('Error deleting terminal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POS PAYMENTS
// ============================================

// Process payment
router.post('/payments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { order_id, payment_method, amount, currency, gateway_transaction_id, gateway_response } = req.body;

    const paymentResult = await client.query(
      `INSERT INTO pos_payments (
        order_id, payment_method, amount, currency, gateway_transaction_id,
        gateway_response, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'success')
      RETURNING *`,
      [
        order_id,
        payment_method,
        amount,
        currency || 'INR',
        gateway_transaction_id,
        gateway_response ? JSON.stringify(gateway_response) : null,
      ]
    );

    // Update order payment status
    await client.query(
      `UPDATE pos_orders 
       SET payment_status = 'paid', amount_paid = amount_paid + $1, paid_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [amount, order_id]
    );

    await client.query('COMMIT');
    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Process refund
router.post('/payments/refund', async (req, res) => {
  try {
    const { payment_id, amount, reason } = req.body;

    await pool.query(
      `UPDATE pos_payments 
       SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [payment_id]
    );

    res.json({ message: 'Refund processed successfully' });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy route for backward compatibility
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.*, 
              json_agg(
                json_build_object(
                  'id', pol.id,
                  'product_id', pol.product_id,
                  'qty', pol.qty,
                  'price_unit', pol.price_unit
                )
              ) FILTER (WHERE pol.id IS NOT NULL) as lines
       FROM pos_orders po
       LEFT JOIN pos_order_lines pol ON po.id = pol.order_id
       GROUP BY po.id
       ORDER BY po.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching POS orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  // Redirect to /orders
  req.url = '/orders';
  router.handle(req, res);
});

export default router;

