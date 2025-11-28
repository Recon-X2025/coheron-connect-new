import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all sale orders
router.get('/', async (req, res) => {
  try {
    const { state, search } = req.query;
    let query = `
      SELECT so.*, 
             json_agg(
               json_build_object(
                 'id', sol.id,
                 'product_id', sol.product_id,
                 'product_uom_qty', sol.product_uom_qty,
                 'price_unit', sol.price_unit,
                 'price_subtotal', sol.price_subtotal
               )
             ) FILTER (WHERE sol.id IS NOT NULL) as order_line
      FROM sale_orders so
      LEFT JOIN sale_order_lines sol ON so.id = sol.order_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (state) {
      query += ` AND so.state = $${paramCount++}`;
      params.push(state);
    }

    if (search) {
      query += ` AND (so.name ILIKE $${paramCount} OR so.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' GROUP BY so.id ORDER BY so.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sale orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sale order by ID
router.get('/:id', async (req, res) => {
  try {
    const orderResult = await pool.query(
      'SELECT * FROM sale_orders WHERE id = $1',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    const linesResult = await pool.query(
      'SELECT * FROM sale_order_lines WHERE order_id = $1',
      [req.params.id]
    );

    res.json({
      ...orderResult.rows[0],
      order_line: linesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching sale order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create sale order
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, partner_id, date_order, user_id, order_line } = req.body;

    // Calculate total
    const amount_total = order_line?.reduce(
      (sum: number, line: any) => sum + (line.price_unit * line.product_uom_qty),
      0
    ) || 0;

    const orderResult = await client.query(
      `INSERT INTO sale_orders (name, partner_id, date_order, amount_total, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, partner_id, date_order || new Date(), amount_total, user_id || 1]
    );

    const order = orderResult.rows[0];

    // Insert order lines
    if (order_line && order_line.length > 0) {
      for (const line of order_line) {
        await client.query(
          `INSERT INTO sale_order_lines (order_id, product_id, product_uom_qty, price_unit, price_subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            order.id,
            line.product_id,
            line.product_uom_qty,
            line.price_unit,
            line.price_unit * line.product_uom_qty,
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...order, order_line: order_line || [] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sale order:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update sale order
router.put('/:id', async (req, res) => {
  try {
    const { state, amount_total } = req.body;

    const result = await pool.query(
      `UPDATE sale_orders 
       SET state = COALESCE($1, state), amount_total = COALESCE($2, amount_total)
       WHERE id = $3
       RETURNING *`,
      [state, amount_total, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sale order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete sale order
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sale_orders WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    res.json({ message: 'Sale order deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

