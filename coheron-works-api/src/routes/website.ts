import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all website pages
router.get('/', async (req, res) => {
  try {
    const { site_id, status, is_published, search } = req.query;
    let query = 'SELECT * FROM website_pages WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (site_id) {
      query += ` AND site_id = $${paramCount++}`;
      params.push(site_id);
    }

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    } else if (is_published !== undefined) {
      // Legacy support
      query += ` AND status = $${paramCount++}`;
      params.push(is_published === 'true' ? 'published' : 'draft');
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR url ILIKE $${paramCount} OR slug ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching website pages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get page by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM website_pages WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create page
router.post('/', async (req, res) => {
  try {
    const {
      name,
      url,
      slug,
      site_id,
      template,
      is_published,
      status,
      content,
      blocks,
      meta_title,
      meta_description,
      meta_keywords,
      canonical_url,
      robots_meta,
      publish_at,
      created_by,
    } = req.body;

    const pageStatus = status || (is_published ? 'published' : 'draft');

    const result = await pool.query(
      `INSERT INTO website_pages (
        name, url, slug, site_id, template, status, is_published, content, blocks,
        meta_title, meta_description, meta_keywords, canonical_url, robots_meta, publish_at, created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        name,
        url,
        slug || url,
        site_id,
        template || 'default',
        pageStatus,
        pageStatus === 'published',
        content,
        JSON.stringify(blocks || []),
        meta_title,
        meta_description,
        meta_keywords,
        canonical_url,
        robots_meta || 'index, follow',
        publish_at,
        created_by,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'URL or slug already exists' });
    }
    console.error('Error creating page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update page
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      url,
      slug,
      template,
      status,
      is_published,
      content,
      blocks,
      meta_title,
      meta_description,
      meta_keywords,
      canonical_url,
      robots_meta,
      publish_at,
      updated_by,
    } = req.body;

    const pageStatus = status || (is_published !== undefined ? (is_published ? 'published' : 'draft') : undefined);

    const result = await pool.query(
      `UPDATE website_pages 
       SET name = COALESCE($1, name),
           url = COALESCE($2, url),
           slug = COALESCE($3, slug),
           template = COALESCE($4, template),
           status = COALESCE($5, status),
           is_published = COALESCE($6, is_published),
           content = COALESCE($7, content),
           blocks = COALESCE($8, blocks),
           meta_title = COALESCE($9, meta_title),
           meta_description = COALESCE($10, meta_description),
           meta_keywords = COALESCE($11, meta_keywords),
           canonical_url = COALESCE($12, canonical_url),
           robots_meta = COALESCE($13, robots_meta),
           publish_at = COALESCE($14, publish_at),
           updated_by = COALESCE($15, updated_by),
           version = version + 1
       WHERE id = $16
       RETURNING *`,
      [
        name,
        url,
        slug,
        template,
        pageStatus,
        pageStatus === 'published',
        content,
        blocks ? JSON.stringify(blocks) : null,
        meta_title,
        meta_description,
        meta_keywords,
        canonical_url,
        robots_meta,
        publish_at,
        updated_by,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete page
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM website_pages WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

