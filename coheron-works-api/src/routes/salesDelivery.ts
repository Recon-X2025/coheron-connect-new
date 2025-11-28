import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// DELIVERY ORDERS
// ============================================

// Get all delivery orders
router.get('/', async (req, res) => {
  try {
    const { sale_order_id, status, warehouse_id } = req.query;
    let query = `
      SELECT do.*, 
             json_agg(
               json_build_object(
                 'id', dol.id,
                 'product_id', dol.product_id,
                 'quantity_ordered', dol.quantity_ordered,
                 'quantity_delivered', dol.quantity_delivered,
                 'quantity_pending', dol.quantity_pending
               )
             ) FILTER (WHERE dol.id IS NOT NULL) as delivery_lines,
             so.name as sale_order_name,
             p.name as partner_name
      FROM delivery_orders do
      LEFT JOIN delivery_order_lines dol ON do.id = dol.delivery_order_id
      LEFT JOIN sale_orders so ON do.sale_order_id = so.id
      LEFT JOIN partners p ON so.partner_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (sale_order_id) {
      query += ` AND do.sale_order_id = $${paramCount++}`;
      params.push(sale_order_id);
    }

    if (status) {
      query += ` AND do.status = $${paramCount++}`;
      params.push(status);
    }

    if (warehouse_id) {
      query += ` AND do.warehouse_id = $${paramCount++}`;
      params.push(warehouse_id);
    }

    query += ' GROUP BY do.id, so.name, p.name ORDER BY do.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery order by ID
router.get('/:id', async (req, res) => {
  try {
    const deliveryResult = await pool.query(
      `SELECT do.*, so.name as sale_order_name, p.name as partner_name
       FROM delivery_orders do
       LEFT JOIN sale_orders so ON do.sale_order_id = so.id
       LEFT JOIN partners p ON so.partner_id = p.id
       WHERE do.id = $1`,
      [req.params.id]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery order not found' });
    }

    const linesResult = await pool.query(
      `SELECT dol.*, p.name as product_name
       FROM delivery_order_lines dol
       LEFT JOIN products p ON dol.product_id = p.id
       WHERE dol.delivery_order_id = $1`,
      [req.params.id]
    );

    const trackingResult = await pool.query(
      'SELECT * FROM shipment_tracking WHERE delivery_order_id = $1 ORDER BY event_date DESC',
      [req.params.id]
    );

    const freightResult = await pool.query(
      'SELECT * FROM freight_charges WHERE delivery_order_id = $1',
      [req.params.id]
    );

    res.json({
      ...deliveryResult.rows[0],
      delivery_lines: linesResult.rows,
      tracking: trackingResult.rows,
      freight_charges: freightResult.rows,
    });
  } catch (error) {
    console.error('Error fetching delivery order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create delivery order from sales order
router.post('/', async (req, res) => {
  try {
    const { sale_order_id, warehouse_id, delivery_date, delivery_address, delivery_method, delivery_lines } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get sales order details
      const saleOrder = await client.query('SELECT * FROM sale_orders WHERE id = $1', [sale_order_id]);
      if (saleOrder.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Sales order not found' });
      }

      // Generate delivery number
      const countResult = await client.query('SELECT COUNT(*) as count FROM delivery_orders');
      const deliveryNumber = `DO-${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

      const deliveryResult = await client.query(
        `INSERT INTO delivery_orders (delivery_number, sale_order_id, warehouse_id, delivery_date, delivery_address, delivery_method)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [deliveryNumber, sale_order_id, warehouse_id, delivery_date, delivery_address, delivery_method]
      );

      const deliveryOrder = deliveryResult.rows[0];

      // Create delivery lines
      if (delivery_lines && delivery_lines.length > 0) {
        for (const line of delivery_lines) {
          await client.query(
            `INSERT INTO delivery_order_lines (delivery_order_id, sale_order_line_id, product_id, quantity_ordered, quantity_delivered)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              deliveryOrder.id,
              line.sale_order_line_id,
              line.product_id,
              line.quantity_ordered,
              line.quantity_delivered || 0,
            ]
          );
        }
      } else {
        // Auto-create from sales order lines
        const saleOrderLines = await client.query('SELECT * FROM sale_order_lines WHERE order_id = $1', [sale_order_id]);
        for (const line of saleOrderLines.rows) {
          await client.query(
            `INSERT INTO delivery_order_lines (delivery_order_id, sale_order_line_id, product_id, quantity_ordered, quantity_delivered)
             VALUES ($1, $2, $3, $4, $5)`,
            [deliveryOrder.id, line.id, line.product_id, line.product_uom_qty, 0]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(deliveryOrder);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating delivery order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, delivered_at, tracking_number, carrier_name } = req.body;

    const result = await pool.query(
      `UPDATE delivery_orders 
       SET status = $1, 
           delivered_at = COALESCE($2, delivered_at),
           tracking_number = COALESCE($3, tracking_number),
           carrier_name = COALESCE($4, carrier_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status, delivered_at, tracking_number, carrier_name, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery order not found' });
    }

    // If delivered, update delivery lines
    if (status === 'delivered') {
      await pool.query(
        `UPDATE delivery_order_lines 
         SET quantity_delivered = quantity_ordered 
         WHERE delivery_order_id = $1 AND quantity_delivered < quantity_ordered`,
        [req.params.id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating delivery order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery line quantities
router.put('/:id/lines/:lineId', async (req, res) => {
  try {
    const { quantity_delivered } = req.body;

    const result = await pool.query(
      `UPDATE delivery_order_lines 
       SET quantity_delivered = $1
       WHERE id = $2 AND delivery_order_id = $3
       RETURNING *`,
      [quantity_delivered, req.params.lineId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery line not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating delivery line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SHIPMENT TRACKING
// ============================================

// Add tracking event
router.post('/:id/tracking', async (req, res) => {
  try {
    const { tracking_event, location, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO shipment_tracking (delivery_order_id, tracking_event, location, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, tracking_event, location, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding tracking event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tracking history
router.get('/:id/tracking', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM shipment_tracking WHERE delivery_order_id = $1 ORDER BY event_date DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// FREIGHT CHARGES
// ============================================

// Add freight charge
router.post('/:id/freight', async (req, res) => {
  try {
    const { charge_type, amount, currency, description } = req.body;

    const result = await pool.query(
      `INSERT INTO freight_charges (delivery_order_id, charge_type, amount, currency, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, charge_type, amount, currency || 'INR', description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding freight charge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get freight charges
router.get('/:id/freight', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM freight_charges WHERE delivery_order_id = $1',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching freight charges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

