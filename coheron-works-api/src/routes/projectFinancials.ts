import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// PROJECT BUDGETS
// ============================================

// Get project budgets
router.get('/:projectId/budgets', async (req, res) => {
  try {
    const { budget_type, status } = req.query;
    let query = `
      SELECT pb.*, 
             u.name as approved_by_name
      FROM project_budgets pb
      LEFT JOIN users u ON pb.approved_by = u.id
      WHERE pb.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (budget_type) {
      query += ` AND pb.budget_type = $${paramCount++}`;
      params.push(budget_type);
    }

    if (status) {
      query += ` AND pb.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY pb.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create budget
router.post('/:projectId/budgets', async (req, res) => {
  try {
    const {
      budget_type,
      category,
      planned_amount,
      committed_amount,
      actual_amount,
      status,
    } = req.body;

    if (!budget_type) {
      return res.status(400).json({ error: 'Budget type is required' });
    }

    const result = await pool.query(
      `INSERT INTO project_budgets (
        project_id, budget_type, category, planned_amount,
        committed_amount, actual_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.params.projectId,
        budget_type,
        category,
        planned_amount || 0,
        committed_amount || 0,
        actual_amount || 0,
        status || 'draft',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update budget
router.put('/budgets/:id', async (req, res) => {
  try {
    const {
      budget_type,
      category,
      planned_amount,
      committed_amount,
      actual_amount,
      revision_number,
      status,
      approved_by,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      budget_type,
      category,
      planned_amount,
      committed_amount,
      actual_amount,
      revision_number,
      status,
      approved_by,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    // Handle approval
    if (status === 'approved' && approved_by) {
      updateFields.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE project_budgets SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete budget
router.delete('/budgets/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM project_budgets WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PROJECT COSTS
// ============================================

// Get project costs
router.get('/:projectId/costs', async (req, res) => {
  try {
    const { cost_type, date_from, date_to } = req.query;
    let query = `
      SELECT pc.*, 
             t.name as task_name,
             i.name as invoice_name
      FROM project_costs pc
      LEFT JOIN project_tasks t ON pc.task_id = t.id
      LEFT JOIN invoices i ON pc.invoice_id = i.id
      WHERE pc.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (cost_type) {
      query += ` AND pc.cost_type = $${paramCount++}`;
      params.push(cost_type);
    }

    if (date_from) {
      query += ` AND pc.cost_date >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND pc.cost_date <= $${paramCount++}`;
      params.push(date_to);
    }

    query += ' ORDER BY pc.cost_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching costs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create cost entry
router.post('/:projectId/costs', async (req, res) => {
  try {
    const {
      task_id,
      cost_type,
      description,
      amount,
      currency,
      cost_date,
      invoice_id,
      purchase_order_id,
    } = req.body;

    if (!cost_type || !amount || !cost_date) {
      return res.status(400).json({ error: 'Cost type, amount, and date are required' });
    }

    const result = await pool.query(
      `INSERT INTO project_costs (
        project_id, task_id, cost_type, description, amount,
        currency, cost_date, invoice_id, purchase_order_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.params.projectId,
        task_id,
        cost_type,
        description,
        amount,
        currency || 'USD',
        cost_date,
        invoice_id,
        purchase_order_id,
      ]
    );

    // Update budget actual amount
    await pool.query(
      `UPDATE project_budgets 
       SET actual_amount = COALESCE(actual_amount, 0) + $1
       WHERE project_id = $2 
       AND budget_type = CASE 
         WHEN $3 IN ('labor', 'subcontractor', 'overhead') THEN 'opex'
         WHEN $3 = 'material' THEN 'capex'
         ELSE 'opex'
       END`,
      [amount, req.params.projectId, cost_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cost:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cost
router.put('/costs/:id', async (req, res) => {
  try {
    const {
      task_id,
      cost_type,
      description,
      amount,
      currency,
      cost_date,
      invoice_id,
      purchase_order_id,
    } = req.body;

    // Get old cost to calculate difference
    const oldCost = await pool.query(
      'SELECT project_id, cost_type, amount FROM project_costs WHERE id = $1',
      [req.params.id]
    );

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      task_id,
      cost_type,
      description,
      amount,
      currency,
      cost_date,
      invoice_id,
      purchase_order_id,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE project_costs SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    // Update budget if amount changed
    if (amount !== undefined && oldCost.rows.length > 0) {
      const oldAmount = parseFloat(oldCost.rows[0].amount) || 0;
      const newAmount = parseFloat(amount);
      const diff = newAmount - oldAmount;

      if (diff !== 0) {
        await pool.query(
          `UPDATE project_budgets 
           SET actual_amount = COALESCE(actual_amount, 0) + $1
           WHERE project_id = $2 
           AND budget_type = CASE 
             WHEN $3 IN ('labor', 'subcontractor', 'overhead') THEN 'opex'
             WHEN $3 = 'material' THEN 'capex'
             ELSE 'opex'
           END`,
          [diff, oldCost.rows[0].project_id, oldCost.rows[0].cost_type]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cost:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete cost
router.delete('/costs/:id', async (req, res) => {
  try {
    // Get cost before deletion
    const cost = await pool.query(
      'SELECT project_id, cost_type, amount FROM project_costs WHERE id = $1',
      [req.params.id]
    );

    const result = await pool.query('DELETE FROM project_costs WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    // Update budget
    if (cost.rows.length > 0) {
      const amount = parseFloat(cost.rows[0].amount) || 0;
      await pool.query(
        `UPDATE project_budgets 
         SET actual_amount = GREATEST(COALESCE(actual_amount, 0) - $1, 0)
         WHERE project_id = $2 
         AND budget_type = CASE 
           WHEN $3 IN ('labor', 'subcontractor', 'overhead') THEN 'opex'
           WHEN $3 = 'material' THEN 'capex'
           ELSE 'opex'
         END`,
        [amount, cost.rows[0].project_id, cost.rows[0].cost_type]
      );
    }

    res.json({ message: 'Cost deleted successfully' });
  } catch (error) {
    console.error('Error deleting cost:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PROJECT BILLING
// ============================================

// Get project billing
router.get('/:projectId/billing', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pb.*, 
              m.name as milestone_name,
              i.name as invoice_name,
              i.state as invoice_state,
              i.amount_total as invoice_amount
       FROM project_billing pb
       LEFT JOIN project_milestones m ON pb.milestone_id = m.id
       LEFT JOIN invoices i ON pb.invoice_id = i.id
       WHERE pb.project_id = $1
       ORDER BY pb.billing_date DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching billing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create billing entry
router.post('/:projectId/billing', async (req, res) => {
  try {
    const {
      milestone_id,
      invoice_id,
      billing_type,
      billing_percentage,
      amount,
      retention_amount,
      billing_date,
    } = req.body;

    if (!billing_type || !billed_amount || !billing_date) {
      return res.status(400).json({ error: 'Billing type, amount, and date are required' });
    }

    const result = await pool.query(
      `INSERT INTO project_billing (
        project_id, milestone_id, invoice_id, billing_type,
        billing_percentage, amount, retention_amount, billing_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
      RETURNING *`,
      [
        req.params.projectId,
        milestone_id,
        invoice_id,
        billing_type,
        billing_percentage,
        req.body.amount || req.body.billed_amount || 0,
        retention_amount || 0,
        billing_date,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating billing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// REVENUE RECOGNITION
// ============================================

// Get revenue recognition
router.get('/:projectId/revenue', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM project_revenue_recognition
       WHERE project_id = $1
       ORDER BY recognition_date DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create revenue recognition entry
router.post('/:projectId/revenue', async (req, res) => {
  try {
    const {
      recognition_method,
      completion_percentage,
      recognized_amount,
      deferred_amount,
      recognition_date,
      period_start,
      period_end,
    } = req.body;

    if (!recognition_method || !recognized_amount || !recognition_date) {
      return res.status(400).json({ error: 'Recognition method, amount, and date are required' });
    }

    const result = await pool.query(
      `INSERT INTO project_revenue_recognition (
        project_id, recognition_method, completion_percentage,
        recognized_amount, deferred_amount, recognition_date,
        accounting_period
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.params.projectId,
        recognition_method,
        completion_percentage,
        recognized_amount,
        deferred_amount || 0,
        recognition_date,
        req.body.accounting_period || `${new Date(recognition_date).getFullYear()}-Q${Math.floor(new Date(recognition_date).getMonth() / 3) + 1}`,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating revenue recognition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// FINANCIAL SUMMARY / ANALYTICS
// ============================================

router.get('/:projectId/financial-summary', async (req, res) => {
  try {
    // Budget summary
    const budgetResult = await pool.query(
      `SELECT 
         budget_type,
         SUM(planned_amount) as total_planned,
         SUM(committed_amount) as total_committed,
         SUM(actual_amount) as total_actual
       FROM project_budgets
       WHERE project_id = $1
       GROUP BY budget_type`,
      [req.params.projectId]
    );

    // Cost summary by type
    const costResult = await pool.query(
      `SELECT 
         cost_type,
         SUM(amount) as total_cost,
         COUNT(*) as cost_count
       FROM project_costs
       WHERE project_id = $1
       GROUP BY cost_type`,
      [req.params.projectId]
    );

    // Billing summary
    const billingResult = await pool.query(
      `SELECT 
         SUM(amount) as total_billed,
         SUM(retention_amount) as total_retention,
         COUNT(*) as billing_count
       FROM project_billing
       WHERE project_id = $1`,
      [req.params.projectId]
    );

    // Revenue summary
    const revenueResult = await pool.query(
      `SELECT 
         SUM(recognized_amount) as total_recognized,
         SUM(deferred_amount) as total_deferred,
         AVG(completion_percentage) as avg_completion
       FROM project_revenue_recognition
       WHERE project_id = $1`,
      [req.params.projectId]
    );

    res.json({
      budgets: budgetResult.rows,
      costs: costResult.rows,
      billing: billingResult.rows[0] || {},
      revenue: revenueResult.rows[0] || {},
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

