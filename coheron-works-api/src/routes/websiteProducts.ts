import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all website products
router.get('/', async (req, res) => {
  try {
    const { site_id, is_published, category_id, search } = req.query;
    let query = `
      SELECT wp.*, p.name as product_name, p.default_code, p.list_price, p.standard_price, p.qty_available, p.image_url
      FROM website_products wp
      JOIN products p ON wp.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (site_id) {
      query += ` AND wp.site_id = $${paramCount++}`;
      params.push(site_id);
    }

    if (is_published !== undefined) {
      query += ` AND wp.is_published = $${paramCount++}`;
      params.push(is_published === 'true');
    }

    if (category_id) {
      query += ` AND wp.id IN (
        SELECT website_product_id FROM website_product_categories WHERE category_id = $${paramCount}
      )`;
      params.push(category_id);
    }

    if (search) {
      query += ` AND (p.name ILIKE $${paramCount} OR wp.short_description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY wp.display_order, wp.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching website products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wp.*, p.name as product_name, p.default_code, p.list_price, p.standard_price, 
              p.qty_available, p.image_url, p.type, p.categ_id
       FROM website_products wp
       JOIN products p ON wp.product_id = p.id
       WHERE wp.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get variants
    const variants = await pool.query(
      'SELECT * FROM website_product_variants WHERE website_product_id = $1',
      [req.params.id]
    );

    // Get categories
    const categories = await pool.query(
      `SELECT c.* FROM website_categories c
       JOIN website_product_categories pc ON c.id = pc.category_id
       WHERE pc.website_product_id = $1`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      variants: variants.rows,
      categories: categories.rows,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync product from ERP
router.post('/sync', async (req, res) => {
  try {
    const { product_id, site_id } = req.body;

    // Get product from ERP
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found in ERP' });
    }

    const product = productResult.rows[0];

    // Check if website product exists
    const existingResult = await pool.query(
      'SELECT * FROM website_products WHERE product_id = $1 AND site_id = $2',
      [product_id, site_id]
    );

    let websiteProduct;
    if (existingResult.rows.length > 0) {
      // Update existing
      const updateResult = await pool.query(
        `UPDATE website_products 
         SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP
         WHERE product_id = $1 AND site_id = $2
         RETURNING *`,
        [product_id, site_id]
      );
      websiteProduct = updateResult.rows[0];
    } else {
      // Create new
      const insertResult = await pool.query(
        `INSERT INTO website_products (product_id, site_id, sync_status, last_synced_at)
         VALUES ($1, $2, 'synced', CURRENT_TIMESTAMP)
         RETURNING *`,
        [product_id, site_id]
      );
      websiteProduct = insertResult.rows[0];
    }

    res.json(websiteProduct);
  } catch (error) {
    console.error('Error syncing product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update website product
router.put('/:id', async (req, res) => {
  try {
    const {
      is_published,
      is_featured,
      display_order,
      short_description,
      long_description,
      seo_title,
      seo_description,
      seo_keywords,
    } = req.body;

    const result = await pool.query(
      `UPDATE website_products 
       SET is_published = COALESCE($1, is_published),
           is_featured = COALESCE($2, is_featured),
           display_order = COALESCE($3, display_order),
           short_description = COALESCE($4, short_description),
           long_description = COALESCE($5, long_description),
           seo_title = COALESCE($6, seo_title),
           seo_description = COALESCE($7, seo_description),
           seo_keywords = COALESCE($8, seo_keywords)
       WHERE id = $9
       RETURNING *`,
      [
        is_published,
        is_featured,
        display_order,
        short_description,
        long_description,
        seo_title,
        seo_description,
        seo_keywords,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

