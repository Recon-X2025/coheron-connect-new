import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Marketing Workflows
router.get('/workflows', async (req, res) => {
  try {
    const { campaign_id } = req.query;
    let query = 'SELECT * FROM marketing_workflows WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (campaign_id) {
      query += ` AND campaign_id = $${paramCount++}`;
      params.push(campaign_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const workflows = result.rows.map((w) => ({
      ...w,
      steps: typeof w.steps === 'string' ? JSON.parse(w.steps) : w.steps,
      trigger_conditions: typeof w.trigger_conditions === 'string' ? JSON.parse(w.trigger_conditions) : w.trigger_conditions,
    }));

    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/workflows', async (req, res) => {
  try {
    const { name, campaign_id, trigger_type, trigger_conditions, steps, is_active } = req.body;

    const result = await pool.query(
      `INSERT INTO marketing_workflows (name, campaign_id, trigger_type, trigger_conditions, steps, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        campaign_id,
        trigger_type,
        JSON.stringify(trigger_conditions || {}),
        JSON.stringify(steps || []),
        is_active !== undefined ? is_active : true,
      ]
    );

    const workflow = result.rows[0];
    workflow.steps = typeof workflow.steps === 'string' ? JSON.parse(workflow.steps) : workflow.steps;
    workflow.trigger_conditions = typeof workflow.trigger_conditions === 'string' ? JSON.parse(workflow.trigger_conditions) : workflow.trigger_conditions;

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/workflows/:id', async (req, res) => {
  try {
    const { name, trigger_type, trigger_conditions, steps, is_active } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (trigger_type !== undefined) {
      updates.push(`trigger_type = $${paramCount++}`);
      values.push(trigger_type);
    }
    if (trigger_conditions !== undefined) {
      updates.push(`trigger_conditions = $${paramCount++}`);
      values.push(JSON.stringify(trigger_conditions));
    }
    if (steps !== undefined) {
      updates.push(`steps = $${paramCount++}`);
      values.push(JSON.stringify(steps));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE marketing_workflows 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflow = result.rows[0];
    workflow.steps = typeof workflow.steps === 'string' ? JSON.parse(workflow.steps) : workflow.steps;
    workflow.trigger_conditions = typeof workflow.trigger_conditions === 'string' ? JSON.parse(workflow.trigger_conditions) : workflow.trigger_conditions;

    res.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Campaign Performance
router.get('/campaigns/:id/performance', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM campaign_performance WHERE campaign_id = $1 ORDER BY date DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Campaign Financials
router.get('/campaigns/:id/financials', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM campaign_financials WHERE campaign_id = $1 ORDER BY transaction_date DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching financials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

