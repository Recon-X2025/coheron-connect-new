import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { site_id, customer_id, status, search } = req.query;
    let query = `
      SELECT wo.*, p.name as customer_name, p.email as customer_email
      FROM website_orders wo
      LEFT JOIN partners p ON wo.customer_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (site_id) {
      query += ` AND wo.site_id = $${paramCount++}`;
      params.push(site_id);
    }

    if (customer_id) {
      query += ` AND wo.customer_id = $${paramCount++}`;
      params.push(customer_id);
    }

    if (status) {
      query += ` AND wo.status = $${paramCount++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (wo.order_number ILIKE $${paramCount} OR p.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY wo.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wo.*, p.name as customer_name, p.email as customer_email, p.phone
       FROM website_orders wo
       LEFT JOIN partners p ON wo.customer_id = p.id
       WHERE wo.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name as product_name, p.image_url
       FROM website_order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [req.params.id]
    );

    // Get status history
    const historyResult = await pool.query(
      'SELECT * FROM website_order_status_history WHERE order_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      items: itemsResult.rows,
      history: historyResult.rows,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order from cart (checkout)
router.post('/checkout', async (req, res) => {
  try {
    const {
      cart_id,
      customer_id,
      session_id,
      site_id,
      shipping_address,
      billing_address,
      payment_method,
      payment_reference,
      shipping_method,
    } = req.body;

    // Get cart
    const cartResult = await pool.query('SELECT * FROM website_carts WHERE id = $1', [cart_id]);
    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const cart = cartResult.rows[0];

    // Get cart items
    const itemsResult = await pool.query(
      'SELECT * FROM website_cart_items WHERE cart_id = $1',
      [cart_id]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Generate order number
    const orderNumber = `WEB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const orderResult = await pool.query(
      `INSERT INTO website_orders (
        order_number, site_id, customer_id, session_id, status, currency,
        subtotal, tax_amount, shipping_amount, discount_amount, total,
        payment_status, payment_method, payment_reference,
        shipping_address, billing_address, shipping_method, promotion_code
      )
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        orderNumber,
        site_id,
        customer_id,
        session_id,
        cart.currency,
        cart.subtotal,
        cart.tax_amount,
        cart.shipping_amount || 0,
        cart.discount_amount || 0,
        cart.total,
        payment_method,
        payment_reference,
        JSON.stringify(shipping_address),
        JSON.stringify(billing_address),
        shipping_method,
        cart.promotion_code,
      ]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of itemsResult.rows) {
      const productResult = await pool.query('SELECT name, default_code FROM products WHERE id = $1', [
        item.product_id,
      ]);
      const product = productResult.rows[0];

      await pool.query(
        `INSERT INTO website_order_items (
          order_id, product_id, website_product_id, variant_id,
          product_name, product_sku, quantity, unit_price, subtotal
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          item.product_id,
          item.website_product_id,
          item.variant_id,
          product.name,
          product.default_code,
          item.quantity,
          item.unit_price,
          item.subtotal,
        ]
      );
    }

    // Create ERP sales order
    let erpOrderId = null;
    if (customer_id) {
      try {
        const erpOrderResult = await pool.query(
          `INSERT INTO sale_orders (name, partner_id, date_order, amount_total, state, user_id)
           VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'draft', NULL)
           RETURNING id`,
          [`SO-${orderNumber}`, customer_id, order.total]
        );
        erpOrderId = erpOrderResult.rows[0].id;

        // Create sale order lines
        for (const item of itemsResult.rows) {
          await pool.query(
            `INSERT INTO sale_order_lines (order_id, product_id, product_uom_qty, price_unit, price_subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [erpOrderId, item.product_id, item.quantity, item.unit_price, item.subtotal]
          );
        }

        // Link website order to ERP order
        await pool.query('UPDATE website_orders SET erp_order_id = $1 WHERE id = $2', [
          erpOrderId,
          order.id,
        ]);
      } catch (erpError) {
        console.error('Error creating ERP order:', erpError);
        // Continue even if ERP order creation fails
      }
    }

    // Add status history
    await pool.query(
      `INSERT INTO website_order_status_history (order_id, status, notes)
       VALUES ($1, 'pending', 'Order created from checkout')`,
      [order.id]
    );

    // Clear cart
    await pool.query('DELETE FROM website_cart_items WHERE cart_id = $1', [cart_id]);
    await pool.query('DELETE FROM website_carts WHERE id = $1', [cart_id]);

    res.status(201).json({ ...order, erp_order_id: erpOrderId });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;

    const orderResult = await pool.query('SELECT * FROM website_orders WHERE id = $1', [
      req.params.id,
    ]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order
    await pool.query('UPDATE website_orders SET status = $1 WHERE id = $2', [
      status,
      req.params.id,
    ]);

    // Add status history
    await pool.query(
      `INSERT INTO website_order_status_history (order_id, status, notes)
       VALUES ($1, $2, $3)`,
      [req.params.id, status, notes || '']
    );

    // Update ERP order if linked
    if (orderResult.rows[0].erp_order_id) {
      let erpState = 'draft';
      if (status === 'confirmed' || status === 'paid') {
        erpState = 'sale';
      } else if (status === 'cancelled') {
        erpState = 'cancel';
      }

      await pool.query('UPDATE sale_orders SET state = $1 WHERE id = $2', [
        erpState,
        orderResult.rows[0].erp_order_id,
      ]);
    }

    res.json({ message: 'Order status updated', status });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment status
router.put('/:id/payment', async (req, res) => {
  try {
    const { payment_status, payment_reference } = req.body;

    await pool.query(
      `UPDATE website_orders 
       SET payment_status = $1, payment_reference = COALESCE($2, payment_reference)
       WHERE id = $3`,
      [payment_status, payment_reference, req.params.id]
    );

    // If paid, update order status
    if (payment_status === 'paid') {
      await pool.query('UPDATE website_orders SET status = $1 WHERE id = $2', [
        'confirmed',
        req.params.id,
      ]);
    }

    res.json({ message: 'Payment status updated' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

