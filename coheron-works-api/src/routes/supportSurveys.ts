import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SURVEYS
// ============================================

// Get all surveys
router.get('/', async (req, res) => {
  try {
    const { is_active, survey_type } = req.query;
    let query = 'SELECT * FROM surveys WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (survey_type) {
      query += ` AND survey_type = $${paramCount++}`;
      params.push(survey_type);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get survey by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM surveys WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Get response count
    const responseCount = await pool.query(
      'SELECT COUNT(*) as count FROM survey_responses WHERE survey_id = $1',
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      response_count: parseInt(responseCount.rows[0]?.count || '0'),
    });
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create survey
router.post('/', async (req, res) => {
  try {
    const { name, survey_type, description, questions, trigger_event, is_active } = req.body;

    if (!name || !survey_type || !questions) {
      return res.status(400).json({ error: 'Name, survey_type, and questions are required' });
    }

    const result = await pool.query(
      `INSERT INTO surveys (name, survey_type, description, questions, trigger_event, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        survey_type,
        description,
        JSON.stringify(questions),
        trigger_event,
        is_active !== undefined ? is_active : true,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update survey
router.put('/:id', async (req, res) => {
  try {
    const { name, description, questions, trigger_event, is_active } = req.body;

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
    if (questions !== undefined) {
      updateFields.push(`questions = $${paramCount++}`);
      params.push(JSON.stringify(questions));
    }
    if (trigger_event !== undefined) {
      updateFields.push(`trigger_event = $${paramCount++}`);
      params.push(trigger_event);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE surveys SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating survey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SURVEY RESPONSES
// ============================================

// Submit survey response
router.post('/:id/responses', async (req, res) => {
  try {
    const { ticket_id, partner_id, responses, score, feedback } = req.body;

    if (!responses) {
      return res.status(400).json({ error: 'Responses are required' });
    }

    const result = await pool.query(
      `INSERT INTO survey_responses (survey_id, ticket_id, partner_id, responses, score, feedback)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, ticket_id, partner_id, JSON.stringify(responses), score, feedback]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting survey response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get survey responses
router.get('/:id/responses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.*, 
              t.ticket_number,
              p.name as partner_name
       FROM survey_responses sr
       LEFT JOIN support_tickets t ON sr.ticket_id = t.id
       LEFT JOIN partners p ON sr.partner_id = p.id
       WHERE sr.survey_id = $1
       ORDER BY sr.submitted_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching survey responses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get survey analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const responses = await pool.query(
      'SELECT score, responses FROM survey_responses WHERE survey_id = $1',
      [req.params.id]
    );

    const scores = responses.rows.map((r) => r.score).filter((s) => s !== null);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Calculate distribution
    const distribution: Record<number, number> = {};
    scores.forEach((score) => {
      distribution[score] = (distribution[score] || 0) + 1;
    });

    res.json({
      total_responses: responses.rows.length,
      average_score: avgScore,
      score_distribution: distribution,
    });
  } catch (error) {
    console.error('Error fetching survey analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

