import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// ISSUE ATTACHMENTS CRUD
// ============================================

// Get attachments for an issue
router.get('/issues/:issueId/attachments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ia.*, 
              u.name as uploaded_by_name
       FROM issue_attachments ia
       LEFT JOIN users u ON ia.uploaded_by = u.id
       WHERE ia.issue_id = $1
       ORDER BY ia.created_at DESC`,
      [req.params.issueId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attachment by ID
router.get('/attachments/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ia.*, 
              u.name as uploaded_by_name
       FROM issue_attachments ia
       LEFT JOIN users u ON ia.uploaded_by = u.id
       WHERE ia.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching attachment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create attachment (file upload handled by multer or similar middleware)
router.post('/issues/:issueId/attachments', async (req, res) => {
  try {
    const { filename, file_path, file_size, mime_type, uploaded_by } = req.body;

    if (!filename || !file_path || !uploaded_by) {
      return res.status(400).json({ error: 'Filename, file_path, and uploaded_by are required' });
    }

    // Verify issue exists
    const issueCheck = await pool.query('SELECT id FROM issues WHERE id = $1', [
      req.params.issueId,
    ]);

    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const result = await pool.query(
      `INSERT INTO issue_attachments (
        issue_id, filename, file_path, file_size, mime_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [req.params.issueId, filename, file_path, file_size, mime_type, uploaded_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating attachment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete attachment
router.delete('/attachments/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM issue_attachments WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

