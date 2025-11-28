import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// AUTOMATION RULES
// ============================================

// Get all automation rules
router.get('/', async (req, res) => {
  try {
    const { is_active } = req.query;
    let query = 'SELECT * FROM support_automation_rules WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY execution_order, name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get automation rule by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM support_automation_rules WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching automation rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create automation rule
router.post('/', async (req, res) => {
  try {
    const { name, description, trigger_event, trigger_conditions, actions, is_active, execution_order } = req.body;

    if (!name || !trigger_event || !trigger_conditions || !actions) {
      return res.status(400).json({
        error: 'Name, trigger_event, trigger_conditions, and actions are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO support_automation_rules (
        name, description, trigger_event, trigger_conditions, actions, is_active, execution_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name,
        description,
        trigger_event,
        JSON.stringify(trigger_conditions),
        JSON.stringify(actions),
        is_active !== undefined ? is_active : true,
        execution_order || 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating automation rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update automation rule
router.put('/:id', async (req, res) => {
  try {
    const { name, description, trigger_event, trigger_conditions, actions, is_active, execution_order } = req.body;

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
    if (trigger_event !== undefined) {
      updateFields.push(`trigger_event = $${paramCount++}`);
      params.push(trigger_event);
    }
    if (trigger_conditions !== undefined) {
      updateFields.push(`trigger_conditions = $${paramCount++}`);
      params.push(JSON.stringify(trigger_conditions));
    }
    if (actions !== undefined) {
      updateFields.push(`actions = $${paramCount++}`);
      params.push(JSON.stringify(actions));
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      params.push(is_active);
    }
    if (execution_order !== undefined) {
      updateFields.push(`execution_order = $${paramCount++}`);
      params.push(execution_order);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE support_automation_rules SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating automation rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete automation rule
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM support_automation_rules WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json({ message: 'Automation rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test automation rule (dry run)
router.post('/:id/test', async (req, res) => {
  try {
    const rule = await pool.query('SELECT * FROM support_automation_rules WHERE id = $1', [req.params.id]);

    if (rule.rows.length === 0) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    const { test_ticket } = req.body;

    // This would execute the rule logic without actually applying changes
    // For now, return a simulation
    res.json({
      message: 'Rule would execute',
      conditions_met: true,
      actions_that_would_run: rule.rows[0].actions,
    });
  } catch (error) {
    console.error('Error testing automation rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

