import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SALES FORECASTS
// ============================================

// Get all forecasts
router.get('/forecasts', async (req, res) => {
  try {
    const { user_id, territory_id, forecast_type, period_type, period_start, period_end } = req.query;
    let query = `
      SELECT sf.*, 
             json_agg(
               json_build_object(
                 'id', fl.id,
                 'product_id', fl.product_id,
                 'opportunity_id', fl.opportunity_id,
                 'forecasted_amount', fl.forecasted_amount,
                 'forecasted_quantity', fl.forecasted_quantity,
                 'probability', fl.probability
               )
             ) FILTER (WHERE fl.id IS NOT NULL) as forecast_lines
      FROM sales_forecasts sf
      LEFT JOIN forecast_lines fl ON sf.id = fl.forecast_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND sf.user_id = $${paramCount++}`;
      params.push(user_id);
    }

    if (territory_id) {
      query += ` AND sf.territory_id = $${paramCount++}`;
      params.push(territory_id);
    }

    if (forecast_type) {
      query += ` AND sf.forecast_type = $${paramCount++}`;
      params.push(forecast_type);
    }

    if (period_type) {
      query += ` AND sf.period_type = $${paramCount++}`;
      params.push(period_type);
    }

    if (period_start) {
      query += ` AND sf.period_start >= $${paramCount++}`;
      params.push(period_start);
    }

    if (period_end) {
      query += ` AND sf.period_end <= $${paramCount++}`;
      params.push(period_end);
    }

    query += ' GROUP BY sf.id ORDER BY sf.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get forecast by ID
router.get('/forecasts/:id', async (req, res) => {
  try {
    const forecastResult = await pool.query('SELECT * FROM sales_forecasts WHERE id = $1', [req.params.id]);

    if (forecastResult.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }

    const linesResult = await pool.query('SELECT * FROM forecast_lines WHERE forecast_id = $1', [req.params.id]);

    res.json({
      ...forecastResult.rows[0],
      forecast_lines: linesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create forecast
router.post('/forecasts', async (req, res) => {
  try {
    const {
      forecast_name,
      forecast_type,
      period_type,
      period_start,
      period_end,
      user_id,
      territory_id,
      forecasted_amount,
      forecasted_quantity,
      confidence_level,
      forecast_method,
      notes,
      forecast_lines,
    } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const forecastResult = await client.query(
        `INSERT INTO sales_forecasts (forecast_name, forecast_type, period_type, period_start, period_end, user_id, territory_id, forecasted_amount, forecasted_quantity, confidence_level, forecast_method, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          forecast_name,
          forecast_type,
          period_type,
          period_start,
          period_end,
          user_id,
          territory_id,
          forecasted_amount,
          forecasted_quantity,
          confidence_level,
          forecast_method || 'manual',
          notes,
        ]
      );

      const forecast = forecastResult.rows[0];

      // Add forecast lines
      if (forecast_lines && forecast_lines.length > 0) {
        for (const line of forecast_lines) {
          await client.query(
            `INSERT INTO forecast_lines (forecast_id, product_id, opportunity_id, forecasted_amount, forecasted_quantity, probability)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              forecast.id,
              line.product_id,
              line.opportunity_id,
              line.forecasted_amount,
              line.forecasted_quantity,
              line.probability,
            ]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(forecast);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update forecast with actuals
router.put('/forecasts/:id/actuals', async (req, res) => {
  try {
    const { actual_amount, actual_quantity } = req.body;

    const result = await pool.query(
      `UPDATE sales_forecasts 
       SET actual_amount = COALESCE($1, actual_amount),
           actual_quantity = COALESCE($2, actual_quantity),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [actual_amount, actual_quantity, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating forecast actuals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate pipeline-based forecast
router.post('/forecasts/pipeline', async (req, res) => {
  try {
    const { period_start, period_end, user_id, territory_id } = req.body;

    // Get opportunities in pipeline
    let opportunitiesQuery = `
      SELECT l.*, 
             SUM(l.expected_revenue * l.probability / 100.0) as weighted_revenue
      FROM leads l
      WHERE l.type = 'opportunity'
      AND l.stage NOT IN ('won', 'lost')
      AND l.date_deadline >= $1
      AND l.date_deadline <= $2
    `;
    const params: any[] = [period_start, period_end];
    let paramCount = 3;

    if (user_id) {
      opportunitiesQuery += ` AND l.user_id = $${paramCount++}`;
      params.push(user_id);
    }

    opportunitiesQuery += ' GROUP BY l.id';

    const opportunities = await pool.query(opportunitiesQuery, params);

    const forecastedAmount = opportunities.rows.reduce((sum, opp) => sum + parseFloat(opp.weighted_revenue || 0), 0);
    const forecastedQuantity = opportunities.rows.length;

    res.json({
      forecasted_amount: forecastedAmount,
      forecasted_quantity: forecastedQuantity,
      opportunity_count: opportunities.rows.length,
      opportunities: opportunities.rows,
    });
  } catch (error) {
    console.error('Error generating pipeline forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SALES TARGETS
// ============================================

// Get all targets
router.get('/targets', async (req, res) => {
  try {
    const { user_id, team_id, territory_id, period_type, period_start, period_end } = req.query;
    let query = 'SELECT * FROM sales_targets WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND user_id = $${paramCount++}`;
      params.push(user_id);
    }

    if (team_id) {
      query += ` AND team_id = $${paramCount++}`;
      params.push(team_id);
    }

    if (territory_id) {
      query += ` AND territory_id = $${paramCount++}`;
      params.push(territory_id);
    }

    if (period_type) {
      query += ` AND period_type = $${paramCount++}`;
      params.push(period_type);
    }

    if (period_start) {
      query += ` AND period_start >= $${paramCount++}`;
      params.push(period_start);
    }

    if (period_end) {
      query += ` AND period_end <= $${paramCount++}`;
      params.push(period_end);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching targets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create target
router.post('/targets', async (req, res) => {
  try {
    const {
      target_name,
      user_id,
      team_id,
      territory_id,
      product_id,
      period_type,
      period_start,
      period_end,
      revenue_target,
      quantity_target,
      deal_count_target,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO sales_targets (target_name, user_id, team_id, territory_id, product_id, period_type, period_start, period_end, revenue_target, quantity_target, deal_count_target)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        target_name,
        user_id,
        team_id,
        territory_id,
        product_id,
        period_type,
        period_start,
        period_end,
        revenue_target,
        quantity_target,
        deal_count_target,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating target:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update target achievements
router.put('/targets/:id/achievements', async (req, res) => {
  try {
    const { achievement_revenue, achievement_quantity, achievement_deal_count } = req.body;

    const result = await pool.query(
      `UPDATE sales_targets 
       SET achievement_revenue = COALESCE($1, achievement_revenue),
           achievement_quantity = COALESCE($2, achievement_quantity),
           achievement_deal_count = COALESCE($3, achievement_deal_count),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [achievement_revenue, achievement_quantity, achievement_deal_count, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const target = result.rows[0];
    const achievement_percentage = (target.achievement_revenue / target.revenue_target) * 100;

    res.json({
      ...target,
      achievement_percentage: achievement_percentage.toFixed(2),
    });
  } catch (error) {
    console.error('Error updating target achievements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-calculate achievements from sales orders
router.post('/targets/:id/calculate-achievements', async (req, res) => {
  try {
    const target = await pool.query('SELECT * FROM sales_targets WHERE id = $1', [req.params.id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const t = target.rows[0];

    // Build query to calculate achievements
    let query = `
      SELECT 
        COALESCE(SUM(amount_total), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(SUM(
          SELECT SUM(product_uom_qty) FROM sale_order_lines WHERE order_id = sale_orders.id
        ), 0) as total_quantity
      FROM sale_orders
      WHERE state IN ('sale', 'done')
      AND date_order >= $1
      AND date_order <= $2
    `;
    const params: any[] = [t.period_start, t.period_end];
    let paramCount = 3;

    if (t.user_id) {
      query += ` AND user_id = $${paramCount++}`;
      params.push(t.user_id);
    }

    const achievements = await pool.query(query, params);
    const achievement = achievements.rows[0];

    // Update target
    const result = await pool.query(
      `UPDATE sales_targets 
       SET achievement_revenue = $1,
           achievement_quantity = $2,
           achievement_deal_count = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        parseFloat(achievement.total_revenue),
        parseFloat(achievement.total_quantity),
        parseInt(achievement.total_orders),
        req.params.id,
      ]
    );

    const updated = result.rows[0];
    const achievement_percentage = (updated.achievement_revenue / updated.revenue_target) * 100;

    res.json({
      ...updated,
      achievement_percentage: achievement_percentage.toFixed(2),
    });
  } catch (error) {
    console.error('Error calculating achievements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

