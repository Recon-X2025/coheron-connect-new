import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// ISSUE COMMENTS CRUD
// ============================================

// Get comments for an issue
router.get('/issues/:issueId/comments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ic.*, 
              u.name as user_name,
              u.email as user_email,
              u.image_url as user_avatar
       FROM issue_comments ic
       LEFT JOIN users u ON ic.user_id = u.id
       WHERE ic.issue_id = $1
       ORDER BY ic.created_at ASC`,
      [req.params.issueId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comment by ID
router.get('/comments/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ic.*, 
              u.name as user_name,
              u.email as user_email
       FROM issue_comments ic
       LEFT JOIN users u ON ic.user_id = u.id
       WHERE ic.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create comment
router.post('/issues/:issueId/comments', async (req, res) => {
  try {
    const { user_id, body } = req.body;

    if (!body || !user_id) {
      return res.status(400).json({ error: 'Body and user_id are required' });
    }

    // Verify issue exists
    const issueCheck = await pool.query('SELECT id FROM issues WHERE id = $1', [
      req.params.issueId,
    ]);

    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const result = await pool.query(
      `INSERT INTO issue_comments (issue_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.issueId, user_id, body]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update comment
router.put('/comments/:id', async (req, res) => {
  try {
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({ error: 'Body is required' });
    }

    const result = await pool.query(
      `UPDATE issue_comments 
       SET body = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [body, req.params.id]
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
router.delete('/comments/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM issue_comments WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

