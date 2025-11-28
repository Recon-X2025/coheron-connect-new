import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// CONTRACTS
// ============================================

// Get all contracts
router.get('/', async (req, res) => {
  try {
    const { partner_id, status, contract_type } = req.query;
    let query = `
      SELECT c.*, 
             json_agg(
               json_build_object(
                 'id', cl.id,
                 'product_id', cl.product_id,
                 'product_name', cl.product_name,
                 'quantity', cl.quantity,
                 'unit_price', cl.unit_price,
                 'total_price', cl.total_price
               )
             ) FILTER (WHERE cl.id IS NOT NULL) as contract_lines
      FROM contracts c
      LEFT JOIN contract_lines cl ON c.id = cl.contract_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (partner_id) {
      query += ` AND c.partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (status) {
      query += ` AND c.status = $${paramCount++}`;
      params.push(status);
    }

    if (contract_type) {
      query += ` AND c.contract_type = $${paramCount++}`;
      params.push(contract_type);
    }

    query += ' GROUP BY c.id ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get contract by ID
router.get('/:id', async (req, res) => {
  try {
    const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const linesResult = await pool.query('SELECT * FROM contract_lines WHERE contract_id = $1', [req.params.id]);
    const slasResult = await pool.query('SELECT * FROM slas WHERE contract_id = $1', [req.params.id]);

    res.json({
      ...contractResult.rows[0],
      contract_lines: linesResult.rows,
      slas: slasResult.rows,
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create contract
router.post('/', async (req, res) => {
  try {
    const {
      contract_number,
      partner_id,
      contract_type,
      start_date,
      end_date,
      renewal_date,
      auto_renew,
      billing_cycle,
      contract_value,
      currency,
      terms_and_conditions,
      contract_lines,
    } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate contract number if not provided
      let finalContractNumber = contract_number;
      if (!finalContractNumber) {
        const countResult = await client.query('SELECT COUNT(*) as count FROM contracts');
        finalContractNumber = `CNT-${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;
      }

      const contractResult = await client.query(
        `INSERT INTO contracts (contract_number, partner_id, contract_type, start_date, end_date, renewal_date, auto_renew, billing_cycle, contract_value, currency, terms_and_conditions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          finalContractNumber,
          partner_id,
          contract_type,
          start_date,
          end_date,
          renewal_date,
          auto_renew || false,
          billing_cycle || 'monthly',
          contract_value,
          currency || 'INR',
          terms_and_conditions,
        ]
      );

      const contract = contractResult.rows[0];

      // Add contract lines
      if (contract_lines && contract_lines.length > 0) {
        for (const line of contract_lines) {
          await client.query(
            `INSERT INTO contract_lines (contract_id, product_id, product_name, quantity, unit_price, total_price, billing_frequency)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              contract.id,
              line.product_id,
              line.product_name,
              line.quantity || 1,
              line.unit_price,
              line.total_price || line.unit_price * (line.quantity || 1),
              line.billing_frequency || billing_cycle,
            ]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(contract);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update contract
router.put('/:id', async (req, res) => {
  try {
    const {
      status,
      end_date,
      renewal_date,
      auto_renew,
      signed_at,
      signed_by,
      esign_document_id,
    } = req.body;

    const result = await pool.query(
      `UPDATE contracts 
       SET status = COALESCE($1, status),
           end_date = COALESCE($2, end_date),
           renewal_date = COALESCE($3, renewal_date),
           auto_renew = COALESCE($4, auto_renew),
           signed_at = COALESCE($5, signed_at),
           signed_by = COALESCE($6, signed_by),
           esign_document_id = COALESCE($7, esign_document_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [status, end_date, renewal_date, auto_renew, signed_at, signed_by, esign_document_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Renew contract
router.post('/:id/renew', async (req, res) => {
  try {
    const { new_end_date, new_renewal_date } = req.body;

    const oldContract = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    if (oldContract.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const old = oldContract.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update old contract status
      await client.query('UPDATE contracts SET status = $1 WHERE id = $2', ['renewed', req.params.id]);

      // Create new contract
      const newContractNumber = `${old.contract_number}-RENEW-${Date.now()}`;
      const newContract = await client.query(
        `INSERT INTO contracts (contract_number, partner_id, contract_type, start_date, end_date, renewal_date, auto_renew, billing_cycle, contract_value, currency, terms_and_conditions, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
         RETURNING *`,
        [
          newContractNumber,
          old.partner_id,
          old.contract_type,
          old.end_date || new Date(),
          new_end_date,
          new_renewal_date,
          old.auto_renew,
          old.billing_cycle,
          old.contract_value,
          old.currency,
          old.terms_and_conditions,
        ]
      );

      // Copy contract lines
      const oldLines = await client.query('SELECT * FROM contract_lines WHERE contract_id = $1', [req.params.id]);
      for (const line of oldLines.rows) {
        await client.query(
          `INSERT INTO contract_lines (contract_id, product_id, product_name, quantity, unit_price, total_price, billing_frequency)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newContract.rows[0].id,
            line.product_id,
            line.product_name,
            line.quantity,
            line.unit_price,
            line.total_price,
            line.billing_frequency,
          ]
        );
      }

      await client.query('COMMIT');
      res.json(newContract.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error renewing contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SLAs (Service Level Agreements)
// ============================================

// Get SLAs for contract
router.get('/:id/slas', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              (SELECT json_agg(sp) FROM sla_performance sp WHERE sp.sla_id = s.id ORDER BY sp.measurement_date DESC LIMIT 10) as recent_performance
       FROM slas s 
       WHERE s.contract_id = $1 
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SLAs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create SLA
router.post('/:id/slas', async (req, res) => {
  try {
    const { name, sla_type, target_value, unit, penalty_per_violation, credit_per_violation, measurement_period } = req.body;

    const result = await pool.query(
      `INSERT INTO slas (name, contract_id, sla_type, target_value, unit, penalty_per_violation, credit_per_violation, measurement_period)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, req.params.id, sla_type, target_value, unit, penalty_per_violation || 0, credit_per_violation || 0, measurement_period || 'monthly']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating SLA:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record SLA performance
router.post('/slas/:slaId/performance', async (req, res) => {
  try {
    const { measurement_date, actual_value, target_value, is_violated, violation_count, penalty_applied, credit_applied } = req.body;

    const sla = await pool.query('SELECT contract_id, target_value as default_target FROM slas WHERE id = $1', [req.params.slaId]);
    if (sla.rows.length === 0) {
      return res.status(404).json({ error: 'SLA not found' });
    }

    const result = await pool.query(
      `INSERT INTO sla_performance (sla_id, contract_id, measurement_date, actual_value, target_value, is_violated, violation_count, penalty_applied, credit_applied)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (sla_id, measurement_date) 
       DO UPDATE SET actual_value = EXCLUDED.actual_value, is_violated = EXCLUDED.is_violated, violation_count = EXCLUDED.violation_count, penalty_applied = EXCLUDED.penalty_applied, credit_applied = EXCLUDED.credit_applied
       RETURNING *`,
      [
        req.params.slaId,
        sla.rows[0].contract_id,
        measurement_date,
        actual_value,
        target_value || sla.rows[0].default_target,
        is_violated || false,
        violation_count || 0,
        penalty_applied || 0,
        credit_applied || 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error recording SLA performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SUBSCRIPTIONS
// ============================================

// Get all subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const { partner_id, status } = req.query;
    let query = 'SELECT * FROM subscriptions WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (partner_id) {
      query += ` AND partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create subscription
router.post('/subscriptions', async (req, res) => {
  try {
    const {
      subscription_number,
      contract_id,
      partner_id,
      product_id,
      subscription_plan,
      billing_cycle,
      unit_price,
      quantity,
      start_date,
      end_date,
      auto_renew,
    } = req.body;

    let finalSubscriptionNumber = subscription_number;
    if (!finalSubscriptionNumber) {
      const countResult = await pool.query('SELECT COUNT(*) as count FROM subscriptions');
      finalSubscriptionNumber = `SUB-${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;
    }

    // Calculate next billing date
    const start = new Date(start_date);
    let nextBillingDate = new Date(start);
    if (billing_cycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (billing_cycle === 'quarterly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
    } else if (billing_cycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    const result = await pool.query(
      `INSERT INTO subscriptions (subscription_number, contract_id, partner_id, product_id, subscription_plan, billing_cycle, unit_price, quantity, total_price, start_date, end_date, next_billing_date, auto_renew)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        finalSubscriptionNumber,
        contract_id,
        partner_id,
        product_id,
        subscription_plan,
        billing_cycle,
        unit_price,
        quantity || 1,
        unit_price * (quantity || 1),
        start_date,
        end_date,
        nextBillingDate,
        auto_renew !== false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel subscription
router.post('/subscriptions/:id/cancel', async (req, res) => {
  try {
    const { cancellation_reason } = req.body;

    const result = await pool.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', 
           cancellation_reason = $1, 
           cancelled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [cancellation_reason, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Usage-based billing rules
router.post('/subscriptions/:id/usage-rules', async (req, res) => {
  try {
    const { metric_name, unit_price, included_units, overage_price, billing_frequency } = req.body;

    const result = await pool.query(
      `INSERT INTO usage_billing_rules (subscription_id, metric_name, unit_price, included_units, overage_price, billing_frequency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, metric_name, unit_price, included_units || 0, overage_price, billing_frequency || 'monthly']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating usage billing rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

