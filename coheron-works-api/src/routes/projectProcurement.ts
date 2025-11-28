import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// PROJECT PROCUREMENT & INVENTORY
// ============================================

// Get project purchase requests
router.get('/:projectId/purchase-requests', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT pr.*, 
             u.name as requested_by_name,
             u2.name as approved_by_name,
             t.name as task_name,
             COUNT(prl.id) as line_count,
             SUM(prl.total_amount) as total_amount
      FROM project_purchase_requests pr
      LEFT JOIN users u ON pr.requested_by = u.id
      LEFT JOIN users u2 ON pr.approved_by = u2.id
      LEFT JOIN project_tasks t ON pr.task_id = t.id
      LEFT JOIN project_purchase_request_lines prl ON pr.id = prl.request_id
      WHERE pr.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND pr.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' GROUP BY pr.id, u.name, u2.name, t.name ORDER BY pr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create purchase request
router.post('/:projectId/purchase-requests', async (req, res) => {
  try {
    const {
      task_id,
      description,
      required_date,
      requested_by,
      lines,
    } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Generate request code
    const project = await pool.query('SELECT code FROM projects WHERE id = $1', [
      req.params.projectId,
    ]);
    const projectCode = project.rows[0]?.code || 'PROJ';
    const count = await pool.query(
      'SELECT COUNT(*) as count FROM project_purchase_requests WHERE project_id = $1',
      [req.params.projectId]
    );
    const num = parseInt(count.rows[0]?.count || '0') + 1;
    const requestCode = `${projectCode}-PR-${num.toString().padStart(4, '0')}`;

    // Create request
    const requestResult = await pool.query(
      `INSERT INTO project_purchase_requests (
        project_id, request_code, task_id, description, required_date, requested_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'draft')
      RETURNING *`,
      [
        req.params.projectId,
        requestCode,
        task_id,
        description,
        required_date,
        requested_by,
      ]
    );

    const requestId = requestResult.rows[0].id;

    // Create lines
    if (lines && Array.isArray(lines) && lines.length > 0) {
      for (const line of lines) {
        const totalAmount = (line.quantity || 0) * (line.unit_price || 0);
        await pool.query(
          `INSERT INTO project_purchase_request_lines (
            request_id, product_id, description, quantity, unit_price, total_amount, vendor_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            requestId,
            line.product_id,
            line.description,
            line.quantity,
            line.unit_price,
            totalAmount,
            line.vendor_id,
          ]
        );
      }
    }

    // Get full request with lines
    const fullRequest = await pool.query(
      `SELECT pr.*, 
              u.name as requested_by_name,
              t.name as task_name
       FROM project_purchase_requests pr
       LEFT JOIN users u ON pr.requested_by = u.id
       LEFT JOIN project_tasks t ON pr.task_id = t.id
       WHERE pr.id = $1`,
      [requestId]
    );

    const linesResult = await pool.query(
      `SELECT prl.*, 
              p.name as product_name
       FROM project_purchase_request_lines prl
       LEFT JOIN products p ON prl.product_id = p.id
       WHERE prl.request_id = $1`,
      [requestId]
    );

    res.status(201).json({
      ...fullRequest.rows[0],
      lines: linesResult.rows,
    });
  } catch (error) {
    console.error('Error creating purchase request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get purchase request lines
router.get('/purchase-requests/:id/lines', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT prl.*, 
              p.name as product_name,
              p.default_code as product_code
       FROM project_purchase_request_lines prl
       LEFT JOIN products p ON prl.product_id = p.id
       WHERE prl.request_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchase request lines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve purchase request
router.post('/purchase-requests/:id/approve', async (req, res) => {
  try {
    const { approved_by } = req.body;

    const result = await pool.query(
      `UPDATE project_purchase_requests 
       SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [approved_by, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving purchase request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// INVENTORY RESERVATIONS
// ============================================

// Get project inventory reservations
router.get('/:projectId/inventory-reservations', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ir.*, 
             p.name as product_name,
             p.default_code as product_code,
             t.name as task_name
      FROM project_inventory_reservations ir
      LEFT JOIN products p ON ir.product_id = p.id
      LEFT JOIN project_tasks t ON ir.task_id = t.id
      WHERE ir.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND ir.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY ir.reserved_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory reservations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create inventory reservation
router.post('/:projectId/inventory-reservations', async (req, res) => {
  try {
    const {
      task_id,
      product_id,
      quantity,
      batch_number,
      serial_number,
    } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    const result = await pool.query(
      `INSERT INTO project_inventory_reservations (
        project_id, task_id, product_id, quantity, batch_number, serial_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'reserved')
      RETURNING *`,
      [
        req.params.projectId,
        task_id,
        product_id,
        quantity,
        batch_number,
        serial_number,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating inventory reservation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update reservation status (allocate, consume, release)
router.put('/inventory-reservations/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['reserved', 'allocated', 'consumed', 'released'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE project_inventory_reservations 
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

