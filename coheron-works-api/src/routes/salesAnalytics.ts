import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SALES ANALYTICS & DASHBOARDS
// ============================================

// Get sales dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const { period_start, period_end, user_id, territory_id } = req.query;

    const periodStart = period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = period_end || new Date().toISOString().split('T')[0];

    let whereClause = `WHERE so.date_order >= $1 AND so.date_order <= $2`;
    const params: any[] = [periodStart, periodEnd];
    let paramCount = 3;

    if (user_id) {
      whereClause += ` AND so.user_id = $${paramCount++}`;
      params.push(user_id);
    }

    // Total Revenue
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(amount_total), 0) as total_revenue,
              COUNT(*) as total_orders,
              COUNT(DISTINCT partner_id) as unique_customers
       FROM sale_orders so
       ${whereClause}
       AND so.state IN ('sale', 'done')`,
      params
    );

    // Quote to Order Conversion
    const conversionResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE state = 'sent') as quotes_sent,
        COUNT(*) FILTER (WHERE state = 'sale') as quotes_converted,
        CASE 
          WHEN COUNT(*) FILTER (WHERE state = 'sent') > 0 
          THEN (COUNT(*) FILTER (WHERE state = 'sale')::DECIMAL / COUNT(*) FILTER (WHERE state = 'sent')::DECIMAL * 100)
          ELSE 0 
        END as conversion_rate
       FROM sale_orders
       ${whereClause.replace('so.', '')}`,
      params
    );

    // Pipeline Value
    const pipelineResult = await pool.query(
      `SELECT 
        COUNT(*) as total_opportunities,
        COALESCE(SUM(expected_revenue), 0) as total_pipeline_value,
        COALESCE(SUM(expected_revenue * probability / 100.0), 0) as weighted_pipeline_value
       FROM leads
       WHERE type = 'opportunity'
       AND stage NOT IN ('won', 'lost')
       AND date_deadline >= $1
       AND date_deadline <= $2`,
      [periodStart, periodEnd]
    );

    // Top Products
    const topProductsResult = await pool.query(
      `SELECT 
        p.id,
        p.name,
        SUM(sol.product_uom_qty) as quantity_sold,
        SUM(sol.price_subtotal) as revenue
       FROM sale_order_lines sol
       JOIN sale_orders so ON sol.order_id = so.id
       JOIN products p ON sol.product_id = p.id
       ${whereClause.replace('so.date_order', 'so.date_order').replace('so.user_id', 'so.user_id')}
       AND so.state IN ('sale', 'done')
       GROUP BY p.id, p.name
       ORDER BY revenue DESC
       LIMIT 10`,
      params
    );

    // Top Customers
    const topCustomersResult = await pool.query(
      `SELECT 
        pt.id,
        pt.name,
        COUNT(DISTINCT so.id) as order_count,
        SUM(so.amount_total) as total_revenue
       FROM sale_orders so
       JOIN partners pt ON so.partner_id = pt.id
       ${whereClause}
       AND so.state IN ('sale', 'done')
       GROUP BY pt.id, pt.name
       ORDER BY total_revenue DESC
       LIMIT 10`,
      params
    );

    // Sales by Stage (Pipeline)
    const pipelineStagesResult = await pool.query(
      `SELECT 
        stage,
        COUNT(*) as count,
        COALESCE(SUM(expected_revenue), 0) as total_value
       FROM leads
       WHERE type = 'opportunity'
       AND stage NOT IN ('won', 'lost')
       GROUP BY stage
       ORDER BY 
         CASE stage
           WHEN 'new' THEN 1
           WHEN 'qualified' THEN 2
           WHEN 'proposition' THEN 3
           ELSE 4
         END`
    );

    res.json({
      period: {
        start: periodStart,
        end: periodEnd,
      },
      revenue: revenueResult.rows[0],
      conversion: conversionResult.rows[0],
      pipeline: pipelineResult.rows[0],
      top_products: topProductsResult.rows,
      top_customers: topCustomersResult.rows,
      pipeline_stages: pipelineStagesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sales performance report
router.get('/performance', async (req, res) => {
  try {
    const { period_start, period_end, user_id, group_by } = req.query;

    const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const periodEnd = period_end || new Date().toISOString().split('T')[0];
    const groupBy = group_by || 'month';

    let dateGrouping = '';
    if (groupBy === 'month') {
      dateGrouping = "TO_CHAR(so.date_order, 'YYYY-MM')";
    } else if (groupBy === 'week') {
      dateGrouping = "TO_CHAR(so.date_order, 'IYYY-IW')";
    } else if (groupBy === 'day') {
      dateGrouping = "DATE(so.date_order)";
    } else {
      dateGrouping = "TO_CHAR(so.date_order, 'YYYY')";
    }

    let whereClause = `WHERE so.date_order >= $1 AND so.date_order <= $2 AND so.state IN ('sale', 'done')`;
    const params: any[] = [periodStart, periodEnd];
    let paramCount = 3;

    if (user_id) {
      whereClause += ` AND so.user_id = $${paramCount++}`;
      params.push(user_id);
    }

    const result = await pool.query(
      `SELECT 
        ${dateGrouping} as period,
        COUNT(*) as order_count,
        COALESCE(SUM(amount_total), 0) as total_revenue,
        COALESCE(AVG(amount_total), 0) as avg_order_value,
        COUNT(DISTINCT partner_id) as unique_customers
       FROM sale_orders so
       ${whereClause}
       GROUP BY ${dateGrouping}
       ORDER BY period ASC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product-wise sales report
router.get('/products', async (req, res) => {
  try {
    const { period_start, period_end, product_id, category_id } = req.query;

    const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const periodEnd = period_end || new Date().toISOString().split('T')[0];

    let whereClause = `WHERE so.date_order >= $1 AND so.date_order <= $2 AND so.state IN ('sale', 'done')`;
    const params: any[] = [periodStart, periodEnd];
    let paramCount = 3;

    if (product_id) {
      whereClause += ` AND sol.product_id = $${paramCount++}`;
      params.push(product_id);
    }

    if (category_id) {
      whereClause += ` AND p.categ_id = $${paramCount++}`;
      params.push(category_id);
    }

    const result = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.default_code,
        COUNT(DISTINCT so.id) as order_count,
        SUM(sol.product_uom_qty) as total_quantity,
        SUM(sol.price_subtotal) as total_revenue,
        AVG(sol.price_unit) as avg_price,
        MIN(sol.price_unit) as min_price,
        MAX(sol.price_unit) as max_price
       FROM sale_order_lines sol
       JOIN sale_orders so ON sol.order_id = so.id
       JOIN products p ON sol.product_id = p.id
       ${whereClause}
       GROUP BY p.id, p.name, p.default_code
       ORDER BY total_revenue DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer-wise sales report
router.get('/customers', async (req, res) => {
  try {
    const { period_start, period_end, partner_id } = req.query;

    const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const periodEnd = period_end || new Date().toISOString().split('T')[0];

    let whereClause = `WHERE so.date_order >= $1 AND so.date_order <= $2 AND so.state IN ('sale', 'done')`;
    const params: any[] = [periodStart, periodEnd];
    let paramCount = 3;

    if (partner_id) {
      whereClause += ` AND pt.id = $${paramCount++}`;
      params.push(partner_id);
    }

    const result = await pool.query(
      `SELECT 
        pt.id,
        pt.name,
        pt.email,
        COUNT(DISTINCT so.id) as order_count,
        SUM(so.amount_total) as total_revenue,
        AVG(so.amount_total) as avg_order_value,
        MIN(so.date_order) as first_order_date,
        MAX(so.date_order) as last_order_date
       FROM sale_orders so
       JOIN partners pt ON so.partner_id = pt.id
       ${whereClause}
       GROUP BY pt.id, pt.name, pt.email
       ORDER BY total_revenue DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sales cycle analysis
router.get('/sales-cycle', async (req, res) => {
  try {
    const { period_start, period_end } = req.query;

    const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const periodEnd = period_end || new Date().toISOString().split('T')[0];

    // Calculate average days from lead creation to order
    const result = await pool.query(
      `SELECT 
        AVG(EXTRACT(EPOCH FROM (so.date_order - l.created_at)) / 86400) as avg_sales_cycle_days,
        MIN(EXTRACT(EPOCH FROM (so.date_order - l.created_at)) / 86400) as min_sales_cycle_days,
        MAX(EXTRACT(EPOCH FROM (so.date_order - l.created_at)) / 86400) as max_sales_cycle_days,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (so.date_order - l.created_at)) / 86400) as median_sales_cycle_days
       FROM sale_orders so
       JOIN leads l ON so.opportunity_id = l.id
       WHERE so.date_order >= $1 
       AND so.date_order <= $2
       AND so.state IN ('sale', 'done')
       AND l.created_at IS NOT NULL`,
      [periodStart, periodEnd]
    );

    // Sales cycle by stage
    const stageCycleResult = await pool.query(
      `SELECT 
        l.stage,
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - l.updated_at)) / 86400) as avg_days_in_stage
       FROM leads l
       WHERE l.type = 'opportunity'
       AND l.stage NOT IN ('won', 'lost')
       GROUP BY l.stage`
    );

    res.json({
      overall: result.rows[0],
      by_stage: stageCycleResult.rows,
    });
  } catch (error) {
    console.error('Error fetching sales cycle data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get win/loss analysis
router.get('/win-loss', async (req, res) => {
  try {
    const { period_start, period_end, user_id } = req.query;

    const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const periodEnd = period_end || new Date().toISOString().split('T')[0];

    let whereClause = `WHERE l.updated_at >= $1 AND l.updated_at <= $2`;
    const params: any[] = [periodStart, periodEnd];
    let paramCount = 3;

    if (user_id) {
      whereClause += ` AND l.user_id = $${paramCount++}`;
      params.push(user_id);
    }

    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE l.stage = 'won') as won_count,
        COUNT(*) FILTER (WHERE l.stage = 'lost') as lost_count,
        COALESCE(SUM(expected_revenue) FILTER (WHERE l.stage = 'won'), 0) as won_value,
        COALESCE(SUM(expected_revenue) FILTER (WHERE l.stage = 'lost'), 0) as lost_value,
        CASE 
          WHEN COUNT(*) > 0 
          THEN (COUNT(*) FILTER (WHERE l.stage = 'won')::DECIMAL / COUNT(*)::DECIMAL * 100)
          ELSE 0 
        END as win_rate
       FROM leads l
       ${whereClause}
       AND l.type = 'opportunity'`,
      params
    );

    // Win/loss by reason
    const reasonResult = await pool.query(
      `SELECT 
        lost_reason,
        COUNT(*) as count,
        SUM(expected_revenue) as total_value
       FROM leads
       ${whereClause}
       AND type = 'opportunity'
       AND stage = 'lost'
       AND lost_reason IS NOT NULL
       GROUP BY lost_reason
       ORDER BY count DESC`,
      params
    );

    res.json({
      summary: result.rows[0],
      by_reason: reasonResult.rows,
    });
  } catch (error) {
    console.error('Error fetching win/loss data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

