import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// WORK ORDERS - CRUD & Shop Floor Operations
// ============================================

// Get all work orders
router.get('/', async (req, res) => {
  try {
    const { mo_id, state, workcenter_id, search } = req.query;
    let query = `
      SELECT wo.*, 
             mo.name as mo_name,
             mo.mo_number,
             wc.name as workcenter_name,
             ro.name as operation_name
      FROM work_orders wo
      LEFT JOIN manufacturing_orders mo ON wo.mo_id = mo.id
      LEFT JOIN workcenters wc ON wo.workcenter_id = wc.id
      LEFT JOIN routing_operations ro ON wo.operation_id = ro.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (mo_id) {
      query += ` AND wo.mo_id = $${paramCount++}`;
      params.push(mo_id);
    }

    if (state) {
      query += ` AND wo.state = $${paramCount++}`;
      params.push(state);
    }

    if (workcenter_id) {
      query += ` AND wo.workcenter_id = $${paramCount++}`;
      params.push(workcenter_id);
    }

    if (search) {
      query += ` AND (wo.name ILIKE $${paramCount} OR mo.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY wo.sequence, wo.date_planned_start';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get work order by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wo.*, 
              mo.name as mo_name,
              mo.mo_number,
              wc.name as workcenter_name,
              ro.name as operation_name,
              u.name as user_name
       FROM work_orders wo
       LEFT JOIN manufacturing_orders mo ON wo.mo_id = mo.id
       LEFT JOIN workcenters wc ON wo.workcenter_id = wc.id
       LEFT JOIN routing_operations ro ON wo.operation_id = ro.id
       LEFT JOIN users u ON wo.user_id = u.id
       WHERE wo.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Get operator activities
    const activities = await pool.query(
      `SELECT oa.*, u.name as operator_name
       FROM mo_operator_activities oa
       LEFT JOIN users u ON oa.operator_id = u.id
       WHERE oa.workorder_id = $1
       ORDER BY oa.timestamp DESC`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      activities: activities.rows,
    });
  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update work order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'state', 'date_planned_start', 'date_planned_finished', 'date_start', 'date_finished',
      'duration', 'qty_produced', 'qty_producing', 'qty_scrapped', 'user_id', 'note',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE work_orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SHOP FLOOR OPERATIONS
// ============================================

// Start work order
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_id } = req.body;

    const wo = await pool.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (wo.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    if (wo.rows[0].state !== 'ready' && wo.rows[0].state !== 'pending') {
      return res.status(400).json({ error: 'Work order must be ready or pending to start' });
    }

    // Update work order
    const result = await pool.query(
      `UPDATE work_orders 
       SET state = $1, date_start = NOW(), is_user_working = $2, user_id = COALESCE($3, user_id)
       WHERE id = $4
       RETURNING *`,
      ['progress', true, operator_id, id]
    );

    // Record activity
    await pool.query(
      `INSERT INTO mo_operator_activities (workorder_id, operator_id, activity_type)
       VALUES ($1, $2, $3)`,
      [id, operator_id || wo.rows[0].user_id, 'start']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error starting work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pause work order
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_id, downtime_reason, downtime_duration } = req.body;

    const wo = await pool.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (wo.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    if (wo.rows[0].state !== 'progress') {
      return res.status(400).json({ error: 'Work order must be in progress to pause' });
    }

    // Update work order
    const result = await pool.query(
      `UPDATE work_orders 
       SET is_user_working = $1
       WHERE id = $2
       RETURNING *`,
      [false, id]
    );

    // Record activity
    await pool.query(
      `INSERT INTO mo_operator_activities 
       (workorder_id, operator_id, activity_type, downtime_reason, downtime_duration)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, operator_id || wo.rows[0].user_id, 'pause', downtime_reason, downtime_duration]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error pausing work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resume work order
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_id } = req.body;

    const wo = await pool.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (wo.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    if (wo.rows[0].state !== 'progress') {
      return res.status(400).json({ error: 'Work order must be in progress to resume' });
    }

    // Update work order
    const result = await pool.query(
      `UPDATE work_orders 
       SET is_user_working = $1
       WHERE id = $2
       RETURNING *`,
      [true, id]
    );

    // Record activity
    await pool.query(
      `INSERT INTO mo_operator_activities (workorder_id, operator_id, activity_type)
       VALUES ($1, $2, $3)`,
      [id, operator_id || wo.rows[0].user_id, 'resume']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error resuming work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete work order
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_id, qty_produced, qty_scrapped } = req.body;

    const wo = await pool.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (wo.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    if (wo.rows[0].state !== 'progress') {
      return res.status(400).json({ error: 'Work order must be in progress to complete' });
    }

    // Calculate duration
    const startTime = wo.rows[0].date_start ? new Date(wo.rows[0].date_start) : new Date();
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours

    // Update work order
    const result = await pool.query(
      `UPDATE work_orders 
       SET state = $1, date_finished = NOW(), is_user_working = $2,
           duration = $3, qty_produced = COALESCE($4, qty_produced),
           qty_scrapped = COALESCE($5, qty_scrapped)
       WHERE id = $6
       RETURNING *`,
      ['done', false, duration, qty_produced, qty_scrapped, id]
    );

    // Record activity
    await pool.query(
      `INSERT INTO mo_operator_activities 
       (workorder_id, operator_id, activity_type, qty_produced, qty_scrapped)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, operator_id || wo.rows[0].user_id, 'complete', qty_produced, qty_scrapped]
    );

    // Update MO quantities
    await pool.query(
      `UPDATE manufacturing_orders 
       SET qty_produced = qty_produced + COALESCE($1, 0),
           qty_scrapped = qty_scrapped + COALESCE($2, 0)
       WHERE id = $3`,
      [qty_produced || 0, qty_scrapped || 0, wo.rows[0].mo_id]
    );

    // Check if all work orders are done, then move to next or complete MO
    const remainingWOs = await pool.query(
      'SELECT COUNT(*) as count FROM work_orders WHERE mo_id = $1 AND state != $2',
      [wo.rows[0].mo_id, 'done']
    );

    if (remainingWOs.rows[0].count === '0') {
      // All work orders done, check if MO should be completed
      const mo = await pool.query('SELECT * FROM manufacturing_orders WHERE id = $1', [wo.rows[0].mo_id]);
      if (mo.rows[0].state === 'progress') {
        await pool.query(
          'UPDATE manufacturing_orders SET state = $1 WHERE id = $2',
          ['to_close', wo.rows[0].mo_id]
        );
      }
    } else {
      // Start next work order
      const nextWO = await pool.query(
        'SELECT * FROM work_orders WHERE mo_id = $1 AND state = $2 ORDER BY sequence LIMIT 1',
        [wo.rows[0].mo_id, 'pending']
      );

      if (nextWO.rows.length > 0) {
        await pool.query(
          'UPDATE work_orders SET state = $1 WHERE id = $2',
          ['ready', nextWO.rows[0].id]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record scrap
router.post('/:id/scrap', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_id, qty_scrapped, reason } = req.body;

    const wo = await pool.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (wo.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Update work order
    await pool.query(
      `UPDATE work_orders 
       SET qty_scrapped = qty_scrapped + $1
       WHERE id = $2`,
      [qty_scrapped, id]
    );

    // Record activity
    await pool.query(
      `INSERT INTO mo_operator_activities 
       (workorder_id, operator_id, activity_type, qty_scrapped, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, operator_id || wo.rows[0].user_id, 'scrap', qty_scrapped, reason]
    );

    // Update MO scrap quantity
    await pool.query(
      `UPDATE manufacturing_orders 
       SET qty_scrapped = qty_scrapped + $1
       WHERE id = $2`,
      [qty_scrapped, wo.rows[0].mo_id]
    );

    res.json({ message: 'Scrap recorded successfully' });
  } catch (error) {
    console.error('Error recording scrap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shop floor dashboard data
router.get('/shop-floor/dashboard', async (req, res) => {
  try {
    const { workcenter_id } = req.query;

    let query = `
      SELECT 
        COUNT(*) FILTER (WHERE wo.state = 'progress') as active_count,
        COUNT(*) FILTER (WHERE wo.state = 'ready') as ready_count,
        COUNT(*) FILTER (WHERE wo.state = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE wo.state = 'done') as completed_count,
        SUM(wo.qty_produced) FILTER (WHERE wo.state = 'progress') as qty_in_progress,
        SUM(wo.qty_scrapped) as total_scrapped
      FROM work_orders wo
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (workcenter_id) {
      query += ` AND wo.workcenter_id = $${paramCount++}`;
      params.push(workcenter_id);
    }

    const stats = await pool.query(query, params);

    // Get active work orders
    let activeQuery = `
      SELECT wo.*, mo.name as mo_name, wc.name as workcenter_name
      FROM work_orders wo
      LEFT JOIN manufacturing_orders mo ON wo.mo_id = mo.id
      LEFT JOIN workcenters wc ON wo.workcenter_id = wc.id
      WHERE wo.state = 'progress'
    `;
    const activeParams: any[] = [];
    let activeParamCount = 1;

    if (workcenter_id) {
      activeQuery += ` AND wo.workcenter_id = $${activeParamCount++}`;
      activeParams.push(workcenter_id);
    }

    activeQuery += ' ORDER BY wo.date_planned_start';

    const active = await pool.query(activeQuery, activeParams);

    res.json({
      statistics: stats.rows[0],
      active_work_orders: active.rows,
    });
  } catch (error) {
    console.error('Error fetching shop floor dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

