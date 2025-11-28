import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// KNOWLEDGE BASE ARTICLES
// ============================================

// Get all articles
router.get('/articles', async (req, res) => {
  try {
    const { status, category_id, is_public, search, article_type } = req.query;
    let query = `
      SELECT ka.*, 
             cat.name as category_name,
             u.name as author_name,
             COUNT(DISTINCT kar.id) as revision_count
      FROM kb_articles ka
      LEFT JOIN ticket_categories cat ON ka.category_id = cat.id
      LEFT JOIN users u ON ka.author_id = u.id
      LEFT JOIN kb_article_revisions kar ON ka.id = kar.article_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND ka.status = $${paramCount++}`;
      params.push(status);
    }

    if (category_id) {
      query += ` AND ka.category_id = $${paramCount++}`;
      params.push(category_id);
    }

    if (is_public !== undefined) {
      query += ` AND ka.is_public = $${paramCount++}`;
      params.push(is_public === 'true');
    }

    if (article_type) {
      query += ` AND ka.article_type = $${paramCount++}`;
      params.push(article_type);
    }

    if (search) {
      query += ` AND (ka.title ILIKE $${paramCount} OR ka.content ILIKE $${paramCount} OR ka.summary ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' GROUP BY ka.id, cat.name, u.name ORDER BY ka.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get article by ID or slug
router.get('/articles/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);

    const query = isNumeric
      ? 'SELECT * FROM kb_articles WHERE id = $1'
      : 'SELECT * FROM kb_articles WHERE slug = $1';

    const result = await pool.query(query, [identifier]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = result.rows[0];

    // Get revisions
    const revisionsResult = await pool.query(
      `SELECT kar.*, u.name as created_by_name
       FROM kb_article_revisions kar
       LEFT JOIN users u ON kar.created_by = u.id
       WHERE kar.article_id = $1
       ORDER BY kar.revision_number DESC`,
      [article.id]
    );

    // Get attachments
    const attachmentsResult = await pool.query(
      `SELECT kaa.*, u.name as uploaded_by_name
       FROM kb_article_attachments kaa
       LEFT JOIN users u ON kaa.uploaded_by = u.id
       WHERE kaa.article_id = $1
       ORDER BY kaa.created_at`,
      [article.id]
    );

    // Increment view count
    await pool.query('UPDATE kb_articles SET view_count = view_count + 1 WHERE id = $1', [article.id]);

    res.json({
      ...article,
      revisions: revisionsResult.rows,
      attachments: attachmentsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create article
router.post('/articles', async (req, res) => {
  try {
    const {
      title,
      content,
      summary,
      category_id,
      parent_article_id,
      article_type,
      is_public,
      tags,
      meta_keywords,
      meta_description,
      author_id,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existingSlug = await pool.query('SELECT id FROM kb_articles WHERE slug = $1', [slug]);
    let finalSlug = slug;
    if (existingSlug.rows.length > 0) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const result = await pool.query(
      `INSERT INTO kb_articles (
        title, slug, content, summary, category_id, parent_article_id,
        article_type, status, is_public, tags, meta_keywords, meta_description, author_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        title,
        finalSlug,
        content,
        summary,
        category_id,
        parent_article_id,
        article_type || 'article',
        'draft',
        is_public !== undefined ? is_public : true,
        tags || [],
        meta_keywords,
        meta_description,
        author_id,
      ]
    );

    // Create initial revision
    await pool.query(
      `INSERT INTO kb_article_revisions (article_id, revision_number, title, content, created_by)
       VALUES ($1, 1, $2, $3, $4)`,
      [result.rows[0].id, title, content, author_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update article
router.put('/articles/:id', async (req, res) => {
  try {
    const {
      title,
      content,
      summary,
      category_id,
      status,
      is_public,
      tags,
      meta_keywords,
      meta_description,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      params.push(title);
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramCount++}`);
      params.push(content);
    }
    if (summary !== undefined) {
      updateFields.push(`summary = $${paramCount++}`);
      params.push(summary);
    }
    if (category_id !== undefined) {
      updateFields.push(`category_id = $${paramCount++}`);
      params.push(category_id);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (is_public !== undefined) {
      updateFields.push(`is_public = $${paramCount++}`);
      params.push(is_public);
    }
    if (tags !== undefined) {
      updateFields.push(`tags = $${paramCount++}`);
      params.push(tags);
    }
    if (meta_keywords !== undefined) {
      updateFields.push(`meta_keywords = $${paramCount++}`);
      params.push(meta_keywords);
    }
    if (meta_description !== undefined) {
      updateFields.push(`meta_description = $${paramCount++}`);
      params.push(meta_description);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE kb_articles SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Create new revision if content changed
    if (content !== undefined || title !== undefined) {
      const currentArticle = result.rows[0];
      const maxRevision = await pool.query(
        'SELECT MAX(revision_number) as max FROM kb_article_revisions WHERE article_id = $1',
        [req.params.id]
      );
      const nextRevision = (maxRevision.rows[0]?.max || 0) + 1;

      await pool.query(
        `INSERT INTO kb_article_revisions (article_id, revision_number, title, content, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.params.id, nextRevision, currentArticle.title, currentArticle.content, req.body.updated_by || null]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate article (helpful/not helpful)
router.post('/articles/:id/rate', async (req, res) => {
  try {
    const { is_helpful } = req.body;

    if (is_helpful === true) {
      await pool.query('UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = $1', [
        req.params.id,
      ]);
    } else if (is_helpful === false) {
      await pool.query('UPDATE kb_articles SET not_helpful_count = not_helpful_count + 1 WHERE id = $1', [
        req.params.id,
      ]);
    }

    res.json({ message: 'Rating recorded' });
  } catch (error) {
    console.error('Error rating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TICKET CHANNELS
// ============================================

// Get all channels
router.get('/channels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ticket_channels WHERE is_active = true ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create channel
router.post('/channels', async (req, res) => {
  try {
    const { name, channel_type, config } = req.body;

    if (!name || !channel_type) {
      return res.status(400).json({ error: 'Name and channel_type are required' });
    }

    const result = await pool.query(
      `INSERT INTO ticket_channels (name, channel_type, config)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, channel_type, config ? JSON.stringify(config) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TICKET CATEGORIES
// ============================================

// Get all categories (with hierarchy)
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tc.*, 
              COUNT(DISTINCT t.id) as ticket_count,
              COUNT(DISTINCT ka.id) as article_count
       FROM ticket_categories tc
       LEFT JOIN support_tickets t ON tc.id = t.category_id
       LEFT JOIN kb_articles ka ON tc.id = ka.category_id
       WHERE tc.is_active = true
       GROUP BY tc.id
       ORDER BY tc.name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, parent_id, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO ticket_categories (name, parent_id, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, parent_id, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

