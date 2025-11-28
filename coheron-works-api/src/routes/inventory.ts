import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// WAREHOUSES
// ============================================

// Get all warehouses
router.get('/warehouses', async (req, res) => {
  try {
    const { search, active } = req.query;
    let query = `
      SELECT w.*, 
             u.name as manager_name,
             p.name as partner_name
      FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id
      LEFT JOIN partners p ON w.partner_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (active !== undefined) {
      query += ` AND w.active = $${paramCount++}`;
      params.push(active === 'true');
    }

    if (search) {
      query += ` AND (w.name ILIKE $${paramCount} OR w.code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY w.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get warehouse by ID
router.get('/warehouses/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, 
              u.name as manager_name,
              p.name as partner_name
       FROM warehouses w
       LEFT JOIN users u ON w.manager_id = u.id
       LEFT JOIN partners p ON w.partner_id = p.id
       WHERE w.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create warehouse
router.post('/warehouses', async (req, res) => {
  try {
    const {
      code,
      name,
      warehouse_type,
      partner_id,
      address,
      city,
      state,
      country,
      zip_code,
      phone,
      email,
      manager_id,
      active,
      temperature_controlled,
      humidity_controlled,
      security_level,
      operating_hours,
      capacity_cubic_meters,
      notes,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO warehouses (
        code, name, warehouse_type, partner_id, address, city, state, country,
        zip_code, phone, email, manager_id, active, temperature_controlled,
        humidity_controlled, security_level, operating_hours, capacity_cubic_meters, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        code,
        name,
        warehouse_type || 'internal',
        partner_id,
        address,
        city,
        state,
        country,
        zip_code,
        phone,
        email,
        manager_id,
        active !== undefined ? active : true,
        temperature_controlled || false,
        humidity_controlled || false,
        security_level,
        operating_hours,
        capacity_cubic_meters,
        notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Warehouse code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update warehouse
router.put('/warehouses/:id', async (req, res) => {
  try {
    const {
      code,
      name,
      warehouse_type,
      partner_id,
      address,
      city,
      state,
      country,
      zip_code,
      phone,
      email,
      manager_id,
      active,
      temperature_controlled,
      humidity_controlled,
      security_level,
      operating_hours,
      capacity_cubic_meters,
      notes,
    } = req.body;

    const result = await pool.query(
      `UPDATE warehouses 
       SET code = $1, name = $2, warehouse_type = $3, partner_id = $4,
           address = $5, city = $6, state = $7, country = $8,
           zip_code = $9, phone = $10, email = $11, manager_id = $12,
           active = $13, temperature_controlled = $14, humidity_controlled = $15,
           security_level = $16, operating_hours = $17, capacity_cubic_meters = $18,
           notes = $19, updated_at = CURRENT_TIMESTAMP
       WHERE id = $20
       RETURNING *`,
      [
        code,
        name,
        warehouse_type,
        partner_id,
        address,
        city,
        state,
        country,
        zip_code,
        phone,
        email,
        manager_id,
        active,
        temperature_controlled,
        humidity_controlled,
        security_level,
        operating_hours,
        capacity_cubic_meters,
        notes,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// STOCK LOCATIONS
// ============================================

// Get locations by warehouse
router.get('/warehouses/:warehouseId/locations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM stock_locations 
       WHERE warehouse_id = $1 
       ORDER BY name`,
      [req.params.warehouseId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create location
router.post('/locations', async (req, res) => {
  try {
    const {
      name,
      location_id,
      warehouse_id,
      usage,
      active,
      scrap_location,
      return_location,
      posx,
      posy,
      posz,
      removal_strategy,
      barcode,
      notes,
    } = req.body;

    // Generate complete_name
    let completeName = name;
    if (location_id) {
      const parentResult = await pool.query(
        'SELECT complete_name FROM stock_locations WHERE id = $1',
        [location_id]
      );
      if (parentResult.rows.length > 0) {
        completeName = `${parentResult.rows[0].complete_name} / ${name}`;
      }
    }

    const result = await pool.query(
      `INSERT INTO stock_locations (
        name, complete_name, location_id, warehouse_id, usage, active,
        scrap_location, return_location, posx, posy, posz, removal_strategy,
        barcode, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        name,
        completeName,
        location_id,
        warehouse_id,
        usage || 'internal',
        active !== undefined ? active : true,
        scrap_location || false,
        return_location || false,
        posx,
        posy,
        posz,
        removal_strategy || 'fifo',
        barcode,
        notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// STOCK QUANTITY (Stock on Hand)
// ============================================

// Get stock quantity by product and location
router.get('/stock-quant', async (req, res) => {
  try {
    const { product_id, location_id, warehouse_id } = req.query;
    let query = `
      SELECT sq.*, 
             p.name as product_name,
             p.default_code as product_code,
             sl.name as location_name,
             w.name as warehouse_name,
             spl.name as lot_name
      FROM stock_quant sq
      JOIN products p ON sq.product_id = p.id
      JOIN stock_locations sl ON sq.location_id = sl.id
      LEFT JOIN warehouses w ON sl.warehouse_id = w.id
      LEFT JOIN stock_production_lot spl ON sq.lot_id = spl.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND sq.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    if (location_id) {
      query += ` AND sq.location_id = $${paramCount++}`;
      params.push(location_id);
    }

    if (warehouse_id) {
      query += ` AND w.id = $${paramCount++}`;
      params.push(warehouse_id);
    }

    query += ' ORDER BY p.name, sl.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock quantity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock summary by product
router.get('/stock-summary', async (req, res) => {
  try {
    const { product_id, warehouse_id } = req.query;
    let query = `
      SELECT 
        sq.product_id,
        p.name as product_name,
        p.default_code as product_code,
        COALESCE(SUM(sq.quantity), 0) as total_qty,
        COALESCE(SUM(sq.reserved_quantity), 0) as total_reserved,
        COALESCE(SUM(sq.quantity) - SUM(sq.reserved_quantity), 0) as available_qty,
        COUNT(DISTINCT sq.location_id) as location_count
      FROM stock_quant sq
      JOIN products p ON sq.product_id = p.id
      JOIN stock_locations sl ON sq.location_id = sl.id
      LEFT JOIN warehouses w ON sl.warehouse_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND sq.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    if (warehouse_id) {
      query += ` AND w.id = $${paramCount++}`;
      params.push(warehouse_id);
    }

    query += ' GROUP BY sq.product_id, p.name, p.default_code ORDER BY p.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GOODS RECEIPT NOTE (GRN)
// ============================================

// Get all GRNs
router.get('/grn', async (req, res) => {
  try {
    const { state, partner_id, warehouse_id, start_date, end_date } = req.query;
    let query = `
      SELECT g.*,
             p.name as partner_name,
             w.name as warehouse_name,
             u1.name as received_by_name,
             u2.name as approved_by_name,
             u3.name as qc_inspector_name
      FROM stock_grn g
      LEFT JOIN partners p ON g.partner_id = p.id
      LEFT JOIN warehouses w ON g.warehouse_id = w.id
      LEFT JOIN users u1 ON g.received_by = u1.id
      LEFT JOIN users u2 ON g.approved_by = u2.id
      LEFT JOIN users u3 ON g.qc_inspector_id = u3.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (state) {
      query += ` AND g.state = $${paramCount++}`;
      params.push(state);
    }

    if (partner_id) {
      query += ` AND g.partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (warehouse_id) {
      query += ` AND g.warehouse_id = $${paramCount++}`;
      params.push(warehouse_id);
    }

    if (start_date) {
      query += ` AND g.grn_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND g.grn_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' ORDER BY g.grn_date DESC, g.grn_number DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get GRN by ID with lines
router.get('/grn/:id', async (req, res) => {
  try {
    const grnResult = await pool.query(
      `SELECT g.*,
              p.name as partner_name,
              w.name as warehouse_name
       FROM stock_grn g
       LEFT JOIN partners p ON g.partner_id = p.id
       LEFT JOIN warehouses w ON g.warehouse_id = w.id
       WHERE g.id = $1`,
      [req.params.id]
    );

    if (grnResult.rows.length === 0) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    const linesResult = await pool.query(
      `SELECT gl.*,
              p.name as product_name,
              p.default_code as product_code
       FROM stock_grn_lines gl
       JOIN products p ON gl.product_id = p.id
       WHERE gl.grn_id = $1
       ORDER BY gl.id`,
      [req.params.id]
    );

    res.json({
      ...grnResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create GRN
router.post('/grn', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate GRN number
    const grnCountResult = await client.query(
      "SELECT COUNT(*) as count FROM stock_grn WHERE grn_number LIKE 'GRN-%'"
    );
    const grnNumber = `GRN-${String(parseInt(grnCountResult.rows[0].count) + 1).padStart(6, '0')}`;

    const {
      partner_id,
      warehouse_id,
      grn_date,
      expected_date,
      purchase_order_id,
      delivery_challan_number,
      supplier_invoice_number,
      notes,
      lines,
    } = req.body;

    // Insert GRN header
    const grnResult = await client.query(
      `INSERT INTO stock_grn (
        grn_number, partner_id, warehouse_id, grn_date, expected_date,
        purchase_order_id, delivery_challan_number, supplier_invoice_number,
        notes, state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
      RETURNING *`,
      [
        grnNumber,
        partner_id,
        warehouse_id,
        grn_date || new Date(),
        expected_date,
        purchase_order_id,
        delivery_challan_number,
        supplier_invoice_number,
        notes,
      ]
    );

    const grnId = grnResult.rows[0].id;

    // Insert GRN lines
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        await client.query(
          `INSERT INTO stock_grn_lines (
            grn_id, product_id, purchase_line_id, product_uom_id,
            ordered_qty, received_qty, unit_price, landed_cost
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            grnId,
            line.product_id,
            line.purchase_line_id,
            line.product_uom_id,
            line.ordered_qty,
            line.received_qty || 0,
            line.unit_price || 0,
            line.landed_cost || 0,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete GRN with lines
    const completeGrn = await pool.query(
      `SELECT g.*,
              p.name as partner_name,
              w.name as warehouse_name
       FROM stock_grn g
       LEFT JOIN partners p ON g.partner_id = p.id
       LEFT JOIN warehouses w ON g.warehouse_id = w.id
       WHERE g.id = $1`,
      [grnId]
    );

    res.status(201).json(completeGrn.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating GRN:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update GRN
router.put('/grn/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      grn_date,
      expected_date,
      delivery_challan_number,
      supplier_invoice_number,
      qc_status,
      qc_inspector_id,
      qc_date,
      qc_remarks,
      received_by,
      approved_by,
      state,
      notes,
      lines,
    } = req.body;

    // Update GRN header
    await client.query(
      `UPDATE stock_grn 
       SET grn_date = $1, expected_date = $2, delivery_challan_number = $3,
           supplier_invoice_number = $4, qc_status = $5, qc_inspector_id = $6,
           qc_date = $7, qc_remarks = $8, received_by = $9, approved_by = $10,
           state = $11, notes = $12, updated_at = CURRENT_TIMESTAMP
       WHERE id = $13`,
      [
        grn_date,
        expected_date,
        delivery_challan_number,
        supplier_invoice_number,
        qc_status,
        qc_inspector_id,
        qc_date,
        qc_remarks,
        received_by,
        approved_by,
        state,
        notes,
        req.params.id,
      ]
    );

    // Update lines if provided
    if (lines && Array.isArray(lines)) {
      // Delete existing lines
      await client.query('DELETE FROM stock_grn_lines WHERE grn_id = $1', [req.params.id]);

      // Insert new lines
      for (const line of lines) {
        await client.query(
          `INSERT INTO stock_grn_lines (
            grn_id, product_id, purchase_line_id, product_uom_id,
            ordered_qty, received_qty, accepted_qty, rejected_qty,
            unit_price, landed_cost, qc_status, qc_remarks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            req.params.id,
            line.product_id,
            line.purchase_line_id,
            line.product_uom_id,
            line.ordered_qty,
            line.received_qty || 0,
            line.accepted_qty || 0,
            line.rejected_qty || 0,
            line.unit_price || 0,
            line.landed_cost || 0,
            line.qc_status || 'pending',
            line.qc_remarks,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated GRN
    const result = await pool.query(
      `SELECT g.*,
              p.name as partner_name,
              w.name as warehouse_name
       FROM stock_grn g
       LEFT JOIN partners p ON g.partner_id = p.id
       LEFT JOIN warehouses w ON g.warehouse_id = w.id
       WHERE g.id = $1`,
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating GRN:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ============================================
// STOCK TRANSFERS
// ============================================

// Get all transfers
router.get('/transfers', async (req, res) => {
  try {
    const { state, from_warehouse_id, to_warehouse_id } = req.query;
    let query = `
      SELECT t.*,
             w1.name as from_warehouse_name,
             w2.name as to_warehouse_name,
             u1.name as initiated_by_name,
             u2.name as received_by_name
      FROM stock_transfer t
      LEFT JOIN warehouses w1 ON t.from_warehouse_id = w1.id
      LEFT JOIN warehouses w2 ON t.to_warehouse_id = w2.id
      LEFT JOIN users u1 ON t.initiated_by = u1.id
      LEFT JOIN users u2 ON t.received_by = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (state) {
      query += ` AND t.state = $${paramCount++}`;
      params.push(state);
    }

    if (from_warehouse_id) {
      query += ` AND t.from_warehouse_id = $${paramCount++}`;
      params.push(from_warehouse_id);
    }

    if (to_warehouse_id) {
      query += ` AND t.to_warehouse_id = $${paramCount++}`;
      params.push(to_warehouse_id);
    }

    query += ' ORDER BY t.transfer_date DESC, t.transfer_number DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create transfer
router.post('/transfers', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate transfer number
    const transferCountResult = await client.query(
      "SELECT COUNT(*) as count FROM stock_transfer WHERE transfer_number LIKE 'TRF-%'"
    );
    const transferNumber = `TRF-${String(parseInt(transferCountResult.rows[0].count) + 1).padStart(6, '0')}`;

    const {
      from_warehouse_id,
      to_warehouse_id,
      from_location_id,
      to_location_id,
      transfer_date,
      expected_delivery_date,
      transfer_type,
      initiated_by,
      notes,
      lines,
    } = req.body;

    const transferResult = await client.query(
      `INSERT INTO stock_transfer (
        transfer_number, from_warehouse_id, to_warehouse_id,
        from_location_id, to_location_id, transfer_date,
        expected_delivery_date, transfer_type, initiated_by, notes, state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
      RETURNING *`,
      [
        transferNumber,
        from_warehouse_id,
        to_warehouse_id,
        from_location_id,
        to_location_id,
        transfer_date || new Date(),
        expected_delivery_date,
        transfer_type || 'warehouse_to_warehouse',
        initiated_by,
        notes,
      ]
    );

    const transferId = transferResult.rows[0].id;

    // Insert transfer lines
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        await client.query(
          `INSERT INTO stock_transfer_lines (
            transfer_id, product_id, product_uom_id, quantity, lot_id, unit_cost
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            transferId,
            line.product_id,
            line.product_uom_id,
            line.quantity,
            line.lot_id,
            line.unit_cost || 0,
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(transferResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ============================================
// STOCK ADJUSTMENTS
// ============================================

// Get all adjustments
router.get('/adjustments', async (req, res) => {
  try {
    const { state, warehouse_id, adjustment_type, start_date, end_date } = req.query;
    let query = `
      SELECT a.*,
             w.name as warehouse_name,
             u1.name as adjusted_by_name,
             u2.name as approved_by_name
      FROM stock_adjustment a
      LEFT JOIN warehouses w ON a.warehouse_id = w.id
      LEFT JOIN users u1 ON a.adjusted_by = u1.id
      LEFT JOIN users u2 ON a.approved_by = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (state) {
      query += ` AND a.state = $${paramCount++}`;
      params.push(state);
    }

    if (warehouse_id) {
      query += ` AND a.warehouse_id = $${paramCount++}`;
      params.push(warehouse_id);
    }

    if (adjustment_type) {
      query += ` AND a.adjustment_type = $${paramCount++}`;
      params.push(adjustment_type);
    }

    if (start_date) {
      query += ` AND a.adjustment_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND a.adjustment_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' ORDER BY a.adjustment_date DESC, a.adjustment_number DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create adjustment
router.post('/adjustments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate adjustment number
    const adjCountResult = await client.query(
      "SELECT COUNT(*) as count FROM stock_adjustment WHERE adjustment_number LIKE 'ADJ-%'"
    );
    const adjustmentNumber = `ADJ-${String(parseInt(adjCountResult.rows[0].count) + 1).padStart(6, '0')}`;

    const {
      warehouse_id,
      location_id,
      adjustment_date,
      adjustment_type,
      reason_code,
      reason_description,
      adjusted_by,
      notes,
      lines,
    } = req.body;

    // Calculate total value
    let totalValue = 0;
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        const productResult = await client.query(
          'SELECT standard_price FROM products WHERE id = $1',
          [line.product_id]
        );
        const unitCost = productResult.rows[0]?.standard_price || line.unit_cost || 0;
        const adjustmentValue = Math.abs(line.adjustment_qty) * unitCost;
        totalValue += adjustmentValue;
      }
    }

    const adjustmentResult = await client.query(
      `INSERT INTO stock_adjustment (
        adjustment_number, warehouse_id, location_id, adjustment_date,
        adjustment_type, reason_code, reason_description, adjusted_by,
        total_value, notes, state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
      RETURNING *`,
      [
        adjustmentNumber,
        warehouse_id,
        location_id,
        adjustment_date || new Date(),
        adjustment_type,
        reason_code,
        reason_description,
        adjusted_by,
        totalValue,
        notes,
      ]
    );

    const adjustmentId = adjustmentResult.rows[0].id;

    // Insert adjustment lines
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        // Get system quantity
        const systemQtyResult = await client.query(
          `SELECT COALESCE(SUM(quantity), 0) as qty 
           FROM stock_quant 
           WHERE product_id = $1 AND location_id = $2`,
          [line.product_id, location_id || warehouse_id]
        );
        const systemQty = parseFloat(systemQtyResult.rows[0].qty);

        const productResult = await client.query(
          'SELECT standard_price FROM products WHERE id = $1',
          [line.product_id]
        );
        const unitCost = productResult.rows[0]?.standard_price || line.unit_cost || 0;
        const adjustmentQty = line.physical_qty - systemQty;
        const adjustmentValue = adjustmentQty * unitCost;

        await client.query(
          `INSERT INTO stock_adjustment_lines (
            adjustment_id, product_id, product_uom_id, system_qty,
            physical_qty, adjustment_qty, lot_id, unit_cost, adjustment_value, reason_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            adjustmentId,
            line.product_id,
            line.product_uom_id,
            systemQty,
            line.physical_qty,
            adjustmentQty,
            line.lot_id,
            unitCost,
            adjustmentValue,
            line.reason_code,
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(adjustmentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating adjustment:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ============================================
// BATCH/LOT MANAGEMENT
// ============================================

// Get lots by product
router.get('/lots', async (req, res) => {
  try {
    const { product_id, name } = req.query;
    let query = `
      SELECT l.*, p.name as product_name, p.default_code as product_code
      FROM stock_production_lot l
      JOIN products p ON l.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND l.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    if (name) {
      query += ` AND l.name ILIKE $${paramCount}`;
      params.push(`%${name}%`);
    }

    query += ' ORDER BY l.name DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lot
router.post('/lots', async (req, res) => {
  try {
    const { name, product_id, ref, note } = req.body;

    const result = await pool.query(
      `INSERT INTO stock_production_lot (name, product_id, ref, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, product_id, ref, note]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating lot:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Lot name already exists for this product' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ============================================
// REPLENISHMENT & REORDER SUGGESTIONS
// ============================================

// Get reorder suggestions
router.get('/reorder-suggestions', async (req, res) => {
  try {
    const { warehouse_id, state } = req.query;
    let query = `
      SELECT rs.*,
             p.name as product_name,
             p.default_code as product_code,
             w.name as warehouse_name
      FROM stock_reorder_suggestion rs
      JOIN products p ON rs.product_id = p.id
      LEFT JOIN warehouses w ON rs.warehouse_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (warehouse_id) {
      query += ` AND rs.warehouse_id = $${paramCount++}`;
      params.push(warehouse_id);
    }

    if (state) {
      query += ` AND rs.state = $${paramCount++}`;
      params.push(state);
    }

    query += ' ORDER BY rs.suggested_qty DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reorder suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// STOCK LEDGER
// ============================================

// Get stock ledger
router.get('/stock-ledger', async (req, res) => {
  try {
    const { product_id, location_id, start_date, end_date } = req.query;
    let query = `
      SELECT sl.*,
             p.name as product_name,
             p.default_code as product_code,
             loc.name as location_name,
             w.name as warehouse_name
      FROM stock_ledger sl
      JOIN products p ON sl.product_id = p.id
      JOIN stock_locations loc ON sl.location_id = loc.id
      LEFT JOIN warehouses w ON loc.warehouse_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND sl.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    if (location_id) {
      query += ` AND sl.location_id = $${paramCount++}`;
      params.push(location_id);
    }

    if (start_date) {
      query += ` AND sl.transaction_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND sl.transaction_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' ORDER BY sl.transaction_date DESC, sl.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock ledger:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

