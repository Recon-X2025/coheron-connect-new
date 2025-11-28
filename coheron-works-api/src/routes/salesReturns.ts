import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// RETURN MERCHANDISE AUTHORIZATION (RMA)
// ============================================

// Get all RMAs
router.get('/', async (req, res) => {
  try {
    const { partner_id, sale_order_id, status } = req.query;
    let query = `
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', rl.id,
                 'product_id', rl.product_id,
                 'quantity_returned', rl.quantity_returned,
                 'condition', rl.condition,
                 'refund_amount', rl.refund_amount
               )
             ) FILTER (WHERE rl.id IS NOT NULL) as rma_lines,
             so.name as sale_order_name,
             p.name as partner_name
      FROM rmas r
      LEFT JOIN rma_lines rl ON r.id = rl.rma_id
      LEFT JOIN sale_orders so ON r.sale_order_id = so.id
      LEFT JOIN partners p ON r.partner_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (partner_id) {
      query += ` AND r.partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (sale_order_id) {
      query += ` AND r.sale_order_id = $${paramCount++}`;
      params.push(sale_order_id);
    }

    if (status) {
      query += ` AND r.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' GROUP BY r.id, so.name, p.name ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching RMAs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get RMA by ID
router.get('/:id', async (req, res) => {
  try {
    const rmaResult = await pool.query(
      `SELECT r.*, so.name as sale_order_name, p.name as partner_name
       FROM rmas r
       LEFT JOIN sale_orders so ON r.sale_order_id = so.id
       LEFT JOIN partners p ON r.partner_id = p.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (rmaResult.rows.length === 0) {
      return res.status(404).json({ error: 'RMA not found' });
    }

    const linesResult = await pool.query(
      `SELECT rl.*, p.name as product_name
       FROM rma_lines rl
       LEFT JOIN products p ON rl.product_id = p.id
       WHERE rl.rma_id = $1`,
      [req.params.id]
    );

    res.json({
      ...rmaResult.rows[0],
      rma_lines: linesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching RMA:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create RMA
router.post('/', async (req, res) => {
  try {
    const {
      sale_order_id,
      delivery_order_id,
      partner_id,
      reason,
      requested_date,
      notes,
      rma_lines,
    } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate RMA number
      const countResult = await client.query('SELECT COUNT(*) as count FROM rmas');
      const rmaNumber = `RMA-${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

      // Calculate total refund amount
      let totalRefund = 0;
      if (rma_lines && rma_lines.length > 0) {
        for (const line of rma_lines) {
          totalRefund += parseFloat(line.refund_amount || 0);
        }
      }

      const rmaResult = await client.query(
        `INSERT INTO rmas (rma_number, sale_order_id, delivery_order_id, partner_id, reason, requested_date, refund_amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [rmaNumber, sale_order_id, delivery_order_id, partner_id, reason, requested_date, totalRefund, notes]
      );

      const rma = rmaResult.rows[0];

      // Create RMA lines
      if (rma_lines && rma_lines.length > 0) {
        for (const line of rma_lines) {
          await client.query(
            `INSERT INTO rma_lines (rma_id, sale_order_line_id, product_id, quantity_returned, condition, refund_amount, replacement_product_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              rma.id,
              line.sale_order_line_id,
              line.product_id,
              line.quantity_returned,
              line.condition || 'used',
              line.refund_amount || 0,
              line.replacement_product_id,
            ]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(rma);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating RMA:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update RMA status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, approved_date, received_date, processed_date, refund_method, replacement_order_id } = req.body;

    const result = await pool.query(
      `UPDATE rmas 
       SET status = $1,
           approved_date = COALESCE($2, approved_date),
           received_date = COALESCE($3, received_date),
           processed_date = COALESCE($4, processed_date),
           refund_method = COALESCE($5, refund_method),
           replacement_order_id = COALESCE($6, replacement_order_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [status, approved_date, received_date, processed_date, refund_method, replacement_order_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RMA not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating RMA status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WARRANTIES
// ============================================

// Get warranties
router.get('/warranties', async (req, res) => {
  try {
    const { partner_id, product_id, status } = req.query;
    let query = 'SELECT w.*, p.name as product_name, pt.name as partner_name FROM warranties w LEFT JOIN products p ON w.product_id = p.id LEFT JOIN partners pt ON w.partner_id = pt.id WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (partner_id) {
      query += ` AND w.partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (product_id) {
      query += ` AND w.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    if (status) {
      query += ` AND w.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY w.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching warranties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create warranty
router.post('/warranties', async (req, res) => {
  try {
    const {
      sale_order_id,
      sale_order_line_id,
      product_id,
      partner_id,
      warranty_type,
      warranty_period_months,
      start_date,
      terms_and_conditions,
    } = req.body;

    // Generate warranty number
    const countResult = await pool.query('SELECT COUNT(*) as count FROM warranties');
    const warrantyNumber = `WAR-${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

    // Calculate end date
    const start = new Date(start_date);
    const end = new Date(start);
    end.setMonth(end.getMonth() + warranty_period_months);

    const result = await pool.query(
      `INSERT INTO warranties (warranty_number, sale_order_id, sale_order_line_id, product_id, partner_id, warranty_type, warranty_period_months, start_date, end_date, terms_and_conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        warrantyNumber,
        sale_order_id,
        sale_order_line_id,
        product_id,
        partner_id,
        warranty_type,
        warranty_period_months,
        start_date,
        end.toISOString().split('T')[0],
        terms_and_conditions,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating warranty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// REPAIR REQUESTS
// ============================================

// Get repair requests
router.get('/repairs', async (req, res) => {
  try {
    const { partner_id, status } = req.query;
    let query = `
      SELECT rr.*, p.name as product_name, pt.name as partner_name
      FROM repair_requests rr
      LEFT JOIN products p ON rr.product_id = p.id
      LEFT JOIN partners pt ON rr.partner_id = pt.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (partner_id) {
      query += ` AND rr.partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (status) {
      query += ` AND rr.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY rr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching repair requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create repair request
router.post('/repairs', async (req, res) => {
  try {
    const {
      warranty_id,
      sale_order_id,
      partner_id,
      product_id,
      issue_description,
      requested_date,
      estimated_cost,
    } = req.body;

    // Generate repair number
    const countResult = await pool.query('SELECT COUNT(*) as count FROM repair_requests');
    const repairNumber = `REP-${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

    const result = await pool.query(
      `INSERT INTO repair_requests (repair_number, warranty_id, sale_order_id, partner_id, product_id, issue_description, requested_date, estimated_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [repairNumber, warranty_id, sale_order_id, partner_id, product_id, issue_description, requested_date, estimated_cost || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating repair request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update repair request status
router.put('/repairs/:id/status', async (req, res) => {
  try {
    const { status, completed_date, actual_cost, repair_center, notes } = req.body;

    const result = await pool.query(
      `UPDATE repair_requests 
       SET status = $1,
           completed_date = COALESCE($2, completed_date),
           actual_cost = COALESCE($3, actual_cost),
           repair_center = COALESCE($4, repair_center),
           notes = COALESCE($5, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [status, completed_date, actual_cost, repair_center, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repair request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating repair request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

