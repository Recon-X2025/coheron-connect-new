import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SPRINTS
// ============================================

// Get all sprints for a project
router.get('/projects/:projectId/sprints', async (req, res) => {
  try {
    const { state } = req.query;
    let query = `
      SELECT s.*, 
             COUNT(DISTINCT bi.id) as backlog_item_count,
             SUM(bi.story_points) as total_story_points,
             COUNT(DISTINCT CASE WHEN bi.status = 'done' THEN bi.id END) as completed_items,
             SUM(CASE WHEN bi.status = 'done' THEN bi.story_points ELSE 0 END) as completed_story_points
      FROM sprints s
      LEFT JOIN backlog_items bi ON s.id = bi.sprint_id
      WHERE s.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (state) {
      query += ` AND s.state = $${paramCount++}`;
      params.push(state);
    }

    query += ' GROUP BY s.id ORDER BY s.start_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sprint by ID
router.get('/sprints/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              p.name as project_name,
              p.code as project_code
       FROM sprints s
       LEFT JOIN projects p ON s.project_id = p.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const sprint = result.rows[0];

    // Get backlog items
    const itemsResult = await pool.query(
      `SELECT bi.*, 
              u.name as assignee_name
       FROM backlog_items bi
       LEFT JOIN users u ON bi.assignee_id = u.id
       WHERE bi.sprint_id = $1
       ORDER BY bi.priority DESC, bi.created_at`,
      [req.params.id]
    );

    // Get burndown data
    const burndownResult = await pool.query(
      `SELECT * FROM sprint_burndown
       WHERE sprint_id = $1
       ORDER BY date`,
      [req.params.id]
    );

    res.json({
      ...sprint,
      backlog_items: itemsResult.rows,
      burndown: burndownResult.rows,
    });
  } catch (error) {
    console.error('Error fetching sprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create sprint
router.post('/projects/:projectId/sprints', async (req, res) => {
  try {
    const { name, goal, start_date, end_date, state } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Name, start date, and end date are required' });
    }

    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const result = await pool.query(
      `INSERT INTO sprints (project_id, name, goal, start_date, end_date, state)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.projectId, name, goal, start_date, end_date, state || 'future']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update sprint
router.put('/sprints/:id', async (req, res) => {
  try {
    const { name, goal, start_date, end_date, state, velocity } = req.body;

    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = { name, goal, start_date, end_date, state, velocity };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE sprints SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete sprint
router.delete('/sprints/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sprints WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    res.json({ message: 'Sprint deleted successfully' });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start sprint
router.post('/sprints/:id/start', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE sprints 
       SET state = 'active'
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error starting sprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close sprint
router.post('/sprints/:id/close', async (req, res) => {
  try {
    // Calculate velocity
    const velocityResult = await pool.query(
      `SELECT SUM(story_points) as velocity
       FROM backlog_items
       WHERE sprint_id = $1 AND status = 'done'`,
      [req.params.id]
    );

    const velocity = parseInt(velocityResult.rows[0]?.velocity || '0');

    const result = await pool.query(
      `UPDATE sprints 
       SET state = 'closed', velocity = $1
       WHERE id = $2
       RETURNING *`,
      [velocity, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error closing sprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// BACKLOG ITEMS (Epics, Stories, Bugs)
// ============================================

// Get backlog items
router.get('/projects/:projectId/backlog', async (req, res) => {
  try {
    const { item_type, status, sprint_id, epic_id } = req.query;
    let query = `
      SELECT bi.*, 
             u.name as assignee_name,
             e.title as epic_title
      FROM backlog_items bi
      LEFT JOIN users u ON bi.assignee_id = u.id
      LEFT JOIN backlog_items e ON bi.epic_id = e.id
      WHERE bi.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (item_type) {
      query += ` AND bi.item_type = $${paramCount++}`;
      params.push(item_type);
    }

    if (status) {
      query += ` AND bi.status = $${paramCount++}`;
      params.push(status);
    }

    if (sprint_id) {
      query += ` AND bi.sprint_id = $${paramCount++}`;
      params.push(sprint_id);
    } else if (sprint_id === null || sprint_id === 'null') {
      query += ` AND bi.sprint_id IS NULL`;
    }

    if (epic_id) {
      query += ` AND bi.epic_id = $${paramCount++}`;
      params.push(epic_id);
    }

    query += ' ORDER BY bi.priority DESC, bi.created_at';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching backlog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get backlog item by ID
router.get('/backlog/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bi.*, 
              u.name as assignee_name,
              e.title as epic_title,
              s.name as sprint_name
       FROM backlog_items bi
       LEFT JOIN users u ON bi.assignee_id = u.id
       LEFT JOIN backlog_items e ON bi.epic_id = e.id
       LEFT JOIN sprints s ON bi.sprint_id = s.id
       WHERE bi.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backlog item not found' });
    }

    // Get stories if this is an epic
    if (result.rows[0].item_type === 'epic') {
      const storiesResult = await pool.query(
        `SELECT * FROM backlog_items
         WHERE epic_id = $1
         ORDER BY priority DESC, created_at`,
        [req.params.id]
      );
      result.rows[0].stories = storiesResult.rows;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching backlog item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create backlog item
router.post('/projects/:projectId/backlog', async (req, res) => {
  try {
    const {
      sprint_id,
      epic_id,
      item_type,
      title,
      description,
      acceptance_criteria,
      story_points,
      priority,
      status,
      assignee_id,
    } = req.body;

    if (!item_type || !title) {
      return res.status(400).json({ error: 'Item type and title are required' });
    }

    const result = await pool.query(
      `INSERT INTO backlog_items (
        project_id, sprint_id, epic_id, item_type, title, description,
        acceptance_criteria, story_points, priority, status, assignee_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.params.projectId,
        sprint_id,
        epic_id,
        item_type,
        title,
        description,
        acceptance_criteria,
        story_points,
        priority || 0,
        status || 'backlog',
        assignee_id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating backlog item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update backlog item
router.put('/backlog/:id', async (req, res) => {
  try {
    const {
      sprint_id,
      epic_id,
      item_type,
      title,
      description,
      acceptance_criteria,
      story_points,
      priority,
      status,
      assignee_id,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      sprint_id,
      epic_id,
      item_type,
      title,
      description,
      acceptance_criteria,
      story_points,
      priority,
      status,
      assignee_id,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE backlog_items SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backlog item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating backlog item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete backlog item
router.delete('/backlog/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM backlog_items WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backlog item not found' });
    }

    res.json({ message: 'Backlog item deleted successfully' });
  } catch (error) {
    console.error('Error deleting backlog item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SPRINT BURNDOWN
// ============================================

// Get burndown data
router.get('/sprints/:id/burndown', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sprint_burndown
       WHERE sprint_id = $1
       ORDER BY date`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching burndown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update burndown data (usually automated)
router.post('/sprints/:id/burndown', async (req, res) => {
  try {
    const { date, remaining_story_points, completed_story_points } = req.body;

    const result = await pool.query(
      `INSERT INTO sprint_burndown (sprint_id, date, remaining_story_points, completed_story_points)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (sprint_id, date) 
       DO UPDATE SET 
         remaining_story_points = EXCLUDED.remaining_story_points,
         completed_story_points = EXCLUDED.completed_story_points
       RETURNING *`,
      [req.params.id, date || new Date().toISOString().split('T')[0], remaining_story_points, completed_story_points || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating burndown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// RELEASES
// ============================================

// Get project releases
router.get('/projects/:projectId/releases', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT r.*, 
             COUNT(DISTINCT ri.backlog_item_id) as item_count
      FROM releases r
      LEFT JOIN release_items ri ON r.id = ri.release_id
      WHERE r.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND r.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' GROUP BY r.id ORDER BY r.release_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get release by ID
router.get('/releases/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, 
              p.name as project_name,
              p.code as project_code
       FROM releases r
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Release not found' });
    }

    const release = result.rows[0];

    // Get release items
    const itemsResult = await pool.query(
      `SELECT bi.*
       FROM release_items ri
       LEFT JOIN backlog_items bi ON ri.backlog_item_id = bi.id
       WHERE ri.release_id = $1
       ORDER BY bi.priority DESC`,
      [req.params.id]
    );

    res.json({
      ...release,
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching release:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create release
router.post('/projects/:projectId/releases', async (req, res) => {
  try {
    const { name, version, release_date, status, release_notes } = req.body;

    if (!name || !version) {
      return res.status(400).json({ error: 'Name and version are required' });
    }

    const result = await pool.query(
      `INSERT INTO releases (project_id, name, version, release_date, status, release_notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.projectId, name, version, release_date, status || 'planned', release_notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating release:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update release
router.put('/releases/:id', async (req, res) => {
  try {
    const { name, version, release_date, status, release_notes } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = { name, version, release_date, status, release_notes };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE releases SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Release not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating release:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to release
router.post('/releases/:id/items', async (req, res) => {
  try {
    const { backlog_item_id } = req.body;

    const result = await pool.query(
      `INSERT INTO release_items (release_id, backlog_item_id)
       VALUES ($1, $2)
       ON CONFLICT (release_id, backlog_item_id) DO NOTHING
       RETURNING *`,
      [req.params.id, backlog_item_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Item already in release or not found' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding item to release:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from release
router.delete('/releases/:id/items/:itemId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM release_items WHERE release_id = $1 AND backlog_item_id = $2 RETURNING id',
      [req.params.id, req.params.itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found in release' });
    }

    res.json({ message: 'Item removed from release successfully' });
  } catch (error) {
    console.error('Error removing item from release:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// AUTOMATION RULES
// ============================================

// Get automation rules
router.get('/projects/:projectId/automation-rules', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM automation_rules
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create automation rule
router.post('/projects/:projectId/automation-rules', async (req, res) => {
  try {
    const { rule_name, trigger_condition, action_type, action_params, is_active } = req.body;

    if (!rule_name || !trigger_condition || !action_type) {
      return res.status(400).json({ error: 'Rule name, trigger condition, and action type are required' });
    }

    const result = await pool.query(
      `INSERT INTO automation_rules (
        project_id, rule_name, trigger_condition, action_type, action_params, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        req.params.projectId,
        rule_name,
        trigger_condition,
        action_type,
        action_params,
        is_active !== undefined ? is_active : true,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating automation rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update automation rule
router.put('/automation-rules/:id', async (req, res) => {
  try {
    const { rule_name, trigger_condition, action_type, action_params, is_active } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = { rule_name, trigger_condition, action_type, action_params, is_active };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE automation_rules SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

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
router.delete('/automation-rules/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM automation_rules WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json({ message: 'Automation rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

