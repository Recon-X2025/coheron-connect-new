import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// MANUFACTURING ORDERS - CRUD & Lifecycle
// ============================================

// Get all manufacturing orders with filters
router.get('/', async (req, res) => {
  try {
    const { state, mo_type, search, product_id, sale_order_id, date_from, date_to } = req.query;
    let query = `
      SELECT mo.*, 
             p.name as product_name,
             u.name as user_name,
             so.name as sale_order_name
      FROM manufacturing_orders mo
      LEFT JOIN products p ON mo.product_id = p.id
      LEFT JOIN users u ON mo.user_id = u.id
      LEFT JOIN sale_orders so ON mo.sale_order_id = so.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (state) {
      query += ` AND mo.state = $${paramCount++}`;
      params.push(state);
    }

    if (mo_type) {
      query += ` AND mo.mo_type = $${paramCount++}`;
      params.push(mo_type);
    }

    if (product_id) {
      query += ` AND mo.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    if (sale_order_id) {
      query += ` AND mo.sale_order_id = $${paramCount++}`;
      params.push(sale_order_id);
    }

    if (date_from) {
      query += ` AND mo.date_planned_start >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND mo.date_planned_finished <= $${paramCount++}`;
      params.push(date_to);
    }

    if (search) {
      query += ` AND (mo.name ILIKE $${paramCount} OR mo.mo_number ILIKE $${paramCount} OR p.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY mo.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching manufacturing orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get manufacturing order by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get MO details
    const moResult = await pool.query(
      `SELECT mo.*, 
              p.name as product_name,
              u.name as user_name,
              so.name as sale_order_name
       FROM manufacturing_orders mo
       LEFT JOIN products p ON mo.product_id = p.id
       LEFT JOIN users u ON mo.user_id = u.id
       LEFT JOIN sale_orders so ON mo.sale_order_id = so.id
       WHERE mo.id = $1`,
      [id]
    );

    if (moResult.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found' });
    }

    const mo = moResult.rows[0];

    // Get related data
    const [workOrders, materialConsumption, materialReservations, finishedGoods, qualityInspections, costing] = await Promise.all([
      pool.query('SELECT * FROM work_orders WHERE mo_id = $1 ORDER BY sequence', [id]),
      pool.query('SELECT * FROM mo_material_consumption WHERE mo_id = $1', [id]),
      pool.query('SELECT * FROM mo_material_reservations WHERE mo_id = $1', [id]),
      pool.query('SELECT * FROM mo_finished_goods WHERE mo_id = $1', [id]),
      pool.query('SELECT * FROM mo_quality_inspections WHERE mo_id = $1', [id]),
      pool.query('SELECT * FROM mo_costing WHERE mo_id = $1', [id]),
    ]);

    res.json({
      ...mo,
      work_orders: workOrders.rows,
      material_consumption: materialConsumption.rows,
      material_reservations: materialReservations.rows,
      finished_goods: finishedGoods.rows,
      quality_inspections: qualityInspections.rows,
      costing: costing.rows,
    });
  } catch (error) {
    console.error('Error fetching manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create manufacturing order
router.post('/', async (req, res) => {
  try {
    const {
      name,
      product_id,
      product_qty,
      mo_type,
      priority,
      state,
      date_planned_start,
      date_planned_finished,
      user_id,
      bom_id,
      routing_id,
      sale_order_id,
      project_id,
      warehouse_id,
      origin,
    } = req.body;

    // Generate MO number if not provided
    let mo_number = req.body.mo_number;
    if (!mo_number) {
      const countResult = await pool.query('SELECT COUNT(*) as count FROM manufacturing_orders');
      const count = parseInt(countResult.rows[0].count) + 1;
      mo_number = `MO-${new Date().getFullYear()}-${String(count).padStart(6, '0')}`;
    }

    const result = await pool.query(
      `INSERT INTO manufacturing_orders (
        name, mo_number, product_id, product_qty, mo_type, priority, state,
        date_planned_start, date_planned_finished, user_id, bom_id, routing_id,
        sale_order_id, project_id, warehouse_id, origin
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        name,
        mo_number,
        product_id,
        product_qty,
        mo_type || 'make_to_stock',
        priority || 'medium',
        state || 'draft',
        date_planned_start,
        date_planned_finished,
        user_id,
        bom_id,
        routing_id,
        sale_order_id,
        project_id,
        warehouse_id,
        origin || 'manual',
      ]
    );

    const mo = result.rows[0];

    // If BOM and routing are provided, create work orders
    if (bom_id && routing_id && state === 'confirmed') {
      await createWorkOrdersFromRouting(mo.id, routing_id, product_qty);
    }

    res.status(201).json(mo);
  } catch (error) {
    console.error('Error creating manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update manufacturing order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      state,
      product_qty,
      qty_produced,
      qty_scrapped,
      date_planned_start,
      date_planned_finished,
      date_start,
      date_finished,
      priority,
      user_id,
      notes,
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (state !== undefined) {
      updates.push(`state = $${paramCount++}`);
      params.push(state);
    }
    if (product_qty !== undefined) {
      updates.push(`product_qty = $${paramCount++}`);
      params.push(product_qty);
    }
    if (qty_produced !== undefined) {
      updates.push(`qty_produced = $${paramCount++}`);
      params.push(qty_produced);
    }
    if (qty_scrapped !== undefined) {
      updates.push(`qty_scrapped = $${paramCount++}`);
      params.push(qty_scrapped);
    }
    if (date_planned_start !== undefined) {
      updates.push(`date_planned_start = $${paramCount++}`);
      params.push(date_planned_start);
    }
    if (date_planned_finished !== undefined) {
      updates.push(`date_planned_finished = $${paramCount++}`);
      params.push(date_planned_finished);
    }
    if (date_start !== undefined) {
      updates.push(`date_start = $${paramCount++}`);
      params.push(date_start);
    }
    if (date_finished !== undefined) {
      updates.push(`date_finished = $${paramCount++}`);
      params.push(date_finished);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      params.push(priority);
    }
    if (user_id !== undefined) {
      updates.push(`user_id = $${paramCount++}`);
      params.push(user_id);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE manufacturing_orders 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete manufacturing order
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM manufacturing_orders WHERE id = $1 AND state = $2 RETURNING id',
      [req.params.id, 'draft']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found or cannot be deleted' });
    }

    res.json({ message: 'Manufacturing order deleted successfully' });
  } catch (error) {
    console.error('Error deleting manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// MANUFACTURING ORDER LIFECYCLE ACTIONS
// ============================================

// Confirm MO (draft -> confirmed)
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const mo = await pool.query('SELECT * FROM manufacturing_orders WHERE id = $1', [id]);

    if (mo.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found' });
    }

    if (mo.rows[0].state !== 'draft') {
      return res.status(400).json({ error: 'MO must be in draft state to confirm' });
    }

    // Check material availability
    const availability = await checkMaterialAvailability(parseInt(id));
    if (!availability.available) {
      return res.status(400).json({ 
        error: 'Materials not available',
        details: availability.missing_materials 
      });
    }

    // Create work orders from routing
    if (mo.rows[0].routing_id) {
      await createWorkOrdersFromRouting(parseInt(id), mo.rows[0].routing_id, mo.rows[0].product_qty);
    }

    // Reserve materials
    await reserveMaterials(parseInt(id));

    // Update state
    const result = await pool.query(
      'UPDATE manufacturing_orders SET state = $1, date_planned_start = COALESCE(date_planned_start, NOW()) WHERE id = $2 RETURNING *',
      ['confirmed', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error confirming manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start production (confirmed -> progress)
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const mo = await pool.query('SELECT * FROM manufacturing_orders WHERE id = $1', [id]);

    if (mo.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found' });
    }

    if (mo.rows[0].state !== 'confirmed') {
      return res.status(400).json({ error: 'MO must be confirmed to start' });
    }

    const result = await pool.query(
      `UPDATE manufacturing_orders 
       SET state = $1, date_start = NOW() 
       WHERE id = $2 
       RETURNING *`,
      ['progress', id]
    );

    // Start first work order
    await pool.query(
      `UPDATE work_orders 
       SET state = $1, date_start = NOW() 
       WHERE mo_id = $2 AND sequence = (
         SELECT MIN(sequence) FROM work_orders WHERE mo_id = $2
       )`,
      ['progress', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error starting manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete MO (progress -> done)
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { qty_produced } = req.body;

    const mo = await pool.query('SELECT * FROM manufacturing_orders WHERE id = $1', [id]);

    if (mo.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found' });
    }

    if (mo.rows[0].state !== 'progress') {
      return res.status(400).json({ error: 'MO must be in progress to complete' });
    }

    // Complete all work orders
    await pool.query(
      'UPDATE work_orders SET state = $1, date_finished = NOW() WHERE mo_id = $2 AND state != $1',
      ['done', id]
    );

    // Update MO
    const result = await pool.query(
      `UPDATE manufacturing_orders 
       SET state = $1, date_finished = NOW(), qty_produced = COALESCE($2, qty_produced)
       WHERE id = $3 
       RETURNING *`,
      ['done', qty_produced, id]
    );

    // Create finished goods receipt
    if (qty_produced) {
      await pool.query(
        `INSERT INTO mo_finished_goods (mo_id, product_id, product_uom_qty, state, date_actual)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, mo.rows[0].product_id, qty_produced, 'done']
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel MO
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const mo = await pool.query('SELECT * FROM manufacturing_orders WHERE id = $1', [id]);

    if (mo.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found' });
    }

    if (mo.rows[0].state === 'done') {
      return res.status(400).json({ error: 'Cannot cancel completed MO' });
    }

    // Cancel work orders
    await pool.query(
      'UPDATE work_orders SET state = $1 WHERE mo_id = $2 AND state != $1',
      ['cancel', id]
    );

    // Release material reservations
    await pool.query(
      'UPDATE mo_material_reservations SET state = $1 WHERE mo_id = $2',
      ['cancel', id]
    );

    const result = await pool.query(
      'UPDATE manufacturing_orders SET state = $1 WHERE id = $2 RETURNING *',
      ['cancel', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cancelling manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check material availability
router.get('/:id/availability', async (req, res) => {
  try {
    const availability = await checkMaterialAvailability(parseInt(req.params.id));
    res.json(availability);
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Split MO
router.post('/:id/split', async (req, res) => {
  try {
    const { id } = req.params;
    const { split_qty, reason } = req.body;

    const mo = await pool.query('SELECT * FROM manufacturing_orders WHERE id = $1', [id]);

    if (mo.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found' });
    }

    if (mo.rows[0].state !== 'draft' && mo.rows[0].state !== 'confirmed') {
      return res.status(400).json({ error: 'Can only split draft or confirmed MOs' });
    }

    if (split_qty >= mo.rows[0].product_qty) {
      return res.status(400).json({ error: 'Split quantity must be less than MO quantity' });
    }

    // Create new MO
    const newMoResult = await pool.query(
      `INSERT INTO manufacturing_orders (
        name, mo_number, product_id, product_qty, mo_type, priority, state,
        date_planned_start, date_planned_finished, user_id, bom_id, routing_id,
        sale_order_id, project_id, warehouse_id, origin
      )
      SELECT 
        name || '-SPLIT', 
        mo_number || '-SPLIT',
        product_id, $1, mo_type, priority, state,
        date_planned_start, date_planned_finished, user_id, bom_id, routing_id,
        sale_order_id, project_id, warehouse_id, origin
      FROM manufacturing_orders WHERE id = $2
      RETURNING *`,
      [split_qty, id]
    );

    // Update original MO quantity
    await pool.query(
      'UPDATE manufacturing_orders SET product_qty = product_qty - $1 WHERE id = $2',
      [split_qty, id]
    );

    // Record split
    await pool.query(
      'INSERT INTO mo_splits (parent_mo_id, child_mo_id, split_qty, reason) VALUES ($1, $2, $3, $4)',
      [id, newMoResult.rows[0].id, split_qty, reason]
    );

    res.json(newMoResult.rows[0]);
  } catch (error) {
    console.error('Error splitting manufacturing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkMaterialAvailability(moId: number) {
  const mo = await pool.query(
    `SELECT mo.*, b.id as bom_id 
     FROM manufacturing_orders mo
     LEFT JOIN bom b ON mo.bom_id = b.id
     WHERE mo.id = $1`,
    [moId]
  );

  if (mo.rows.length === 0 || !mo.rows[0].bom_id) {
    return { available: true, missing_materials: [] };
  }

  const bomLines = await pool.query(
    'SELECT * FROM bom_lines WHERE bom_id = $1',
    [mo.rows[0].bom_id]
  );

  const missing: any[] = [];
  for (const line of bomLines.rows) {
    const requiredQty = line.product_qty * mo.rows[0].product_qty;
    const product = await pool.query(
      'SELECT qty_available FROM products WHERE id = $1',
      [line.product_id]
    );

    if (product.rows.length === 0 || product.rows[0].qty_available < requiredQty) {
      missing.push({
        product_id: line.product_id,
        required_qty: requiredQty,
        available_qty: product.rows[0]?.qty_available || 0,
      });
    }
  }

  return {
    available: missing.length === 0,
    missing_materials: missing,
  };
}

async function reserveMaterials(moId: number) {
  const mo = await pool.query(
    `SELECT mo.*, b.id as bom_id 
     FROM manufacturing_orders mo
     LEFT JOIN bom b ON mo.bom_id = b.id
     WHERE mo.id = $1`,
    [moId]
  );

  if (mo.rows.length === 0 || !mo.rows[0].bom_id) {
    return;
  }

  const bomLines = await pool.query(
    'SELECT * FROM bom_lines WHERE bom_id = $1',
    [mo.rows[0].bom_id]
  );

  for (const line of bomLines.rows) {
    const requiredQty = line.product_qty * mo.rows[0].product_qty;
    await pool.query(
      `INSERT INTO mo_material_reservations 
       (mo_id, product_id, bom_line_id, product_uom_qty, state, date_planned)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        moId,
        line.product_id,
        line.id,
        requiredQty,
        'assigned',
        mo.rows[0].date_planned_start,
      ]
    );
  }
}

async function createWorkOrdersFromRouting(moId: number, routingId: number, qty: number) {
  const operations = await pool.query(
    'SELECT * FROM routing_operations WHERE routing_id = $1 ORDER BY sequence',
    [routingId]
  );

  for (const op of operations.rows) {
    const cycleTime = op.time_cycle || op.time_cycle_manual || 0;
    const duration = cycleTime * qty;
    const dateStart = new Date();
    const dateFinish = new Date(dateStart.getTime() + duration * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO work_orders 
       (name, mo_id, operation_id, workcenter_id, sequence, state, 
        date_planned_start, date_planned_finished, duration_expected)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        `WO-${moId}-${op.sequence}`,
        moId,
        op.id,
        op.workcenter_id,
        op.sequence,
        'pending',
        dateStart,
        dateFinish,
        duration,
      ]
    );
  }

  // Update workorder count
  await pool.query(
    'UPDATE manufacturing_orders SET workorder_count = $1 WHERE id = $2',
    [operations.rows.length, moId]
  );
}

export default router;
