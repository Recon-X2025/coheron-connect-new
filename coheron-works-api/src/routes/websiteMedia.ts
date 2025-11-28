import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all media
router.get('/', async (req, res) => {
  try {
    const { site_id, mime_type, search } = req.query;
    let query = 'SELECT * FROM website_media WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (site_id) {
      query += ` AND site_id = $${paramCount++}`;
      params.push(site_id);
    }

    if (mime_type) {
      query += ` AND mime_type LIKE $${paramCount++}`;
      params.push(`%${mime_type}%`);
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR alt_text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get media by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM website_media WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create media (file upload would be handled separately, this is for metadata)
router.post('/', async (req, res) => {
  try {
    const {
      name,
      file_url,
      file_path,
      mime_type,
      file_size,
      width,
      height,
      alt_text,
      description,
      site_id,
      uploaded_by,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO website_media (name, file_url, file_path, mime_type, file_size, width, height, alt_text, description, site_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        name,
        file_url,
        file_path,
        mime_type,
        file_size,
        width,
        height,
        alt_text,
        description,
        site_id,
        uploaded_by,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update media
router.put('/:id', async (req, res) => {
  try {
    const { name, alt_text, description } = req.body;

    const result = await pool.query(
      `UPDATE website_media 
       SET name = COALESCE($1, name),
           alt_text = COALESCE($2, alt_text),
           description = COALESCE($3, description)
       WHERE id = $4
       RETURNING *`,
      [name, alt_text, description, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete media
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM website_media WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

