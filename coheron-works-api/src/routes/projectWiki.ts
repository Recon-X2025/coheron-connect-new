import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// KNOWLEDGE SPACES
// ============================================

// Get all spaces
router.get('/spaces', async (req, res) => {
  try {
    const { project_id, is_public } = req.query;
    let query = `
      SELECT ks.*, 
             p.name as project_name,
             u.name as created_by_name,
             COUNT(DISTINCT wp.id) as page_count
      FROM knowledge_spaces ks
      LEFT JOIN projects p ON ks.project_id = p.id
      LEFT JOIN users u ON ks.created_by = u.id
      LEFT JOIN wiki_pages wp ON ks.id = wp.space_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND (ks.project_id = $${paramCount++} OR ks.project_id IS NULL)`;
      params.push(project_id);
    }

    if (is_public !== undefined) {
      query += ` AND ks.is_public = $${paramCount++}`;
      params.push(is_public === 'true');
    }

    query += ' GROUP BY ks.id, p.name, u.name ORDER BY ks.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get space by ID
router.get('/spaces/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ks.*, 
              p.name as project_name,
              u.name as created_by_name
       FROM knowledge_spaces ks
       LEFT JOIN projects p ON ks.project_id = p.id
       LEFT JOIN users u ON ks.created_by = u.id
       WHERE ks.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Space not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching space:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create space
router.post('/spaces', async (req, res) => {
  try {
    const { project_id, space_key, name, description, is_public, created_by } = req.body;

    if (!space_key || !name) {
      return res.status(400).json({ error: 'Space key and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO knowledge_spaces (project_id, space_key, name, description, is_public, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [project_id, space_key, name, description, is_public !== undefined ? is_public : false, created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Space key already exists' });
    }
    console.error('Error creating space:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update space
router.put('/spaces/:id', async (req, res) => {
  try {
    const { name, description, is_public } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = { name, description, is_public };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE knowledge_spaces SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Space not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating space:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete space
router.delete('/spaces/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM knowledge_spaces WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Space not found' });
    }

    res.json({ message: 'Space deleted successfully' });
  } catch (error) {
    console.error('Error deleting space:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WIKI PAGES
// ============================================

// Get pages in a space
router.get('/spaces/:spaceId/pages', async (req, res) => {
  try {
    const { parent_page_id, page_type, is_published } = req.query;
    let query = `
      SELECT wp.*, 
             u1.name as created_by_name,
             u2.name as updated_by_name,
             COUNT(DISTINCT wpc.id) as comment_count
      FROM wiki_pages wp
      LEFT JOIN users u1 ON wp.created_by = u1.id
      LEFT JOIN users u2 ON wp.updated_by = u2.id
      LEFT JOIN wiki_page_comments wpc ON wp.id = wpc.page_id
      WHERE wp.space_id = $1
    `;
    const params: any[] = [req.params.spaceId];
    let paramCount = 2;

    if (parent_page_id !== undefined) {
      if (parent_page_id === null || parent_page_id === 'null') {
        query += ` AND wp.parent_page_id IS NULL`;
      } else {
        query += ` AND wp.parent_page_id = $${paramCount++}`;
        params.push(parent_page_id);
      }
    }

    if (page_type) {
      query += ` AND wp.page_type = $${paramCount++}`;
      params.push(page_type);
    }

    if (is_published !== undefined) {
      query += ` AND wp.is_published = $${paramCount++}`;
      params.push(is_published === 'true');
    }

    query += ' GROUP BY wp.id, u1.name, u2.name ORDER BY wp.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get page by ID with full details
router.get('/pages/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wp.*, 
              u1.name as created_by_name,
              u2.name as updated_by_name,
              ks.name as space_name,
              ks.space_key
       FROM wiki_pages wp
       LEFT JOIN users u1 ON wp.created_by = u1.id
       LEFT JOIN users u2 ON wp.updated_by = u2.id
       LEFT JOIN knowledge_spaces ks ON wp.space_id = ks.id
       WHERE wp.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const page = result.rows[0];

    // Get child pages
    const childrenResult = await pool.query(
      'SELECT * FROM wiki_pages WHERE parent_page_id = $1 ORDER BY title',
      [req.params.id]
    );

    // Get labels
    const labelsResult = await pool.query(
      'SELECT label FROM wiki_page_labels WHERE page_id = $1',
      [req.params.id]
    );

    // Get attachments
    const attachmentsResult = await pool.query(
      `SELECT wpa.*, u.name as uploaded_by_name
       FROM wiki_page_attachments wpa
       LEFT JOIN users u ON wpa.uploaded_by = u.id
       WHERE wpa.page_id = $1
       ORDER BY wpa.created_at`,
      [req.params.id]
    );

    // Get comments
    const commentsResult = await pool.query(
      `SELECT wpc.*, u.name as user_name, u.email as user_email
       FROM wiki_page_comments wpc
       LEFT JOIN users u ON wpc.user_id = u.id
       WHERE wpc.page_id = $1
       ORDER BY wpc.created_at`,
      [req.params.id]
    );

    // Get version history
    const versionsResult = await pool.query(
      `SELECT wpv.*, u.name as created_by_name
       FROM wiki_page_versions wpv
       LEFT JOIN users u ON wpv.created_by = u.id
       WHERE wpv.page_id = $1
       ORDER BY wpv.version DESC`,
      [req.params.id]
    );

    res.json({
      ...page,
      children: childrenResult.rows,
      labels: labelsResult.rows.map((r) => r.label),
      attachments: attachmentsResult.rows,
      comments: commentsResult.rows,
      versions: versionsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create page
router.post('/spaces/:spaceId/pages', async (req, res) => {
  try {
    const {
      parent_page_id,
      title,
      content,
      page_type,
      template_id,
      is_published,
      created_by,
      updated_by,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const result = await pool.query(
      `INSERT INTO wiki_pages (
        space_id, parent_page_id, title, content, page_type,
        template_id, is_published, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.params.spaceId,
        parent_page_id,
        title,
        content,
        page_type || 'page',
        template_id,
        is_published !== undefined ? is_published : true,
        created_by,
        updated_by || created_by,
      ]
    );

    // Create initial version
    await pool.query(
      `INSERT INTO wiki_page_versions (page_id, version, title, content, created_by)
       VALUES ($1, 1, $2, $3, $4)`,
      [result.rows[0].id, title, content, created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update page
router.put('/pages/:id', async (req, res) => {
  try {
    const {
      parent_page_id,
      title,
      content,
      page_type,
      is_published,
      updated_by,
    } = req.body;

    // Get current page to create new version
    const currentPage = await pool.query(
      'SELECT title, content, version FROM wiki_pages WHERE id = $1',
      [req.params.id]
    );

    if (currentPage.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = { parent_page_id, title, content, page_type, is_published, updated_by };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    // Increment version if content or title changed
    if (content !== undefined || title !== undefined) {
      updateFields.push(`version = version + 1`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE wiki_pages SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    // Create new version if content or title changed
    if ((content !== undefined || title !== undefined) && updated_by) {
      const newVersion = currentPage.rows[0].version + 1;
      await pool.query(
        `INSERT INTO wiki_page_versions (page_id, version, title, content, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.params.id,
          newVersion,
          title !== undefined ? title : currentPage.rows[0].title,
          content !== undefined ? content : currentPage.rows[0].content,
          updated_by,
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete page
router.delete('/pages/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM wiki_pages WHERE id = $1 RETURNING id', [
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

// ============================================
// PAGE LABELS
// ============================================

// Add label to page
router.post('/pages/:id/labels', async (req, res) => {
  try {
    const { label } = req.body;

    const result = await pool.query(
      `INSERT INTO wiki_page_labels (page_id, label)
       VALUES ($1, $2)
       ON CONFLICT (page_id, label) DO NOTHING
       RETURNING *`,
      [req.params.id, label]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Label already exists' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove label from page
router.delete('/pages/:id/labels/:label', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM wiki_page_labels WHERE page_id = $1 AND label = $2 RETURNING id',
      [req.params.id, req.params.label]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json({ message: 'Label removed successfully' });
  } catch (error) {
    console.error('Error removing label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PAGE COMMENTS
// ============================================

// Add comment to page
router.post('/pages/:id/comments', async (req, res) => {
  try {
    const { user_id, comment_text, parent_comment_id } = req.body;

    const result = await pool.query(
      `INSERT INTO wiki_page_comments (page_id, user_id, comment_text, parent_comment_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, user_id, comment_text, parent_comment_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update comment
router.put('/page-comments/:id', async (req, res) => {
  try {
    const { comment_text } = req.body;

    const result = await pool.query(
      `UPDATE wiki_page_comments 
       SET comment_text = $1 
       WHERE id = $2
       RETURNING *`,
      [comment_text, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment
router.delete('/page-comments/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM wiki_page_comments WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PAGE PERMISSIONS
// ============================================

// Get page permissions
router.get('/pages/:id/permissions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wpp.*, u.name as user_name, u.email as user_email
       FROM wiki_page_permissions wpp
       LEFT JOIN users u ON wpp.user_id = u.id
       WHERE wpp.page_id = $1
       ORDER BY wpp.created_at`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add permission
router.post('/pages/:id/permissions', async (req, res) => {
  try {
    const { user_id, permission_type } = req.body;

    const result = await pool.query(
      `INSERT INTO wiki_page_permissions (page_id, user_id, permission_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (page_id, user_id) 
       DO UPDATE SET permission_type = EXCLUDED.permission_type
       RETURNING *`,
      [req.params.id, user_id, permission_type || 'read']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding permission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove permission
router.delete('/pages/:id/permissions/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM wiki_page_permissions WHERE page_id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.params.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json({ message: 'Permission removed successfully' });
  } catch (error) {
    console.error('Error removing permission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SEARCH
// ============================================

// Search pages
router.get('/pages/search', async (req, res) => {
  try {
    const { q, space_id, label } = req.query;
    let query = `
      SELECT DISTINCT wp.*, 
             ks.name as space_name,
             u1.name as created_by_name
      FROM wiki_pages wp
      LEFT JOIN knowledge_spaces ks ON wp.space_id = ks.id
      LEFT JOIN users u1 ON wp.created_by = u1.id
      LEFT JOIN wiki_page_labels wpl ON wp.id = wpl.page_id
      WHERE wp.is_published = true
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (q) {
      query += ` AND (wp.title ILIKE $${paramCount} OR wp.content ILIKE $${paramCount})`;
      params.push(`%${q}%`);
      paramCount++;
    }

    if (space_id) {
      query += ` AND wp.space_id = $${paramCount++}`;
      params.push(space_id);
    }

    if (label) {
      query += ` AND wpl.label = $${paramCount++}`;
      params.push(label);
    }

    query += ' ORDER BY wp.updated_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching pages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

