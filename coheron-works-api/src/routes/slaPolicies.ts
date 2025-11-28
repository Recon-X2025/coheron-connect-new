import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SLA POLICIES
// ============================================

// Get all SLA policies
router.get('/', async (req, res) => {
  try {
    const { is_active, priority } = req.query;
    let query = 'SELECT * FROM sla_policies WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (priority) {
      query += ` AND priority = $${paramCount++}`;
      params.push(priority);
    }

    query += ' ORDER BY priority, name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SLA policies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get SLA policy by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sla_policies WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SLA policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching SLA policy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create SLA policy
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      priority,
      first_response_time_minutes,
      resolution_time_minutes,
      business_hours_only,
      working_hours,
      timezone,
    } = req.body;

    if (!name || !priority || !first_response_time_minutes || !resolution_time_minutes) {
      return res.status(400).json({
        error: 'Name, priority, first_response_time_minutes, and resolution_time_minutes are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO sla_policies (
        name, description, priority, first_response_time_minutes,
        resolution_time_minutes, business_hours_only, working_hours, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        name,
        description,
        priority,
        first_response_time_minutes,
        resolution_time_minutes,
        business_hours_only || false,
        working_hours || null,
        timezone || 'UTC',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating SLA policy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update SLA policy
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      priority,
      first_response_time_minutes,
      resolution_time_minutes,
      business_hours_only,
      working_hours,
      timezone,
      is_active,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      params.push(priority);
    }
    if (first_response_time_minutes !== undefined) {
      updateFields.push(`first_response_time_minutes = $${paramCount++}`);
      params.push(first_response_time_minutes);
    }
    if (resolution_time_minutes !== undefined) {
      updateFields.push(`resolution_time_minutes = $${paramCount++}`);
      params.push(resolution_time_minutes);
    }
    if (business_hours_only !== undefined) {
      updateFields.push(`business_hours_only = $${paramCount++}`);
      params.push(business_hours_only);
    }
    if (working_hours !== undefined) {
      updateFields.push(`working_hours = $${paramCount++}`);
      params.push(working_hours);
    }
    if (timezone !== undefined) {
      updateFields.push(`timezone = $${paramCount++}`);
      params.push(timezone);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE sla_policies SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SLA policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating SLA policy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete SLA policy
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sla_policies WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SLA policy not found' });
    }

    res.json({ message: 'SLA policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting SLA policy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

