import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all leads
router.get('/', async (req, res) => {
  try {
    const { type, stage, search } = req.query;
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      query += ` AND type = $${paramCount++}`;
      params.push(type);
    }

    if (stage) {
      query += ` AND stage = $${paramCount++}`;
      params.push(stage);
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get lead by ID with activities and related data
router.get('/:id', async (req, res) => {
  try {
    const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [
      req.params.id,
    ]);

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    // Get activities
    const activitiesResult = await pool.query(
      'SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY activity_date DESC',
      [req.params.id]
    );

    // Get scoring history
    const scoringResult = await pool.query(
      'SELECT * FROM lead_scoring_history WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 10',
      [req.params.id]
    );

    // Get competitor tracking (if opportunity)
    const competitorResult = await pool.query(
      'SELECT * FROM competitor_tracking WHERE opportunity_id = $1',
      [req.params.id]
    );

    // Get documents (if opportunity)
    const documentsResult = await pool.query(
      'SELECT * FROM opportunity_documents WHERE opportunity_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      ...lead,
      activities: activitiesResult.rows,
      scoring_history: scoringResult.rows,
      competitors: competitorResult.rows,
      documents: documentsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lead
router.post('/', async (req, res) => {
  try {
    const {
      name,
      partner_id,
      email,
      phone,
      expected_revenue,
      probability,
      stage,
      user_id,
      priority,
      type,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO leads (name, partner_id, email, phone, expected_revenue, probability, stage, user_id, priority, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name,
        partner_id,
        email,
        phone,
        expected_revenue || 0,
        probability || 0,
        stage || 'new',
        user_id || 1,
        priority || 'medium',
        type || 'lead',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      partner_id,
      email,
      phone,
      expected_revenue,
      probability,
      stage,
      priority,
    } = req.body;

    const result = await pool.query(
      `UPDATE leads 
       SET name = $1, partner_id = $2, email = $3, phone = $4, 
           expected_revenue = $5, probability = $6, stage = $7, priority = $8
       WHERE id = $9
       RETURNING *`,
      [
        name,
        partner_id,
        email,
        phone,
        expected_revenue,
        probability,
        stage,
        priority,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Convert lead to opportunity
router.post('/:id/convert', async (req, res) => {
  try {
    const { partner_id } = req.body;

    const lead = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (lead.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const result = await pool.query(
      `UPDATE leads 
       SET type = 'opportunity',
           stage = 'qualified',
           partner_id = COALESCE($1, partner_id),
           converted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [partner_id, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add activity to lead
router.post('/:id/activities', async (req, res) => {
  try {
    const { activity_type, subject, description, activity_date, duration_minutes, user_id } = req.body;

    const result = await pool.query(
      `INSERT INTO lead_activities (lead_id, activity_type, subject, description, activity_date, duration_minutes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, activity_type, subject, description, activity_date || new Date(), duration_minutes, user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead score
router.post('/:id/score', async (req, res) => {
  try {
    const { score, scoring_rule_id, reason } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update lead score
      await client.query('UPDATE leads SET score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [score, req.params.id]);

      // Record in history
      await client.query(
        `INSERT INTO lead_scoring_history (lead_id, score, scoring_rule_id, reason)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, score, scoring_rule_id, reason]
      );

      await client.query('COMMIT');

      const updated = await client.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
      res.json(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating lead score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add competitor tracking
router.post('/:id/competitors', async (req, res) => {
  try {
    const { competitor_name, competitor_strength, competitor_weakness, our_competitive_advantage } = req.body;

    const result = await pool.query(
      `INSERT INTO competitor_tracking (opportunity_id, competitor_name, competitor_strength, competitor_weakness, our_competitive_advantage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, competitor_name, competitor_strength, competitor_weakness, our_competitive_advantage]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding competitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add document to opportunity
router.post('/:id/documents', async (req, res) => {
  try {
    const { document_type, name, file_url, file_path, version, created_by } = req.body;

    const result = await pool.query(
      `INSERT INTO opportunity_documents (opportunity_id, document_type, name, file_url, file_path, version, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, document_type, name, file_url, file_path, version || 1, created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

