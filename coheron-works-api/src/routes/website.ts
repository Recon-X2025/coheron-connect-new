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

// Publish page
router.post('/:id/publish', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE website_pages 
       SET status = 'published', is_published = true, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error publishing page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PAYMENT GATEWAYS
// ============================================

// Get all payment gateways
router.get('/payment-gateways', async (req, res) => {
  try {
    const { is_active } = req.query;
    let query = 'SELECT * FROM payment_gateways WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payment gateways:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment gateway by ID
router.get('/payment-gateways/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payment_gateways WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payment gateway:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payment gateway
router.post('/payment-gateways', async (req, res) => {
  try {
    const { name, provider, api_key, api_secret, webhook_secret, is_active, config } = req.body;

    const result = await pool.query(
      `INSERT INTO payment_gateways (name, provider, api_key, api_secret, webhook_secret, is_active, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        provider,
        api_key,
        api_secret,
        webhook_secret,
        is_active !== undefined ? is_active : true,
        config ? JSON.stringify(config) : null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating payment gateway:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Payment gateway name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update payment gateway
router.put('/payment-gateways/:id', async (req, res) => {
  try {
    const { name, provider, api_key, api_secret, webhook_secret, is_active, config } = req.body;

    const result = await pool.query(
      `UPDATE payment_gateways 
       SET name = $1, provider = $2, api_key = $3, api_secret = $4, webhook_secret = $5,
           is_active = $6, config = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        name,
        provider,
        api_key,
        api_secret,
        webhook_secret,
        is_active,
        config ? JSON.stringify(config) : null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating payment gateway:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Payment gateway name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete payment gateway
router.delete('/payment-gateways/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM payment_gateways WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }

    res.json({ message: 'Payment gateway deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment gateway:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test payment gateway connection
router.post('/payment-gateways/:id/test', async (req, res) => {
  try {
    const gatewayResult = await pool.query('SELECT * FROM payment_gateways WHERE id = $1', [
      req.params.id,
    ]);

    if (gatewayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }

    const gateway = gatewayResult.rows[0];
    // TODO: Implement actual gateway test based on provider
    // This is a placeholder
    res.json({ message: 'Connection test successful', gateway: gateway.provider });
  } catch (error) {
    console.error('Error testing payment gateway:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process payment
router.post('/payments/process', async (req, res) => {
  try {
    const { gateway_id, amount, currency, order_id, customer_data, payment_method } = req.body;

    // TODO: Implement actual payment processing based on gateway
    // This is a placeholder
    const transactionId = `TXN-${Date.now()}`;

    res.json({
      success: true,
      transaction_id: transactionId,
      amount,
      currency: currency || 'INR',
      status: 'success',
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process refund
router.post('/payments/refund', async (req, res) => {
  try {
    const { gateway_id, transaction_id, amount, reason } = req.body;

    // TODO: Implement actual refund processing
    // This is a placeholder
    res.json({
      success: true,
      refund_id: `REF-${Date.now()}`,
      amount,
      status: 'refunded',
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SEO TOOLS
// ============================================

// Generate sitemap
router.get('/seo/sitemap', async (req, res) => {
  try {
    const pagesResult = await pool.query(
      "SELECT url, updated_at FROM website_pages WHERE status = 'published'"
    );

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pagesResult.rows
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${new Date(page.updated_at).toISOString()}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get robots.txt
router.get('/seo/robots', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT robots_content FROM website_settings WHERE key = 'robots_txt' LIMIT 1"
    );

    const robotsTxt =
      result.rows.length > 0
        ? result.rows[0].robots_content
        : `User-agent: *
Allow: /
Sitemap: /sitemap.xml`;

    res.setHeader('Content-Type', 'text/plain');
    res.send(robotsTxt);
  } catch (error) {
    console.error('Error fetching robots.txt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update robots.txt
router.put('/seo/robots', async (req, res) => {
  try {
    const { content } = req.body;

    const existing = await pool.query(
      "SELECT id FROM website_settings WHERE key = 'robots_txt' LIMIT 1"
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE website_settings 
         SET robots_content = $1, updated_at = CURRENT_TIMESTAMP
         WHERE key = 'robots_txt'`,
        [content]
      );
    } else {
      await pool.query(
        `INSERT INTO website_settings (key, robots_content)
         VALUES ('robots_txt', $1)`,
        [content]
      );
    }

    res.json({ message: 'robots.txt updated successfully' });
  } catch (error) {
    console.error('Error updating robots.txt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ANALYTICS
// ============================================

// Get pageviews
router.get('/analytics/pageviews', async (req, res) => {
  try {
    const { start_date, end_date, page_id } = req.query;
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as pageviews,
        COUNT(DISTINCT visitor_id) as unique_visitors
      FROM website_analytics
      WHERE event_type = 'pageview'
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND created_at >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND created_at <= $${paramCount++}`;
      params.push(end_date);
    }

    if (page_id) {
      query += ` AND page_id = $${paramCount++}`;
      params.push(page_id);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pageviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sales data
router.get('/analytics/sales', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(amount_total), 0) as revenue
      FROM website_orders
      WHERE status = 'completed'
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND created_at >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND created_at <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track custom event
router.post('/analytics/events', async (req, res) => {
  try {
    const { event_type, page_id, visitor_id, event_data } = req.body;

    await pool.query(
      `INSERT INTO website_analytics (event_type, page_id, visitor_id, event_data)
       VALUES ($1, $2, $3, $4)`,
      [event_type, page_id, visitor_id, event_data ? JSON.stringify(event_data) : null]
    );

    res.json({ message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

