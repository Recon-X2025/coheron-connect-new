import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// QUALITY INSPECTIONS - CRUD
// ============================================

// Get all quality inspections
router.get('/', async (req, res) => {
  try {
    const { mo_id, workorder_id, inspection_type, state, search } = req.query;
    let query = `
      SELECT qi.*, 
             mo.name as mo_name,
             mo.mo_number,
             wo.name as workorder_name,
             p.name as product_name,
             u.name as inspector_name
      FROM mo_quality_inspections qi
      LEFT JOIN manufacturing_orders mo ON qi.mo_id = mo.id
      LEFT JOIN work_orders wo ON qi.workorder_id = wo.id
      LEFT JOIN products p ON qi.product_id = p.id
      LEFT JOIN users u ON qi.inspector_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (mo_id) {
      query += ` AND qi.mo_id = $${paramCount++}`;
      params.push(mo_id);
    }

    if (workorder_id) {
      query += ` AND qi.workorder_id = $${paramCount++}`;
      params.push(workorder_id);
    }

    if (inspection_type) {
      query += ` AND qi.inspection_type = $${paramCount++}`;
      params.push(inspection_type);
    }

    if (state) {
      query += ` AND qi.state = $${paramCount++}`;
      params.push(state);
    }

    if (search) {
      query += ` AND (mo.name ILIKE $${paramCount} OR mo.mo_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY qi.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quality inspections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inspection by ID with checklist
router.get('/:id', async (req, res) => {
  try {
    const inspection = await pool.query(
      `SELECT qi.*, 
              mo.name as mo_name,
              mo.mo_number,
              wo.name as workorder_name,
              p.name as product_name,
              u.name as inspector_name
       FROM mo_quality_inspections qi
       LEFT JOIN manufacturing_orders mo ON qi.mo_id = mo.id
       LEFT JOIN work_orders wo ON qi.workorder_id = wo.id
       LEFT JOIN products p ON qi.product_id = p.id
       LEFT JOIN users u ON qi.inspector_id = u.id
       WHERE qi.id = $1`,
      [req.params.id]
    );

    if (inspection.rows.length === 0) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const checklist = await pool.query(
      'SELECT * FROM mo_quality_checklist WHERE inspection_id = $1 ORDER BY id',
      [req.params.id]
    );

    res.json({
      ...inspection.rows[0],
      checklist: checklist.rows,
    });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create quality inspection
router.post('/', async (req, res) => {
  try {
    const {
      mo_id,
      workorder_id,
      inspection_type,
      product_id,
      qty_to_inspect,
      inspector_id,
      inspection_date,
      notes,
      checklist, // Array of checklist items
    } = req.body;

    const result = await pool.query(
      `INSERT INTO mo_quality_inspections (
        mo_id, workorder_id, inspection_type, product_id, qty_to_inspect,
        inspector_id, inspection_date, notes, state
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        mo_id,
        workorder_id,
        inspection_type || 'in_process',
        product_id,
        qty_to_inspect,
        inspector_id,
        inspection_date,
        notes,
        'draft',
      ]
    );

    const inspection = result.rows[0];

    // Create checklist items if provided
    if (checklist && Array.isArray(checklist)) {
      for (const item of checklist) {
        await pool.query(
          `INSERT INTO mo_quality_checklist (
            inspection_id, checklist_item, specification, tolerance_min,
            tolerance_max, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            inspection.id,
            item.checklist_item,
            item.specification,
            item.tolerance_min,
            item.tolerance_max,
            item.notes,
          ]
        );
      }
    }

    res.status(201).json(inspection);
  } catch (error) {
    console.error('Error creating inspection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inspection
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'inspection_type', 'product_id', 'qty_to_inspect', 'qty_inspected',
      'qty_passed', 'qty_failed', 'state', 'inspector_id', 'inspection_date', 'notes',
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
      `UPDATE mo_quality_inspections SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete inspection
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { qty_passed, qty_failed, checklist_results } = req.body;

    // Update checklist items
    if (checklist_results && Array.isArray(checklist_results)) {
      for (const item of checklist_results) {
        await pool.query(
          `UPDATE mo_quality_checklist 
           SET actual_value = $1, result = $2, notes = $3
           WHERE id = $4`,
          [item.actual_value, item.result, item.notes, item.id]
        );
      }
    }

    // Update inspection
    const result = await pool.query(
      `UPDATE mo_quality_inspections 
       SET state = $1, qty_inspected = COALESCE($2, qty_inspected),
           qty_passed = COALESCE($3, qty_passed), qty_failed = COALESCE($4, qty_failed)
       WHERE id = $5
       RETURNING *`,
      ['done', qty_passed + qty_failed, qty_passed, qty_failed, id]
    );

    // If failed, create NCR
    if (qty_failed > 0) {
      const inspection = result.rows[0];
      const ncrNumber = `NCR-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;

      await pool.query(
        `INSERT INTO mo_non_conformance (
          mo_id, workorder_id, inspection_id, ncr_number, product_id,
          qty_non_conforming, severity, state
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          inspection.mo_id,
          inspection.workorder_id,
          id,
          ncrNumber,
          inspection.product_id,
          qty_failed,
          'major',
          'open',
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing inspection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// QUALITY CHECKLIST - CRUD
// ============================================

// Add checklist item
router.post('/:inspection_id/checklist', async (req, res) => {
  try {
    const { inspection_id } = req.params;
    const { checklist_item, specification, tolerance_min, tolerance_max, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO mo_quality_checklist (
        inspection_id, checklist_item, specification, tolerance_min,
        tolerance_max, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [inspection_id, checklist_item, specification, tolerance_min, tolerance_max, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update checklist item
router.put('/checklist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'checklist_item', 'specification', 'actual_value', 'tolerance_min',
      'tolerance_max', 'result', 'notes',
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
      `UPDATE mo_quality_checklist SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// NON-CONFORMANCE REPORTS (NCR) - CRUD
// ============================================

// Get all NCRs
router.get('/ncr', async (req, res) => {
  try {
    const { mo_id, state, severity, search } = req.query;
    let query = `
      SELECT ncr.*, 
             mo.name as mo_name,
             mo.mo_number,
             wo.name as workorder_name,
             p.name as product_name,
             u.name as assigned_to_name
      FROM mo_non_conformance ncr
      LEFT JOIN manufacturing_orders mo ON ncr.mo_id = mo.id
      LEFT JOIN work_orders wo ON ncr.workorder_id = wo.id
      LEFT JOIN products p ON ncr.product_id = p.id
      LEFT JOIN users u ON ncr.assigned_to = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (mo_id) {
      query += ` AND ncr.mo_id = $${paramCount++}`;
      params.push(mo_id);
    }

    if (state) {
      query += ` AND ncr.state = $${paramCount++}`;
      params.push(state);
    }

    if (severity) {
      query += ` AND ncr.severity = $${paramCount++}`;
      params.push(severity);
    }

    if (search) {
      query += ` AND (ncr.ncr_number ILIKE $${paramCount} OR mo.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY ncr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching NCRs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get NCR by ID
router.get('/ncr/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ncr.*, 
              mo.name as mo_name,
              mo.mo_number,
              wo.name as workorder_name,
              p.name as product_name,
              u.name as assigned_to_name
       FROM mo_non_conformance ncr
       LEFT JOIN manufacturing_orders mo ON ncr.mo_id = mo.id
       LEFT JOIN work_orders wo ON ncr.workorder_id = wo.id
       LEFT JOIN products p ON ncr.product_id = p.id
       LEFT JOIN users u ON ncr.assigned_to = u.id
       WHERE ncr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NCR not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching NCR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update NCR
router.put('/ncr/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'qty_non_conforming', 'severity', 'root_cause', 'corrective_action',
      'preventive_action', 'state', 'assigned_to', 'resolution_date',
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
      `UPDATE mo_non_conformance SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NCR not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating NCR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// REWORK ORDERS - CRUD
// ============================================

// Get rework orders
router.get('/rework', async (req, res) => {
  try {
    const { mo_id, ncr_id, state } = req.query;
    let query = `
      SELECT rw.*, 
             mo.name as mo_name,
             mo.mo_number,
             ncr.ncr_number,
             p.name as product_name
      FROM mo_rework_orders rw
      LEFT JOIN manufacturing_orders mo ON rw.mo_id = mo.id
      LEFT JOIN mo_non_conformance ncr ON rw.ncr_id = ncr.id
      LEFT JOIN products p ON rw.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (mo_id) {
      query += ` AND rw.mo_id = $${paramCount++}`;
      params.push(mo_id);
    }

    if (ncr_id) {
      query += ` AND rw.ncr_id = $${paramCount++}`;
      params.push(ncr_id);
    }

    if (state) {
      query += ` AND rw.state = $${paramCount++}`;
      params.push(state);
    }

    query += ' ORDER BY rw.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rework orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create rework order from NCR
router.post('/ncr/:ncr_id/rework', async (req, res) => {
  try {
    const { ncr_id } = req.params;
    const { qty_to_rework, workorder_id, date_planned_start, date_planned_finished, notes } = req.body;

    const ncr = await pool.query('SELECT * FROM mo_non_conformance WHERE id = $1', [ncr_id]);

    if (ncr.rows.length === 0) {
      return res.status(404).json({ error: 'NCR not found' });
    }

    const reworkName = `RWORK-${new Date().getFullYear()}-${String(ncr_id).padStart(6, '0')}`;

    const result = await pool.query(
      `INSERT INTO mo_rework_orders (
        mo_id, ncr_id, name, product_id, qty_to_rework,
        workorder_id, state, date_planned_start, date_planned_finished, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        ncr.rows[0].mo_id,
        ncr_id,
        reworkName,
        ncr.rows[0].product_id,
        qty_to_rework || ncr.rows[0].qty_non_conforming,
        workorder_id,
        'draft',
        date_planned_start,
        date_planned_finished,
        notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating rework order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

