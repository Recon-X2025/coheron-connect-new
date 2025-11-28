import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// ROUTING - CRUD
// ============================================

// Get all routings
router.get('/', async (req, res) => {
  try {
    const { active, search } = req.query;
    let query = 'SELECT * FROM routing WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (active !== undefined) {
      query += ` AND active = $${paramCount++}`;
      params.push(active === 'true');
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching routings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get routing by ID with operations
router.get('/:id', async (req, res) => {
  try {
    const routing = await pool.query('SELECT * FROM routing WHERE id = $1', [req.params.id]);

    if (routing.rows.length === 0) {
      return res.status(404).json({ error: 'Routing not found' });
    }

    const operations = await pool.query(
      `SELECT ro.*, wc.name as workcenter_name, wc.code as workcenter_code
       FROM routing_operations ro
       LEFT JOIN workcenters wc ON ro.workcenter_id = wc.id
       WHERE ro.routing_id = $1
       ORDER BY ro.sequence`,
      [req.params.id]
    );

    res.json({
      ...routing.rows[0],
      operations: operations.rows,
    });
  } catch (error) {
    console.error('Error fetching routing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create routing
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      active,
      company_id,
      location_id,
      note,
      operations, // Array of operations
    } = req.body;

    const result = await pool.query(
      `INSERT INTO routing (name, code, active, company_id, location_id, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        code,
        active !== false,
        company_id,
        location_id,
        note,
      ]
    );

    const routing = result.rows[0];

    // Create operations if provided
    if (operations && Array.isArray(operations)) {
      for (const op of operations) {
        await pool.query(
          `INSERT INTO routing_operations (
            routing_id, name, sequence, workcenter_id, time_mode,
            time_cycle_manual, time_cycle, time_mode_batch, batch_size,
            time_start, time_stop, worksheet_type, note
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            routing.id,
            op.name,
            op.sequence,
            op.workcenter_id,
            op.time_mode || 'auto',
            op.time_cycle_manual,
            op.time_cycle,
            op.time_mode_batch || 1,
            op.batch_size || 1,
            op.time_start || 0,
            op.time_stop || 0,
            op.worksheet_type,
            op.note,
          ]
        );
      }
    }

    res.status(201).json(routing);
  } catch (error) {
    console.error('Error creating routing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update routing
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = ['name', 'code', 'active', 'company_id', 'location_id', 'note'];

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
      `UPDATE routing SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Routing not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating routing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete routing
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM routing WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Routing not found' });
    }

    res.json({ message: 'Routing deleted successfully' });
  } catch (error) {
    console.error('Error deleting routing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ROUTING OPERATIONS - CRUD
// ============================================

// Get routing operations
router.get('/:routing_id/operations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ro.*, wc.name as workcenter_name, wc.code as workcenter_code
       FROM routing_operations ro
       LEFT JOIN workcenters wc ON ro.workcenter_id = wc.id
       WHERE ro.routing_id = $1
       ORDER BY ro.sequence`,
      [req.params.routing_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching routing operations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add routing operation
router.post('/:routing_id/operations', async (req, res) => {
  try {
    const { routing_id } = req.params;
    const {
      name,
      sequence,
      workcenter_id,
      time_mode,
      time_cycle_manual,
      time_cycle,
      time_mode_batch,
      batch_size,
      time_start,
      time_stop,
      worksheet_type,
      note,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO routing_operations (
        routing_id, name, sequence, workcenter_id, time_mode,
        time_cycle_manual, time_cycle, time_mode_batch, batch_size,
        time_start, time_stop, worksheet_type, note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        routing_id,
        name,
        sequence,
        workcenter_id,
        time_mode || 'auto',
        time_cycle_manual,
        time_cycle,
        time_mode_batch || 1,
        batch_size || 1,
        time_start || 0,
        time_stop || 0,
        worksheet_type,
        note,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating routing operation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update routing operation
router.put('/operations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'sequence', 'workcenter_id', 'time_mode', 'time_cycle_manual',
      'time_cycle', 'time_mode_batch', 'batch_size', 'time_start', 'time_stop',
      'worksheet_type', 'note',
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
      `UPDATE routing_operations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Routing operation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating routing operation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete routing operation
router.delete('/operations/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM routing_operations WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Routing operation not found' });
    }

    res.json({ message: 'Routing operation deleted successfully' });
  } catch (error) {
    console.error('Error deleting routing operation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WORK CENTERS - CRUD
// ============================================

// Get all work centers
router.get('/workcenters', async (req, res) => {
  try {
    const { active, search } = req.query;
    let query = 'SELECT * FROM workcenters WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (active !== undefined) {
      query += ` AND active = $${paramCount++}`;
      params.push(active === 'true');
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching work centers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get work center by ID
router.get('/workcenters/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workcenters WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work center not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching work center:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create work center
router.post('/workcenters', async (req, res) => {
  try {
    const {
      name,
      code,
      active,
      workcenter_type,
      capacity,
      time_efficiency,
      time_start,
      time_stop,
      costs_hour,
      costs_cycle,
      oee_target,
      location_id,
      resource_calendar_id,
      company_id,
      notes,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO workcenters (
        name, code, active, workcenter_type, capacity, time_efficiency,
        time_start, time_stop, costs_hour, costs_cycle, oee_target,
        location_id, resource_calendar_id, company_id, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        name,
        code,
        active !== false,
        workcenter_type,
        capacity || 1,
        time_efficiency || 100,
        time_start || 0,
        time_stop || 0,
        costs_hour || 0,
        costs_cycle || 0,
        oee_target || 90,
        location_id,
        resource_calendar_id,
        company_id,
        notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating work center:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update work center
router.put('/workcenters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'code', 'active', 'workcenter_type', 'capacity', 'time_efficiency',
      'time_start', 'time_stop', 'costs_hour', 'costs_cycle', 'oee_target',
      'location_id', 'resource_calendar_id', 'company_id', 'notes',
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
      `UPDATE workcenters SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work center not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating work center:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete work center
router.delete('/workcenters/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM workcenters WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work center not found' });
    }

    res.json({ message: 'Work center deleted successfully' });
  } catch (error) {
    console.error('Error deleting work center:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

