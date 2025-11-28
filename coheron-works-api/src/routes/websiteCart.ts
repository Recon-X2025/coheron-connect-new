import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get or create cart
router.get('/', async (req, res) => {
  try {
    const { session_id, customer_id, site_id } = req.query;

    let cart;
    if (customer_id) {
      const result = await pool.query(
        'SELECT * FROM website_carts WHERE customer_id = $1 AND site_id = $2 ORDER BY created_at DESC LIMIT 1',
        [customer_id, site_id]
      );
      cart = result.rows[0];
    } else if (session_id) {
      const result = await pool.query(
        'SELECT * FROM website_carts WHERE session_id = $1 AND site_id = $2 ORDER BY created_at DESC LIMIT 1',
        [session_id, site_id]
      );
      cart = result.rows[0];
    }

    if (!cart) {
      // Create new cart
      const newCartResult = await pool.query(
        `INSERT INTO website_carts (session_id, customer_id, site_id, currency, expires_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')
         RETURNING *`,
        [session_id || null, customer_id || null, site_id, 'USD']
      );
      cart = newCartResult.rows[0];
    }

    // Get cart items
    const itemsResult = await pool.query(
      `SELECT ci.*, p.name as product_name, p.image_url, wp.is_published
       FROM website_cart_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       LEFT JOIN website_products wp ON ci.website_product_id = wp.id
       WHERE ci.cart_id = $1`,
      [cart.id]
    );

    res.json({ ...cart, items: itemsResult.rows });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to cart
router.post('/items', async (req, res) => {
  try {
    const { cart_id, product_id, website_product_id, variant_id, quantity } = req.body;

    // Get product price
    const productResult = await pool.query('SELECT list_price FROM products WHERE id = $1', [
      product_id,
    ]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const unit_price = productResult.rows[0].list_price;

    // Check if item already exists
    const existingResult = await pool.query(
      'SELECT * FROM website_cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id = COALESCE($3, variant_id)',
      [cart_id, product_id, variant_id]
    );

    let item;
    if (existingResult.rows.length > 0) {
      // Update quantity
      const newQuantity = existingResult.rows[0].quantity + (quantity || 1);
      const updateResult = await pool.query(
        `UPDATE website_cart_items 
         SET quantity = $1, subtotal = $1 * $2
         WHERE id = $3
         RETURNING *`,
        [newQuantity, unit_price, existingResult.rows[0].id]
      );
      item = updateResult.rows[0];
    } else {
      // Create new item
      const insertResult = await pool.query(
        `INSERT INTO website_cart_items (cart_id, product_id, website_product_id, variant_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $5 * $6)
         RETURNING *`,
        [cart_id, product_id, website_product_id, variant_id, quantity || 1, unit_price]
      );
      item = insertResult.rows[0];
    }

    // Recalculate cart totals
    await recalculateCartTotals(cart_id);

    res.json(item);
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cart item
router.put('/items/:id', async (req, res) => {
  try {
    const { quantity } = req.body;

    const result = await pool.query(
      `UPDATE website_cart_items 
       SET quantity = $1, subtotal = quantity * unit_price
       WHERE id = $2
       RETURNING *`,
      [quantity, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Recalculate cart totals
    await recalculateCartTotals(result.rows[0].cart_id);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from cart
router.delete('/items/:id', async (req, res) => {
  try {
    const itemResult = await pool.query('SELECT cart_id FROM website_cart_items WHERE id = $1', [
      req.params.id,
    ]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await pool.query('DELETE FROM website_cart_items WHERE id = $1', [req.params.id]);

    // Recalculate cart totals
    await recalculateCartTotals(itemResult.rows[0].cart_id);

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply promotion code
router.post('/apply-promotion', async (req, res) => {
  try {
    const { cart_id, promotion_code } = req.body;

    // Get promotion
    const promoResult = await pool.query(
      'SELECT * FROM website_promotions WHERE code = $1 AND is_active = true AND valid_from <= CURRENT_TIMESTAMP AND valid_until >= CURRENT_TIMESTAMP',
      [promotion_code]
    );

    if (promoResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired promotion code' });
    }

    const promotion = promoResult.rows[0];

    // Get cart
    const cartResult = await pool.query('SELECT * FROM website_carts WHERE id = $1', [cart_id]);
    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const cart = cartResult.rows[0];

    // Check minimum purchase
    if (cart.subtotal < promotion.min_purchase_amount) {
      return res.status(400).json({
        error: `Minimum purchase amount of ${promotion.min_purchase_amount} required`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (promotion.discount_type === 'percentage') {
      discount = (cart.subtotal * promotion.discount_value) / 100;
    } else if (promotion.discount_type === 'fixed') {
      discount = promotion.discount_value;
    }

    if (promotion.max_discount_amount && discount > promotion.max_discount_amount) {
      discount = promotion.max_discount_amount;
    }

    // Update cart
    await pool.query(
      `UPDATE website_carts 
       SET promotion_code = $1, discount_amount = $2, total = subtotal + tax_amount + shipping_amount - $2
       WHERE id = $3`,
      [promotion_code, discount, cart_id]
    );

    res.json({ message: 'Promotion applied', discount });
  } catch (error) {
    console.error('Error applying promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to recalculate cart totals
async function recalculateCartTotals(cartId: number) {
  const itemsResult = await pool.query(
    'SELECT SUM(subtotal) as subtotal FROM website_cart_items WHERE cart_id = $1',
    [cartId]
  );

  const subtotal = parseFloat(itemsResult.rows[0].subtotal || 0);

  // Get cart to calculate tax and shipping
  const cartResult = await pool.query('SELECT * FROM website_carts WHERE id = $1', [cartId]);
  const cart = cartResult.rows[0];

  // Calculate tax (simplified - would use tax rules in production)
  const taxAmount = subtotal * 0.1; // 10% tax example

  const total = subtotal + taxAmount + (cart.shipping_amount || 0) - (cart.discount_amount || 0);

  await pool.query(
    `UPDATE website_carts 
     SET subtotal = $1, tax_amount = $2, total = $3
     WHERE id = $4`,
    [subtotal, taxAmount, total, cartId]
  );
}

export default router;

