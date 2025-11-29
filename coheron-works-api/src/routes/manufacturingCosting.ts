import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// MANUFACTURING COSTING - CRUD & Analytics
// ============================================

// Get costing for MO
router.get('/:mo_id', async (req, res) => {
  try {
    const { mo_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM mo_costing 
       WHERE mo_id = $1 
       ORDER BY cost_type`,
      [mo_id]
    );

    // Calculate totals
    const totals = result.rows.reduce(
      (acc, row) => ({
        standard_total: acc.standard_total + parseFloat(row.standard_cost || 0),
        actual_total: acc.actual_total + parseFloat(row.actual_cost || 0),
        variance_total: acc.variance_total + parseFloat(row.variance || 0),
      }),
      { standard_total: 0, actual_total: 0, variance_total: 0 }
    );

    res.json({
      costs: result.rows,
      totals,
      variance_percent:
        totals.standard_total > 0
          ? (totals.variance_total / totals.standard_total) * 100
          : 0,
    });
  } catch (error) {
    console.error('Error fetching costing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate and update costing for MO
router.post('/:mo_id/calculate', async (req, res) => {
  try {
    const { mo_id } = req.params;

    const mo = await pool.query('SELECT * FROM manufacturing_orders WHERE id = $1', [mo_id]);

    if (mo.rows.length === 0) {
      return res.status(404).json({ error: 'Manufacturing order not found' });
    }

    // Get material consumption
    const materialConsumption = await pool.query(
      `SELECT mc.*, p.standard_price
       FROM mo_material_consumption mc
       LEFT JOIN products p ON mc.product_id = p.id
       WHERE mc.mo_id = $1 AND mc.state = 'done'`,
      [mo_id]
    );

    // Calculate material cost
    let materialCost = 0;
    for (const item of materialConsumption.rows) {
      materialCost += parseFloat(item.product_uom_qty) * parseFloat(item.standard_price || 0);
    }

    // Get labor costs from work orders
    const workOrders = await pool.query(
      `SELECT wo.*, wc.costs_hour
       FROM work_orders wo
       LEFT JOIN workcenters wc ON wo.workcenter_id = wc.id
       WHERE wo.mo_id = $1 AND wo.state = 'done'`,
      [mo_id]
    );

    let laborCost = 0;
    for (const wo of workOrders.rows) {
      const hours = parseFloat(wo.duration || 0);
      const hourlyRate = parseFloat(wo.costs_hour || 0);
      laborCost += hours * hourlyRate;
    }

    // Calculate overhead (simplified - can be enhanced)
    const overheadCost = laborCost * 0.3; // 30% overhead

    // Get scrap cost
    const scrapQty = parseFloat(mo.rows[0].qty_scrapped || 0);
    const product = await pool.query('SELECT standard_price FROM products WHERE id = $1', [
      mo.rows[0].product_id,
    ]);
    const scrapCost = scrapQty * parseFloat(product.rows[0]?.standard_price || 0);

    // Get subcontracting costs
    const subcontracting = await pool.query(
      'SELECT SUM(cost) as total_cost FROM mo_subcontracting WHERE mo_id = $1 AND state = $2',
      [mo_id, 'done']
    );
    const subcontractCost = parseFloat(subcontracting.rows[0]?.total_cost || 0);

    const totalCost = materialCost + laborCost + overheadCost + scrapCost + subcontractCost;

    // Update or insert costing records
    const costTypes = [
      { type: 'material', cost: materialCost },
      { type: 'labor', cost: laborCost },
      { type: 'overhead', cost: overheadCost },
      { type: 'scrap', cost: scrapCost },
      { type: 'subcontract', cost: subcontractCost },
      { type: 'total', cost: totalCost },
    ];

    for (const costType of costTypes) {
      // Get standard cost (from BOM or product standard cost)
      let standardCost = 0;
      if (costType.type === 'material') {
        standardCost = materialCost; // Could be from BOM standard cost
      } else if (costType.type === 'total') {
        // Calculate standard total from product standard cost
        const qty = parseFloat(mo.rows[0].product_qty);
        standardCost = qty * parseFloat(product.rows[0]?.standard_price || 0);
      }

      const variance = costType.cost - standardCost;
      const variancePercent = standardCost > 0 ? (variance / standardCost) * 100 : 0;

      await pool.query(
        `INSERT INTO mo_costing (
          mo_id, cost_type, standard_cost, actual_cost, variance, variance_percent
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (mo_id, cost_type) DO UPDATE SET
          standard_cost = EXCLUDED.standard_cost,
          actual_cost = EXCLUDED.actual_cost,
          variance = EXCLUDED.variance,
          variance_percent = EXCLUDED.variance_percent`,
        [mo_id, costType.type, standardCost, costType.cost, variance, variancePercent]
      );
    }

    res.json({ message: 'Costing calculated successfully', total_cost: totalCost });
  } catch (error) {
    console.error('Error calculating costing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get costing analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const { date_from, date_to, product_id } = req.query;

    let query = `
      SELECT 
        COUNT(DISTINCT mc.mo_id) as total_mos,
        SUM(mc.standard_cost) FILTER (WHERE mc.cost_type = 'total') as total_standard_cost,
        SUM(mc.actual_cost) FILTER (WHERE mc.cost_type = 'total') as total_actual_cost,
        SUM(mc.variance) FILTER (WHERE mc.cost_type = 'total') as total_variance,
        AVG(mc.variance_percent) FILTER (WHERE mc.cost_type = 'total') as avg_variance_percent
      FROM mo_costing mc
      LEFT JOIN manufacturing_orders mo ON mc.mo_id = mo.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (date_from) {
      query += ` AND mo.date_finished >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND mo.date_finished <= $${paramCount++}`;
      params.push(date_to);
    }

    if (product_id) {
      query += ` AND mo.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    const summary = await pool.query(query, params);

    // Get cost breakdown by type
    let breakdownQuery = `
      SELECT 
        cost_type,
        SUM(standard_cost) as total_standard,
        SUM(actual_cost) as total_actual,
        SUM(variance) as total_variance
      FROM mo_costing mc
      LEFT JOIN manufacturing_orders mo ON mc.mo_id = mo.id
      WHERE mc.cost_type != 'total'
    `;
    const breakdownParams: any[] = [];
    let breakdownParamCount = 1;

    if (date_from) {
      breakdownQuery += ` AND mo.date_finished >= $${breakdownParamCount++}`;
      breakdownParams.push(date_from);
    }

    if (date_to) {
      breakdownQuery += ` AND mo.date_finished <= $${breakdownParamCount++}`;
      breakdownParams.push(date_to);
    }

    if (product_id) {
      breakdownQuery += ` AND mo.product_id = $${breakdownParamCount++}`;
      breakdownParams.push(product_id);
    }

    breakdownQuery += ' GROUP BY cost_type';

    const breakdown = await pool.query(breakdownQuery, breakdownParams);

    res.json({
      summary: summary.rows[0],
      breakdown: breakdown.rows,
    });
  } catch (error) {
    console.error('Error fetching costing analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get OEE tracking
router.get('/oee/tracking', async (req, res) => {
  try {
    const { workcenter_id, date_from, date_to } = req.query;

    let query = `
      SELECT 
        oee.*,
        wc.name as workcenter_name,
        wo.name as workorder_name
      FROM mo_oee_tracking oee
      LEFT JOIN workcenters wc ON oee.workcenter_id = wc.id
      LEFT JOIN work_orders wo ON oee.workorder_id = wo.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (workcenter_id) {
      query += ` AND oee.workcenter_id = $${paramCount++}`;
      params.push(workcenter_id);
    }

    if (date_from) {
      query += ` AND oee.date_tracked >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND oee.date_tracked <= $${paramCount++}`;
      params.push(date_to);
    }

    query += ' ORDER BY oee.date_tracked DESC, oee.workcenter_id';

    const result = await pool.query(query, params);

    // Calculate averages
    const averages = result.rows.reduce(
      (acc, row) => ({
        availability: acc.availability + parseFloat(row.availability_percent || 0),
        performance: acc.performance + parseFloat(row.performance_percent || 0),
        quality: acc.quality + parseFloat(row.quality_percent || 0),
        oee: acc.oee + parseFloat(row.oee_percent || 0),
        count: acc.count + 1,
      }),
      { availability: 0, performance: 0, quality: 0, oee: 0, count: 0 }
    );

    const avgCount = averages.count || 1;

    res.json({
      tracking: result.rows,
      averages: {
        availability: averages.availability / avgCount,
        performance: averages.performance / avgCount,
        quality: averages.quality / avgCount,
        oee: averages.oee / avgCount,
      },
    });
  } catch (error) {
    console.error('Error fetching OEE tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get KPI summary
router.get('/kpi/:mo_id', async (req, res) => {
  try {
    const { mo_id } = req.params;

    const result = await pool.query(
      'SELECT * FROM mo_kpi_summary WHERE mo_id = $1 ORDER BY metric_name',
      [mo_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KPI summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

