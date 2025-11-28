import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// First, we need to add the retrospectives table to the schema
// This will be handled in a migration, but for now we'll create the routes

// ============================================
// SPRINT RETROSPECTIVES
// ============================================

// Get retrospective for a sprint
router.get('/sprints/:id/retrospective', async (req, res) => {
  try {
    // Check if retrospectives table exists, if not return empty structure
    const result = await pool.query(
      `SELECT 
         r.*,
         u.name as facilitator_name
       FROM sprint_retrospectives r
       LEFT JOIN users u ON r.facilitator_id = u.id
       WHERE r.sprint_id = $1`,
      [req.params.id]
    ).catch(() => ({ rows: [] }));

    if (result.rows.length === 0) {
      // Return empty retrospective structure
      return res.json({
        sprint_id: req.params.id,
        what_went_well: [],
        what_could_improve: [],
        action_items: [],
        notes: null,
        status: 'draft',
      });
    }

    // Get retrospective items
    const itemsResult = await pool.query(
      `SELECT * FROM sprint_retrospective_items
       WHERE retrospective_id = $1
       ORDER BY category, created_at`,
      [result.rows[0].id]
    ).catch(() => ({ rows: [] }));

    const items = itemsResult.rows.reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({
      ...result.rows[0],
      what_went_well: items.went_well || [],
      what_could_improve: items.could_improve || [],
      action_items: items.action_item || [],
    });
  } catch (error) {
    console.error('Error fetching retrospective:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or Update Retrospective
router.post('/sprints/:id/retrospective', async (req, res) => {
  try {
    const { facilitator_id, notes, status, items } = req.body;

    // Verify sprint exists
    const sprintCheck = await pool.query('SELECT id FROM sprints WHERE id = $1', [
      req.params.id,
    ]);

    if (sprintCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    // Check if retrospective exists
    const existingResult = await pool.query(
      'SELECT id FROM sprint_retrospectives WHERE sprint_id = $1',
      [req.params.id]
    ).catch(() => ({ rows: [] }));

    let retrospectiveId: number;

    if (existingResult.rows.length > 0) {
      // Update existing
      const updateResult = await pool.query(
        `UPDATE sprint_retrospectives
         SET facilitator_id = $1, notes = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE sprint_id = $4
         RETURNING *`,
        [facilitator_id, notes, status || 'draft', req.params.id]
      ).catch(() => ({ rows: [] }));

      if (updateResult.rows.length === 0) {
        return res.status(500).json({ error: 'Failed to update retrospective' });
      }

      retrospectiveId = updateResult.rows[0].id;
    } else {
      // Create new
      const createResult = await pool.query(
        `INSERT INTO sprint_retrospectives (sprint_id, facilitator_id, notes, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.params.id, facilitator_id, notes, status || 'draft']
      ).catch(() => ({ rows: [] }));

      if (createResult.rows.length === 0) {
        return res.status(500).json({ error: 'Failed to create retrospective. Table may not exist.' });
      }

      retrospectiveId = createResult.rows[0].id;
    }

    // Handle items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await pool.query('DELETE FROM sprint_retrospective_items WHERE retrospective_id = $1', [
        retrospectiveId,
      ]).catch(() => {});

      // Insert new items
      for (const item of items) {
        await pool.query(
          `INSERT INTO sprint_retrospective_items (
            retrospective_id, category, content, assignee_id, due_date, status
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            retrospectiveId,
            item.category, // 'went_well', 'could_improve', 'action_item'
            item.content,
            item.assignee_id,
            item.due_date,
            item.status || 'open',
          ]
        ).catch(() => {});
      }
    }

    res.json({ id: retrospectiveId, message: 'Retrospective saved successfully' });
  } catch (error) {
    console.error('Error saving retrospective:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Retrospective Item
router.post('/sprints/:id/retrospective/items', async (req, res) => {
  try {
    const { category, content, assignee_id, due_date, status } = req.body;

    if (!category || !content) {
      return res.status(400).json({ error: 'Category and content are required' });
    }

    // Get or create retrospective
    const retroResult = await pool.query(
      'SELECT id FROM sprint_retrospectives WHERE sprint_id = $1',
      [req.params.id]
    ).catch(() => ({ rows: [] }));

    let retrospectiveId: number;

    if (retroResult.rows.length === 0) {
      const createResult = await pool.query(
        `INSERT INTO sprint_retrospectives (sprint_id, status)
         VALUES ($1, 'draft')
         RETURNING id`,
        [req.params.id]
      ).catch(() => ({ rows: [] }));

      if (createResult.rows.length === 0) {
        return res.status(500).json({ error: 'Failed to create retrospective' });
      }

      retrospectiveId = createResult.rows[0].id;
    } else {
      retrospectiveId = retroResult.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO sprint_retrospective_items (
        retrospective_id, category, content, assignee_id, due_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [retrospectiveId, category, content, assignee_id, due_date, status || 'open']
    ).catch(() => ({ rows: [] }));

    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to create item. Table may not exist.' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding retrospective item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

