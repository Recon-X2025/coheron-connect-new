import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// ISSUE TYPES CRUD
// ============================================

// Get all issue types
router.get('/issue-types', async (req, res) => {
  try {
    const { is_active } = req.query;
    let query = 'SELECT * FROM issue_types WHERE 1=1';
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
    console.error('Error fetching issue types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get issue type by ID
router.get('/issue-types/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM issue_types WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching issue type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create issue type
router.post('/issue-types', async (req, res) => {
  try {
    const { name, icon, description, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO issue_types (name, icon, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, icon, description, is_active !== undefined ? is_active : true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Issue type name already exists' });
    }
    console.error('Error creating issue type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update issue type
router.put('/issue-types/:id', async (req, res) => {
  try {
    const { name, icon, description, is_active } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (icon !== undefined) {
      updateFields.push(`icon = $${paramCount++}`);
      params.push(icon);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE issue_types SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue type not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Issue type name already exists' });
    }
    console.error('Error updating issue type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete issue type (soft delete by setting is_active to false)
router.delete('/issue-types/:id', async (req, res) => {
  try {
    // Check if issue type is used by any issues
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM issues WHERE issue_type_id = $1',
      [req.params.id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      // Soft delete
      const result = await pool.query(
        'UPDATE issue_types SET is_active = false WHERE id = $1 RETURNING *',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Issue type not found' });
      }

      return res.json({ message: 'Issue type deactivated (still in use)', data: result.rows[0] });
    }

    // Hard delete if not in use
    const result = await pool.query('DELETE FROM issue_types WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue type not found' });
    }

    res.json({ message: 'Issue type deleted successfully' });
  } catch (error) {
    console.error('Error deleting issue type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

