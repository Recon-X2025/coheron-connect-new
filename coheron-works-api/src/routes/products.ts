import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { search, type, sale_ok } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      query += ` AND type = $${paramCount++}`;
      params.push(type);
    }

    if (sale_ok === 'true') {
      // For now, return all products. Can add sale_ok field later
    }

    if (search) {
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const {
      name,
      default_code,
      list_price,
      standard_price,
      qty_available,
      type,
      categ_id,
      image_url,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products (name, default_code, list_price, standard_price, qty_available, type, categ_id, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        default_code,
        list_price || 0,
        standard_price || 0,
        qty_available || 0,
        type || 'product',
        categ_id,
        image_url,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      default_code,
      list_price,
      standard_price,
      qty_available,
      type,
      categ_id,
      image_url,
    } = req.body;

    const result = await pool.query(
      `UPDATE products 
       SET name = $1, default_code = $2, list_price = $3, standard_price = $4, 
           qty_available = $5, type = $6, categ_id = $7, image_url = $8
       WHERE id = $9
       RETURNING *`,
      [
        name,
        default_code,
        list_price,
        standard_price,
        qty_available,
        type,
        categ_id,
        image_url,
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

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

