import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SALES TEAMS
// ============================================

// Get all sales teams
router.get('/teams', async (req, res) => {
  try {
    const { is_active } = req.query;
    let query = `
      SELECT st.*, 
             json_agg(
               json_build_object(
                 'id', stm.id,
                 'user_id', stm.user_id,
                 'role', stm.role,
                 'joined_date', stm.joined_date
               )
             ) FILTER (WHERE stm.id IS NOT NULL) as team_members
      FROM sales_teams st
      LEFT JOIN sales_team_members stm ON st.id = stm.team_id AND stm.is_active = true
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND st.is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    query += ' GROUP BY st.id ORDER BY st.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create sales team
router.post('/teams', async (req, res) => {
  try {
    const { name, code, manager_id, description, members } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const teamResult = await client.query(
        `INSERT INTO sales_teams (name, code, manager_id, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, code, manager_id, description]
      );

      const team = teamResult.rows[0];

      // Add team members
      if (members && members.length > 0) {
        for (const member of members) {
          await client.query(
            `INSERT INTO sales_team_members (team_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [team.id, member.user_id, member.role || 'rep']
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(team);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating sales team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member to team
router.post('/teams/:id/members', async (req, res) => {
  try {
    const { user_id, role } = req.body;

    const result = await pool.query(
      `INSERT INTO sales_team_members (team_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) 
       DO UPDATE SET role = EXCLUDED.role, is_active = true, joined_date = CURRENT_DATE
       RETURNING *`,
      [req.params.id, user_id, role || 'rep']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SALES INCENTIVES
// ============================================

// Get all incentives
router.get('/incentives', async (req, res) => {
  try {
    const { is_active } = req.query;
    let query = 'SELECT * FROM sales_incentives WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching incentives:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create incentive
router.post('/incentives', async (req, res) => {
  try {
    const {
      name,
      incentive_type,
      calculation_method,
      calculation_formula,
      conditions,
      amount_percentage,
      fixed_amount,
      tier_rules,
      valid_from,
      valid_until,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO sales_incentives (name, incentive_type, calculation_method, calculation_formula, conditions, amount_percentage, fixed_amount, tier_rules, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name,
        incentive_type,
        calculation_method,
        calculation_formula,
        JSON.stringify(conditions),
        amount_percentage,
        fixed_amount,
        JSON.stringify(tier_rules),
        valid_from,
        valid_until,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating incentive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate incentive for sale order
router.post('/incentives/calculate', async (req, res) => {
  try {
    const { sale_order_id, user_id } = req.body;

    // Get sale order
    const saleOrder = await pool.query('SELECT * FROM sale_orders WHERE id = $1', [sale_order_id]);
    if (saleOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    const order = saleOrder.rows[0];

    // Get applicable incentives
    const incentives = await pool.query(
      `SELECT * FROM sales_incentives 
       WHERE is_active = true 
       AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
       AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
       ORDER BY created_at DESC`
    );

    const applicableIncentives: any[] = [];

    for (const incentive of incentives.rows) {
      let matches = true;
      const conditions = incentive.conditions;

      // Check conditions (simplified - can be enhanced)
      if (conditions) {
        if (conditions.min_order_amount && order.amount_total < conditions.min_order_amount) {
          matches = false;
        }
        if (conditions.product_ids && conditions.product_ids.length > 0) {
          // Check if order has any of these products
          const orderLines = await pool.query('SELECT product_id FROM sale_order_lines WHERE order_id = $1', [sale_order_id]);
          const orderProductIds = orderLines.rows.map((l: any) => l.product_id);
          const hasProduct = conditions.product_ids.some((pid: number) => orderProductIds.includes(pid));
          if (!hasProduct) matches = false;
        }
      }

      if (matches) {
        let incentiveAmount = 0;

        if (incentive.calculation_method === 'percentage') {
          incentiveAmount = order.amount_total * (incentive.amount_percentage / 100);
        } else if (incentive.calculation_method === 'fixed') {
          incentiveAmount = incentive.fixed_amount;
        } else if (incentive.calculation_method === 'tiered' && incentive.tier_rules) {
          // Apply tiered rules
          const tiers = incentive.tier_rules;
          for (const tier of tiers) {
            if (order.amount_total >= tier.min_amount && (tier.max_amount === null || order.amount_total <= tier.max_amount)) {
              if (tier.type === 'percentage') {
                incentiveAmount = order.amount_total * (tier.value / 100);
              } else {
                incentiveAmount = tier.value;
              }
              break;
            }
          }
        }

        applicableIncentives.push({
          incentive_id: incentive.id,
          incentive_name: incentive.name,
          incentive_type: incentive.incentive_type,
          amount: incentiveAmount,
        });
      }
    }

    res.json({
      sale_order_id: sale_order_id,
      order_amount: order.amount_total,
      applicable_incentives: applicableIncentives,
      total_incentive: applicableIncentives.reduce((sum, inc) => sum + inc.amount, 0),
    });
  } catch (error) {
    console.error('Error calculating incentive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record incentive payment
router.post('/incentive-payments', async (req, res) => {
  try {
    const {
      incentive_id,
      user_id,
      sale_order_id,
      period_start,
      period_end,
      base_amount,
      incentive_amount,
      payment_status,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO sales_incentive_payments (incentive_id, user_id, sale_order_id, period_start, period_end, base_amount, incentive_amount, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [incentive_id, user_id, sale_order_id, period_start, period_end, base_amount, incentive_amount, payment_status || 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error recording incentive payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SALES ACTIVITY KPIs
// ============================================

// Get activity KPIs
router.get('/activity-kpis', async (req, res) => {
  try {
    const { user_id, period_start, period_end } = req.query;

    if (!user_id || !period_start || !period_end) {
      return res.status(400).json({ error: 'user_id, period_start, and period_end are required' });
    }

    const result = await pool.query(
      'SELECT * FROM sales_activity_kpis WHERE user_id = $1 AND period_start = $2 AND period_end = $3',
      [user_id, period_start, period_end]
    );

    if (result.rows.length === 0) {
      // Return zero values if not found
      return res.json({
        user_id: parseInt(user_id as string),
        period_start,
        period_end,
        calls_made: 0,
        emails_sent: 0,
        meetings_held: 0,
        leads_created: 0,
        opportunities_created: 0,
        quotes_sent: 0,
        orders_won: 0,
        orders_lost: 0,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching activity KPIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update activity KPIs
router.post('/activity-kpis', async (req, res) => {
  try {
    const {
      user_id,
      period_start,
      period_end,
      calls_made,
      emails_sent,
      meetings_held,
      leads_created,
      opportunities_created,
      quotes_sent,
      orders_won,
      orders_lost,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO sales_activity_kpis (user_id, period_start, period_end, calls_made, emails_sent, meetings_held, leads_created, opportunities_created, quotes_sent, orders_won, orders_lost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id, period_start, period_end)
       DO UPDATE SET 
         calls_made = sales_activity_kpis.calls_made + EXCLUDED.calls_made,
         emails_sent = sales_activity_kpis.emails_sent + EXCLUDED.emails_sent,
         meetings_held = sales_activity_kpis.meetings_held + EXCLUDED.meetings_held,
         leads_created = sales_activity_kpis.leads_created + EXCLUDED.leads_created,
         opportunities_created = sales_activity_kpis.opportunities_created + EXCLUDED.opportunities_created,
         quotes_sent = sales_activity_kpis.quotes_sent + EXCLUDED.quotes_sent,
         orders_won = sales_activity_kpis.orders_won + EXCLUDED.orders_won,
         orders_lost = sales_activity_kpis.orders_lost + EXCLUDED.orders_lost,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        user_id,
        period_start,
        period_end,
        calls_made || 0,
        emails_sent || 0,
        meetings_held || 0,
        leads_created || 0,
        opportunities_created || 0,
        quotes_sent || 0,
        orders_won || 0,
        orders_lost || 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating activity KPIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

