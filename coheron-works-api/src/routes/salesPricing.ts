import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// PRICE LISTS
// ============================================

// Get all price lists
router.get('/price-lists', async (req, res) => {
  try {
    const { is_active, currency } = req.query;
    let query = 'SELECT * FROM price_lists WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (currency) {
      query += ` AND currency = $${paramCount++}`;
      params.push(currency);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching price lists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get price list by ID
router.get('/price-lists/:id', async (req, res) => {
  try {
    const listResult = await pool.query('SELECT * FROM price_lists WHERE id = $1', [req.params.id]);
    
    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: 'Price list not found' });
    }

    const pricesResult = await pool.query(
      'SELECT pp.*, p.name as product_name FROM product_prices pp JOIN products p ON pp.product_id = p.id WHERE pp.price_list_id = $1 ORDER BY p.name',
      [req.params.id]
    );

    res.json({
      ...listResult.rows[0],
      products: pricesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching price list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create price list
router.post('/price-lists', async (req, res) => {
  try {
    const { name, currency, is_active, valid_from, valid_until, is_default, products } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If this is set as default, unset other defaults
      if (is_default) {
        await client.query('UPDATE price_lists SET is_default = false WHERE is_default = true');
      }

      const result = await client.query(
        `INSERT INTO price_lists (name, currency, is_active, valid_from, valid_until, is_default)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, currency || 'INR', is_active !== false, valid_from, valid_until, is_default || false]
      );

      const priceList = result.rows[0];

      // Add products if provided
      if (products && products.length > 0) {
        for (const product of products) {
          await client.query(
            `INSERT INTO product_prices (price_list_id, product_id, price, min_quantity, valid_from, valid_until)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              priceList.id,
              product.product_id,
              product.price,
              product.min_quantity || 1,
              product.valid_from || valid_from,
              product.valid_until || valid_until,
            ]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(priceList);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating price list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update price list
router.put('/price-lists/:id', async (req, res) => {
  try {
    const { name, currency, is_active, valid_from, valid_until, is_default } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (is_default) {
        await client.query('UPDATE price_lists SET is_default = false WHERE is_default = true AND id != $1', [req.params.id]);
      }

      const result = await client.query(
        `UPDATE price_lists 
         SET name = COALESCE($1, name),
             currency = COALESCE($2, currency),
             is_active = COALESCE($3, is_active),
             valid_from = $4,
             valid_until = $5,
             is_default = COALESCE($6, is_default),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [name, currency, is_active, valid_from, valid_until, is_default, req.params.id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Price list not found' });
      }

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating price list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add/Update product price in price list
router.post('/price-lists/:id/products', async (req, res) => {
  try {
    const { product_id, price, min_quantity, valid_from, valid_until } = req.body;

    const result = await pool.query(
      `INSERT INTO product_prices (price_list_id, product_id, price, min_quantity, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (price_list_id, product_id, min_quantity) 
       DO UPDATE SET price = EXCLUDED.price, valid_from = EXCLUDED.valid_from, valid_until = EXCLUDED.valid_until, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.params.id, product_id, price, min_quantity || 1, valid_from, valid_until]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding product price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// CUSTOMER-SPECIFIC PRICING
// ============================================

// Get customer prices
router.get('/customer-prices/:partnerId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cp.*, p.name as product_name 
       FROM customer_prices cp 
       JOIN products p ON cp.product_id = p.id 
       WHERE cp.partner_id = $1 
       ORDER BY p.name`,
      [req.params.partnerId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer prices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set customer price
router.post('/customer-prices', async (req, res) => {
  try {
    const { partner_id, product_id, price, valid_from, valid_until } = req.body;

    const result = await pool.query(
      `INSERT INTO customer_prices (partner_id, product_id, price, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (partner_id, product_id) 
       DO UPDATE SET price = EXCLUDED.price, valid_from = EXCLUDED.valid_from, valid_until = EXCLUDED.valid_until, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [partner_id, product_id, price, valid_from, valid_until]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error setting customer price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PRICING RULES
// ============================================

// Get all pricing rules
router.get('/pricing-rules', async (req, res) => {
  try {
    const { is_active, rule_type } = req.query;
    let query = 'SELECT * FROM pricing_rules WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (rule_type) {
      query += ` AND rule_type = $${paramCount++}`;
      params.push(rule_type);
    }

    query += ' ORDER BY priority ASC, created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create pricing rule
router.post('/pricing-rules', async (req, res) => {
  try {
    const {
      name,
      rule_type,
      conditions,
      discount_type,
      discount_value,
      formula,
      priority,
      is_active,
      valid_from,
      valid_until,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pricing_rules (name, rule_type, conditions, discount_type, discount_value, formula, priority, is_active, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name,
        rule_type,
        JSON.stringify(conditions),
        discount_type,
        discount_value,
        formula,
        priority || 10,
        is_active !== false,
        valid_from,
        valid_until,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate price for product (applies all rules)
router.post('/calculate-price', async (req, res) => {
  try {
    const { product_id, partner_id, quantity, price_list_id } = req.body;

    // Get base price
    let basePrice = 0;
    
    // Try customer-specific price first
    if (partner_id) {
      const customerPrice = await pool.query(
        'SELECT price FROM customer_prices WHERE partner_id = $1 AND product_id = $2 AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)',
        [partner_id, product_id]
      );
      if (customerPrice.rows.length > 0) {
        basePrice = parseFloat(customerPrice.rows[0].price);
      }
    }

    // If no customer price, get from price list
    if (basePrice === 0 && price_list_id) {
      const priceListPrice = await pool.query(
        'SELECT price FROM product_prices WHERE price_list_id = $1 AND product_id = $2 AND min_quantity <= $3 ORDER BY min_quantity DESC LIMIT 1',
        [price_list_id, product_id, quantity || 1]
      );
      if (priceListPrice.rows.length > 0) {
        basePrice = parseFloat(priceListPrice.rows[0].price);
      }
    }

    // If still no price, get standard price
    if (basePrice === 0) {
      const standardPrice = await pool.query('SELECT list_price FROM products WHERE id = $1', [product_id]);
      if (standardPrice.rows.length > 0) {
        basePrice = parseFloat(standardPrice.rows[0].list_price);
      }
    }

    // Apply pricing rules
    const rules = await pool.query(
      `SELECT * FROM pricing_rules 
       WHERE is_active = true 
       AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
       AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
       ORDER BY priority ASC`
    );

    let finalPrice = basePrice;
    let appliedRules: any[] = [];

    for (const rule of rules.rows) {
      const conditions = rule.conditions;
      let matches = true;

      // Check conditions (simplified - can be enhanced)
      if (conditions) {
        if (conditions.min_quantity && quantity < conditions.min_quantity) matches = false;
        if (conditions.max_quantity && quantity > conditions.max_quantity) matches = false;
        if (conditions.customer_segment && partner_id) {
          // Check customer segment (would need partner segment field)
        }
      }

      if (matches) {
        if (rule.discount_type === 'percentage') {
          finalPrice = finalPrice * (1 - (rule.discount_value / 100));
        } else if (rule.discount_type === 'fixed') {
          finalPrice = finalPrice - rule.discount_value;
        }
        appliedRules.push({ rule_id: rule.id, rule_name: rule.name });
      }
    }

    res.json({
      base_price: basePrice,
      final_price: Math.max(0, finalPrice),
      quantity: quantity || 1,
      total: Math.max(0, finalPrice) * (quantity || 1),
      applied_rules: appliedRules,
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DISCOUNT APPROVAL RULES
// ============================================

// Get discount approval rules
router.get('/discount-approval-rules', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM discount_approval_rules WHERE is_active = true ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching discount approval rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if discount requires approval
router.post('/check-discount-approval', async (req, res) => {
  try {
    const { discount_percentage, discount_amount, order_total } = req.body;

    const rules = await pool.query('SELECT * FROM discount_approval_rules WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
    
    if (rules.rows.length === 0) {
      return res.json({ requires_approval: false });
    }

    const rule = rules.rows[0];
    let requiresApproval = false;

    if (rule.max_discount_percentage && discount_percentage > rule.max_discount_percentage) {
      requiresApproval = true;
    }

    if (rule.max_discount_amount && discount_amount > rule.max_discount_amount) {
      requiresApproval = true;
    }

    res.json({
      requires_approval: requiresApproval,
      approver_id: rule.approver_id,
      approval_workflow: rule.approval_workflow,
    });
  } catch (error) {
    console.error('Error checking discount approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PROMOTIONAL PRICING
// ============================================

// Get active promotions
router.get('/promotions', async (req, res) => {
  try {
    const { product_id } = req.query;
    let query = `SELECT * FROM promotional_pricing 
                 WHERE is_active = true 
                 AND valid_from <= CURRENT_TIMESTAMP 
                 AND valid_until >= CURRENT_TIMESTAMP`;
    const params: any[] = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND $${paramCount} = ANY(product_ids)`;
      params.push(parseInt(product_id as string));
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create promotion
router.post('/promotions', async (req, res) => {
  try {
    const { name, campaign_name, product_ids, discount_type, discount_value, buy_x_get_y_config, valid_from, valid_until } = req.body;

    const result = await pool.query(
      `INSERT INTO promotional_pricing (name, campaign_name, product_ids, discount_type, discount_value, buy_x_get_y_config, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        campaign_name,
        product_ids,
        discount_type,
        discount_value,
        JSON.stringify(buy_x_get_y_config),
        valid_from,
        valid_until,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

