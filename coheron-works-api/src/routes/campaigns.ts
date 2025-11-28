import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const { campaign_type, state, search } = req.query;
    let query = 'SELECT * FROM campaigns WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (campaign_type) {
      query += ` AND campaign_type = $${paramCount++}`;
      params.push(campaign_type);
    }

    if (state) {
      query += ` AND state = $${paramCount++}`;
      params.push(state);
    }

    if (search) {
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create campaign
router.post('/', async (req, res) => {
  try {
    const {
      name,
      campaign_type,
      objective,
      state,
      start_date,
      end_date,
      budget,
      budget_limit,
      expected_revenue,
      target_kpis,
      audience_segment_id,
      description,
      user_id,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO campaigns (
        name, campaign_type, objective, state, start_date, end_date, 
        budget, budget_limit, expected_revenue, target_kpis, 
        audience_segment_id, description, user_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        name,
        campaign_type || 'email',
        objective,
        state || 'draft',
        start_date,
        end_date,
        budget || 0,
        budget_limit || 0,
        expected_revenue || 0,
        target_kpis ? JSON.stringify(target_kpis) : null,
        audience_segment_id || null,
        description || null,
        user_id || 1,
      ]
    );

    const campaign = result.rows[0];
    if (campaign.target_kpis) {
      campaign.target_kpis = typeof campaign.target_kpis === 'string' 
        ? JSON.parse(campaign.target_kpis) 
        : campaign.target_kpis;
    }

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update campaign
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      campaign_type,
      objective,
      state,
      start_date,
      end_date,
      budget,
      budget_limit,
      revenue,
      expected_revenue,
      total_cost,
      clicks,
      impressions,
      leads_count,
      target_kpis,
      audience_segment_id,
      description,
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (campaign_type !== undefined) {
      updates.push(`campaign_type = $${paramCount++}`);
      values.push(campaign_type);
    }
    if (objective !== undefined) {
      updates.push(`objective = $${paramCount++}`);
      values.push(objective);
    }
    if (state !== undefined) {
      updates.push(`state = $${paramCount++}`);
      values.push(state);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(end_date);
    }
    if (budget !== undefined) {
      updates.push(`budget = $${paramCount++}`);
      values.push(budget);
    }
    if (budget_limit !== undefined) {
      updates.push(`budget_limit = $${paramCount++}`);
      values.push(budget_limit);
    }
    if (revenue !== undefined) {
      updates.push(`revenue = $${paramCount++}`);
      values.push(revenue);
    }
    if (expected_revenue !== undefined) {
      updates.push(`expected_revenue = $${paramCount++}`);
      values.push(expected_revenue);
    }
    if (total_cost !== undefined) {
      updates.push(`total_cost = $${paramCount++}`);
      values.push(total_cost);
    }
    if (clicks !== undefined) {
      updates.push(`clicks = $${paramCount++}`);
      values.push(clicks);
    }
    if (impressions !== undefined) {
      updates.push(`impressions = $${paramCount++}`);
      values.push(impressions);
    }
    if (leads_count !== undefined) {
      updates.push(`leads_count = $${paramCount++}`);
      values.push(leads_count);
    }
    if (target_kpis !== undefined) {
      updates.push(`target_kpis = $${paramCount++}`);
      values.push(JSON.stringify(target_kpis));
    }
    if (audience_segment_id !== undefined) {
      updates.push(`audience_segment_id = $${paramCount++}`);
      values.push(audience_segment_id);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE campaigns 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = result.rows[0];
    if (campaign.target_kpis) {
      campaign.target_kpis = typeof campaign.target_kpis === 'string' 
        ? JSON.parse(campaign.target_kpis) 
        : campaign.target_kpis;
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM campaigns WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get campaign performance data
router.get('/:id/performance', async (req, res) => {
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

// Get campaign financials
router.get('/:id/financials', async (req, res) => {
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

