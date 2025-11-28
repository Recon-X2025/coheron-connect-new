import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all POS orders
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

// Create POS order
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, partner_id, amount_total, payment_method, amount_paid, lines } = req.body;

    // Generate order name if not provided
    const orderName = name || `POS-${Date.now()}`;

    const orderResult = await client.query(
      `INSERT INTO pos_orders (name, partner_id, amount_total, payment_method, amount_paid)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orderName, partner_id, amount_total, payment_method, amount_paid]
    );

    const order = orderResult.rows[0];

    // Insert order lines
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await client.query(
          `INSERT INTO pos_order_lines (order_id, product_id, qty, price_unit)
           VALUES ($1, $2, $3, $4)`,
          [order.id, line.product_id, line.qty, line.price_unit]
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

export default router;

