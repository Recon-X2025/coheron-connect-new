import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// CRM TASKS
// ============================================

// Get all tasks
router.get('/tasks', async (req, res) => {
  try {
    const { user_id, assigned_to_id, state, task_type, related_model, related_id, start_date, end_date, search } = req.query;
    let query = `
      SELECT t.*,
             u1.name as assigned_to_name,
             u2.name as created_by_name
      FROM crm_tasks t
      LEFT JOIN users u1 ON t.assigned_to_id = u1.id
      LEFT JOIN users u2 ON t.created_by_id = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND (t.assigned_to_id = $${paramCount++} OR t.created_by_id = $${paramCount})`;
      params.push(user_id, user_id);
    }

    if (assigned_to_id) {
      query += ` AND t.assigned_to_id = $${paramCount++}`;
      params.push(assigned_to_id);
    }

    if (state) {
      query += ` AND t.state = $${paramCount++}`;
      params.push(state);
    }

    if (task_type) {
      query += ` AND t.task_type = $${paramCount++}`;
      params.push(task_type);
    }

    if (related_model) {
      query += ` AND t.related_model = $${paramCount++}`;
      params.push(related_model);
    }

    if (related_id) {
      query += ` AND t.related_id = $${paramCount++}`;
      params.push(related_id);
    }

    if (start_date) {
      query += ` AND t.due_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND t.due_date <= $${paramCount++}`;
      params.push(end_date);
    }

    if (search) {
      query += ` AND (t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY t.due_date ASC, t.priority DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task by ID
router.get('/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name
       FROM crm_tasks t
       LEFT JOIN users u1 ON t.assigned_to_id = u1.id
       LEFT JOIN users u2 ON t.created_by_id = u2.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
router.post('/tasks', async (req, res) => {
  try {
    const {
      name,
      description,
      task_type,
      priority,
      state,
      assigned_to_id,
      created_by_id,
      due_date,
      related_model,
      related_id,
      reminder_date,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO crm_tasks (
        name, description, task_type, priority, state, assigned_to_id,
        created_by_id, due_date, related_model, related_id, reminder_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name,
        description,
        task_type || 'task',
        priority || 'medium',
        state || 'pending',
        assigned_to_id,
        created_by_id,
        due_date,
        related_model,
        related_id,
        reminder_date,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      task_type,
      priority,
      state,
      assigned_to_id,
      due_date,
      reminder_date,
    } = req.body;

    const result = await pool.query(
      `UPDATE crm_tasks 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           task_type = COALESCE($3, task_type),
           priority = COALESCE($4, priority),
           state = COALESCE($5, state),
           assigned_to_id = COALESCE($6, assigned_to_id),
           due_date = COALESCE($7, due_date),
           reminder_date = COALESCE($8, reminder_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, description, task_type, priority, state, assigned_to_id, due_date, reminder_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM crm_tasks WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// CALENDAR EVENTS
// ============================================

// Get all events
router.get('/events', async (req, res) => {
  try {
    const { user_id, start_date, end_date, event_type, related_model, related_id } = req.query;
    let query = `
      SELECT e.*,
             u.name as created_by_name
      FROM calendar_events e
      LEFT JOIN users u ON e.created_by_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND (e.organizer_id = $${paramCount++} OR $${paramCount} = ANY(e.attendee_ids))`;
      params.push(user_id, user_id);
    }

    if (start_date) {
      query += ` AND e.start_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND e.end_date <= $${paramCount++}`;
      params.push(end_date);
    }

    if (event_type) {
      query += ` AND e.event_type = $${paramCount++}`;
      params.push(event_type);
    }

    if (related_model) {
      query += ` AND e.related_model = $${paramCount++}`;
      params.push(related_model);
    }

    if (related_id) {
      query += ` AND e.related_id = $${paramCount++}`;
      params.push(related_id);
    }

    query += ' ORDER BY e.start_date ASC, e.start_time ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by ID
router.get('/events/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.name as created_by_name
       FROM calendar_events e
       LEFT JOIN users u ON e.created_by_id = u.id
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post('/events', async (req, res) => {
  try {
    const {
      title,
      description,
      event_type,
      start_date,
      start_time,
      end_date,
      end_time,
      all_day,
      location,
      organizer_id,
      attendee_ids,
      related_model,
      related_id,
      reminder_minutes,
      created_by_id,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO calendar_events (
        title, description, event_type, start_date, start_time, end_date, end_time,
        all_day, location, organizer_id, attendee_ids, related_model, related_id,
        reminder_minutes, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        title,
        description,
        event_type || 'meeting',
        start_date,
        start_time,
        end_date,
        end_time,
        all_day !== undefined ? all_day : false,
        location,
        organizer_id,
        attendee_ids ? attendee_ids : [],
        related_model,
        related_id,
        reminder_minutes,
        created_by_id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
router.put('/events/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      event_type,
      start_date,
      start_time,
      end_date,
      end_time,
      all_day,
      location,
      organizer_id,
      attendee_ids,
      reminder_minutes,
    } = req.body;

    const result = await pool.query(
      `UPDATE calendar_events 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           event_type = COALESCE($3, event_type),
           start_date = COALESCE($4, start_date),
           start_time = COALESCE($5, start_time),
           end_date = COALESCE($6, end_date),
           end_time = COALESCE($7, end_time),
           all_day = COALESCE($8, all_day),
           location = COALESCE($9, location),
           organizer_id = COALESCE($10, organizer_id),
           attendee_ids = COALESCE($11, attendee_ids),
           reminder_minutes = COALESCE($12, reminder_minutes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        title,
        description,
        event_type,
        start_date,
        start_time,
        end_date,
        end_time,
        all_day,
        location,
        organizer_id,
        attendee_ids,
        reminder_minutes,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/events/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM calendar_events WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// AUTOMATION WORKFLOWS
// ============================================

// Get all workflows
router.get('/automation/workflows', async (req, res) => {
  try {
    const { is_active, trigger_type } = req.query;
    let query = 'SELECT * FROM crm_automation_workflows WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (trigger_type) {
      query += ` AND trigger_type = $${paramCount++}`;
      params.push(trigger_type);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workflow by ID
router.get('/automation/workflows/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM crm_automation_workflows WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create workflow
router.post('/automation/workflows', async (req, res) => {
  try {
    const { name, description, trigger_type, trigger_config, actions, conditions, is_active } = req.body;

    const result = await pool.query(
      `INSERT INTO crm_automation_workflows (
        name, description, trigger_type, trigger_config, actions, conditions, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name,
        description,
        trigger_type,
        trigger_config ? JSON.stringify(trigger_config) : null,
        actions ? JSON.stringify(actions) : null,
        conditions ? JSON.stringify(conditions) : null,
        is_active !== undefined ? is_active : true,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update workflow
router.put('/automation/workflows/:id', async (req, res) => {
  try {
    const { name, description, trigger_type, trigger_config, actions, conditions, is_active } = req.body;

    const result = await pool.query(
      `UPDATE crm_automation_workflows 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           trigger_type = COALESCE($3, trigger_type),
           trigger_config = COALESCE($4, trigger_config),
           actions = COALESCE($5, actions),
           conditions = COALESCE($6, conditions),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        name,
        description,
        trigger_type,
        trigger_config ? JSON.stringify(trigger_config) : null,
        actions ? JSON.stringify(actions) : null,
        conditions ? JSON.stringify(conditions) : null,
        is_active,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete workflow
router.delete('/automation/workflows/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM crm_automation_workflows WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute workflow
router.post('/automation/workflows/:id/execute', async (req, res) => {
  try {
    const { record_id, record_model } = req.body;

    // TODO: Implement actual workflow execution logic
    // This is a placeholder
    res.json({ message: 'Workflow executed successfully', workflow_id: req.params.id });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

