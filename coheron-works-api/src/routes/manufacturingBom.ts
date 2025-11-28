import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// BILL OF MATERIALS (BOM) - CRUD
// ============================================

// Get all BOMs
router.get('/', async (req, res) => {
  try {
    const { product_id, active, search } = req.query;
    let query = `
      SELECT b.*, p.name as product_name
      FROM bom b
      LEFT JOIN products p ON b.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND b.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    if (active !== undefined) {
      query += ` AND b.active = $${paramCount++}`;
      params.push(active === 'true');
    }

    if (search) {
      query += ` AND (b.name ILIKE $${paramCount} OR b.code ILIKE $${paramCount} OR p.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get BOM by ID with lines
router.get('/:id', async (req, res) => {
  try {
    const bom = await pool.query(
      `SELECT b.*, p.name as product_name
       FROM bom b
       LEFT JOIN products p ON b.product_id = p.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (bom.rows.length === 0) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    const bomLines = await pool.query(
      `SELECT bl.*, p.name as product_name, p.default_code
       FROM bom_lines bl
       LEFT JOIN products p ON bl.product_id = p.id
       WHERE bl.bom_id = $1
       ORDER BY bl.sequence`,
      [req.params.id]
    );

    res.json({
      ...bom.rows[0],
      lines: bomLines.rows,
    });
  } catch (error) {
    console.error('Error fetching BOM:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create BOM
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      product_id,
      product_qty,
      product_uom_id,
      type,
      active,
      version,
      date_start,
      date_stop,
      sequence,
      ready_to_produce,
      user_id,
      notes,
      lines, // Array of BOM lines
    } = req.body;

    const result = await pool.query(
      `INSERT INTO bom (
        name, code, product_id, product_qty, product_uom_id, type, active,
        version, date_start, date_stop, sequence, ready_to_produce, user_id, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        name,
        code,
        product_id,
        product_qty || 1,
        product_uom_id,
        type || 'normal',
        active !== false,
        version || 1,
        date_start,
        date_stop,
        sequence || 10,
        ready_to_produce || 'asap',
        user_id,
        notes,
      ]
    );

    const bom = result.rows[0];

    // Create BOM lines if provided
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        await pool.query(
          `INSERT INTO bom_lines (
            bom_id, product_id, product_qty, product_uom_id, sequence,
            operation_id, type, date_start, date_stop, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            bom.id,
            line.product_id,
            line.product_qty,
            line.product_uom_id,
            line.sequence || 10,
            line.operation_id,
            line.type || 'normal',
            line.date_start,
            line.date_stop,
            line.notes,
          ]
        );
      }
    }

    res.status(201).json(bom);
  } catch (error) {
    console.error('Error creating BOM:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update BOM
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'code', 'product_id', 'product_qty', 'product_uom_id', 'type',
      'active', 'version', 'date_start', 'date_stop', 'sequence',
      'ready_to_produce', 'notes',
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
      `UPDATE bom SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating BOM:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete BOM
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM bom WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    res.json({ message: 'BOM deleted successfully' });
  } catch (error) {
    console.error('Error deleting BOM:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// BOM LINES - CRUD
// ============================================

// Get BOM lines
router.get('/:bom_id/lines', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bl.*, p.name as product_name, p.default_code
       FROM bom_lines bl
       LEFT JOIN products p ON bl.product_id = p.id
       WHERE bl.bom_id = $1
       ORDER BY bl.sequence`,
      [req.params.bom_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching BOM lines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add BOM line
router.post('/:bom_id/lines', async (req, res) => {
  try {
    const { bom_id } = req.params;
    const {
      product_id,
      product_qty,
      product_uom_id,
      sequence,
      operation_id,
      type,
      date_start,
      date_stop,
      notes,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO bom_lines (
        bom_id, product_id, product_qty, product_uom_id, sequence,
        operation_id, type, date_start, date_stop, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        bom_id,
        product_id,
        product_qty,
        product_uom_id,
        sequence || 10,
        operation_id,
        type || 'normal',
        date_start,
        date_stop,
        notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating BOM line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update BOM line
router.put('/lines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'product_id', 'product_qty', 'product_uom_id', 'sequence',
      'operation_id', 'type', 'date_start', 'date_stop', 'notes',
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
      `UPDATE bom_lines SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'BOM line not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating BOM line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete BOM line
router.delete('/lines/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM bom_lines WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'BOM line not found' });
    }

    res.json({ message: 'BOM line deleted successfully' });
  } catch (error) {
    console.error('Error deleting BOM line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

