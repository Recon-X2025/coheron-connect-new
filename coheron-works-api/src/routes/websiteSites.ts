import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all sites
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM website_sites ORDER BY is_default DESC, created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get site by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM website_sites WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create site
router.post('/', async (req, res) => {
  try {
    const { name, domain, subdomain, locale, theme, settings, is_active, is_default } = req.body;

    // If this is set as default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE website_sites SET is_default = false');
    }

    const result = await pool.query(
      `INSERT INTO website_sites (name, domain, subdomain, locale, theme, settings, is_active, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, domain, subdomain, locale || 'en_US', theme || 'default', settings || '{}', is_active !== false, is_default || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Domain already exists' });
    }
    console.error('Error creating site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update site
router.put('/:id', async (req, res) => {
  try {
    const { name, domain, subdomain, locale, theme, settings, is_active, is_default } = req.body;

    // If this is set as default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE website_sites SET is_default = false WHERE id != $1', [
        req.params.id,
      ]);
    }

    const result = await pool.query(
      `UPDATE website_sites 
       SET name = COALESCE($1, name),
           domain = COALESCE($2, domain),
           subdomain = COALESCE($3, subdomain),
           locale = COALESCE($4, locale),
           theme = COALESCE($5, theme),
           settings = COALESCE($6, settings),
           is_active = COALESCE($7, is_active),
           is_default = COALESCE($8, is_default)
       WHERE id = $9
       RETURNING *`,
      [name, domain, subdomain, locale, theme, settings, is_active, is_default, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete site
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM website_sites WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Error deleting site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

