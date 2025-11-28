import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// MILESTONES (WBS)
// ============================================

// Get all milestones for a project
router.get('/:projectId/milestones', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, 
              COUNT(DISTINCT t.id) as task_count,
              COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
       FROM project_milestones m
       LEFT JOIN project_tasks t ON m.id = t.milestone_id
       WHERE m.project_id = $1
       GROUP BY m.id
       ORDER BY m.planned_start_date`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create milestone
router.post('/:projectId/milestones', async (req, res) => {
  try {
    const { name, description, planned_start_date, planned_end_date, is_critical } = req.body;

    const result = await pool.query(
      `INSERT INTO project_milestones 
       (project_id, name, description, planned_start_date, planned_end_date, is_critical)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.projectId, name, description, planned_start_date, planned_end_date, is_critical || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update milestone
router.put('/milestones/:id', async (req, res) => {
  try {
    const { name, description, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, is_critical } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      name,
      description,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      status,
      is_critical,
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
    const query = `UPDATE project_milestones SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete milestone
router.delete('/milestones/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM project_milestones WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TASKS
// ============================================

// Get all tasks for a project
router.get('/:projectId/tasks', async (req, res) => {
  try {
    const { status, assignee_id, milestone_id, task_type } = req.query;
    let query = `
      SELECT t.*, 
             u1.name as assignee_name,
             u2.name as reporter_name,
             m.name as milestone_name,
             COUNT(DISTINCT c.id) as comment_count,
             COUNT(DISTINCT CASE WHEN ch.is_completed = false THEN ch.id END) as incomplete_checklist_items
      FROM project_tasks t
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.reporter_id = u2.id
      LEFT JOIN project_milestones m ON t.milestone_id = m.id
      LEFT JOIN task_comments c ON t.id = c.task_id
      LEFT JOIN task_checklists ch ON t.id = ch.task_id
      WHERE t.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND t.status = $${paramCount++}`;
      params.push(status);
    }

    if (assignee_id) {
      query += ` AND t.assignee_id = $${paramCount++}`;
      params.push(assignee_id);
    }

    if (milestone_id) {
      query += ` AND t.milestone_id = $${paramCount++}`;
      params.push(milestone_id);
    }

    if (task_type) {
      query += ` AND t.task_type = $${paramCount++}`;
      params.push(task_type);
    }

    query += ' GROUP BY t.id, u1.name, u2.name, m.name ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task by ID with full details
router.get('/tasks/:id', async (req, res) => {
  try {
    // Get task details
    const taskResult = await pool.query(
      `SELECT t.*, 
              u1.name as assignee_name,
              u2.name as reporter_name,
              m.name as milestone_name
       FROM project_tasks t
       LEFT JOIN users u1 ON t.assignee_id = u1.id
       LEFT JOIN users u2 ON t.reporter_id = u2.id
       LEFT JOIN project_milestones m ON t.milestone_id = m.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Get subtasks
    const subtasksResult = await pool.query(
      'SELECT * FROM project_tasks WHERE parent_task_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    // Get dependencies
    const dependenciesResult = await pool.query(
      `SELECT d.*, t.name as depends_on_task_name
       FROM task_dependencies d
       LEFT JOIN project_tasks t ON d.depends_on_task_id = t.id
       WHERE d.task_id = $1`,
      [req.params.id]
    );

    // Get checklists
    const checklistsResult = await pool.query(
      `SELECT c.*, u.name as completed_by_name
       FROM task_checklists c
       LEFT JOIN users u ON c.completed_by = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at`,
      [req.params.id]
    );

    // Get comments
    const commentsResult = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM task_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at`,
      [req.params.id]
    );

    // Get attachments
    const attachmentsResult = await pool.query(
      `SELECT a.*, u.name as uploaded_by_name
       FROM task_attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.task_id = $1
       ORDER BY a.created_at`,
      [req.params.id]
    );

    res.json({
      ...task,
      subtasks: subtasksResult.rows,
      dependencies: dependenciesResult.rows,
      checklists: checklistsResult.rows,
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
router.post('/:projectId/tasks', async (req, res) => {
  try {
    const {
      milestone_id,
      parent_task_id,
      name,
      description,
      task_type,
      priority,
      status,
      assignee_id,
      reporter_id,
      planned_start_date,
      planned_end_date,
      estimated_hours,
      story_points,
      due_date,
      is_billable,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO project_tasks (
        project_id, milestone_id, parent_task_id, name, description,
        task_type, priority, status, assignee_id, reporter_id,
        planned_start_date, planned_end_date, estimated_hours,
        story_points, due_date, is_billable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        req.params.projectId,
        milestone_id,
        parent_task_id,
        name,
        description,
        task_type || 'task',
        priority || 'medium',
        status || 'backlog',
        assignee_id,
        reporter_id,
        planned_start_date,
        planned_end_date,
        estimated_hours,
        story_points,
        due_date,
        is_billable !== undefined ? is_billable : true,
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
      milestone_id,
      parent_task_id,
      name,
      description,
      task_type,
      priority,
      status,
      assignee_id,
      reporter_id,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      estimated_hours,
      actual_hours,
      story_points,
      due_date,
      is_billable,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      milestone_id,
      parent_task_id,
      name,
      description,
      task_type,
      priority,
      status,
      assignee_id,
      reporter_id,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      estimated_hours,
      actual_hours,
      story_points,
      due_date,
      is_billable,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    // Auto-set actual_start_date when status changes to in_progress
    if (status === 'in_progress' && !req.body.actual_start_date) {
      updateFields.push(`actual_start_date = CURRENT_DATE`);
    }

    // Auto-set actual_end_date when status changes to done
    if (status === 'done' && !req.body.actual_end_date) {
      updateFields.push(`actual_end_date = CURRENT_DATE`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE project_tasks SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

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
    const result = await pool.query('DELETE FROM project_tasks WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

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
// TASK DEPENDENCIES
// ============================================

// Add task dependency
router.post('/tasks/:id/dependencies', async (req, res) => {
  try {
    const { depends_on_task_id, dependency_type } = req.body;

    if (req.params.id === depends_on_task_id) {
      return res.status(400).json({ error: 'Task cannot depend on itself' });
    }

    const result = await pool.query(
      `INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, depends_on_task_id, dependency_type || 'finish_to_start']
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Dependency already exists' });
    }
    console.error('Error adding dependency:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove task dependency
router.delete('/tasks/:id/dependencies/:dependencyId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM task_dependencies WHERE id = $1 AND task_id = $2 RETURNING id',
      [req.params.dependencyId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dependency not found' });
    }

    res.json({ message: 'Dependency removed successfully' });
  } catch (error) {
    console.error('Error removing dependency:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TASK CHECKLISTS
// ============================================

// Add checklist item
router.post('/tasks/:id/checklists', async (req, res) => {
  try {
    const { item_text } = req.body;

    const result = await pool.query(
      `INSERT INTO task_checklists (task_id, item_text)
       VALUES ($1, $2)
       RETURNING *`,
      [req.params.id, item_text]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding checklist item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update checklist item
router.put('/checklists/:id', async (req, res) => {
  try {
    const { item_text, is_completed, completed_by } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (item_text !== undefined) {
      updateFields.push(`item_text = $${paramCount++}`);
      params.push(item_text);
    }

    if (is_completed !== undefined) {
      updateFields.push(`is_completed = $${paramCount++}`);
      params.push(is_completed);
      if (is_completed) {
        updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
        if (completed_by) {
          updateFields.push(`completed_by = $${paramCount++}`);
          params.push(completed_by);
        }
      } else {
        updateFields.push(`completed_at = NULL`);
        updateFields.push(`completed_by = NULL`);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE task_checklists SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete checklist item
router.delete('/checklists/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM task_checklists WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json({ message: 'Checklist item deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TASK COMMENTS
// ============================================

// Add comment
router.post('/tasks/:id/comments', async (req, res) => {
  try {
    const { comment_text, parent_comment_id, user_id } = req.body;

    const result = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, comment_text, parent_comment_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, user_id, comment_text, parent_comment_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update comment
router.put('/comments/:id', async (req, res) => {
  try {
    const { comment_text } = req.body;

    const result = await pool.query(
      `UPDATE task_comments 
       SET comment_text = $1 
       WHERE id = $2
       RETURNING *`,
      [comment_text, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment
router.delete('/comments/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM task_comments WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// KANBAN VIEW
// ============================================

router.get('/:projectId/tasks/kanban', async (req, res) => {
  try {
    const { milestone_id } = req.query;

    let query = `
      SELECT 
        status,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id,
            'name', name,
            'description', description,
            'priority', priority,
            'assignee_id', assignee_id,
            'due_date', due_date,
            'estimated_hours', estimated_hours,
            'actual_hours', actual_hours,
            'story_points', story_points
          ) ORDER BY 
            CASE priority
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            due_date NULLS LAST
        ) as tasks
      FROM project_tasks
      WHERE project_id = $1
    `;
    const params: any[] = [req.params.projectId];

    if (milestone_id) {
      query += ' AND milestone_id = $2';
      params.push(milestone_id);
    }

    query += ' GROUP BY status';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching kanban view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

