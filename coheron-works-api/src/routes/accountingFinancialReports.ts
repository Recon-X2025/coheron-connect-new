import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ========== TRIAL BALANCE ==========

router.get('/trial-balance', async (req, res) => {
  try {
    const { date_from, date_to, account_type } = req.query;
    const dateFrom = date_from || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dateTo = date_to || new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        a.id,
        a.code,
        a.name,
        a.account_type,
        COALESCE(SUM(aml.debit), 0) as total_debit,
        COALESCE(SUM(aml.credit), 0) as total_credit,
        COALESCE(SUM(aml.debit) - SUM(aml.credit), 0) as balance
      FROM account_account a
      LEFT JOIN account_move_line aml ON a.id = aml.account_id
        AND aml.date >= $1::date 
        AND aml.date <= $2::date
        AND EXISTS (
          SELECT 1 FROM account_move m 
          WHERE m.id = aml.move_id AND m.state = 'posted'
        )
      WHERE a.deprecated = false
    `;
    const params: any[] = [dateFrom, dateTo];

    if (account_type) {
      query += ` AND a.account_type = $3`;
      params.push(account_type);
    }

    query += `
      GROUP BY a.id, a.code, a.name, a.account_type
      HAVING COALESCE(SUM(aml.debit), 0) != 0 OR COALESCE(SUM(aml.credit), 0) != 0
      ORDER BY a.code
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== BALANCE SHEET ==========

router.get('/balance-sheet', async (req, res) => {
  try {
    const { date_as_of } = req.query;
    const dateAsOf = date_as_of || new Date().toISOString().split('T')[0];

    // Assets
    const assetsResult = await pool.query(
      `SELECT 
        a.account_type,
        COALESCE(SUM(aml.debit) - SUM(aml.credit), 0) as balance
      FROM account_account a
      LEFT JOIN account_move_line aml ON a.id = aml.account_id
        AND aml.date <= $1::date
        AND EXISTS (
          SELECT 1 FROM account_move m 
          WHERE m.id = aml.move_id AND m.state = 'posted'
        )
      WHERE a.deprecated = false
        AND a.account_type LIKE 'asset%'
      GROUP BY a.account_type
      ORDER BY a.account_type`,
      [dateAsOf]
    );

    // Liabilities
    const liabilitiesResult = await pool.query(
      `SELECT 
        a.account_type,
        COALESCE(SUM(aml.credit) - SUM(aml.debit), 0) as balance
      FROM account_account a
      LEFT JOIN account_move_line aml ON a.id = aml.account_id
        AND aml.date <= $1::date
        AND EXISTS (
          SELECT 1 FROM account_move m 
          WHERE m.id = aml.move_id AND m.state = 'posted'
        )
      WHERE a.deprecated = false
        AND a.account_type LIKE 'liability%'
      GROUP BY a.account_type
      ORDER BY a.account_type`,
      [dateAsOf]
    );

    // Equity
    const equityResult = await pool.query(
      `SELECT 
        a.account_type,
        COALESCE(SUM(aml.credit) - SUM(aml.debit), 0) as balance
      FROM account_account a
      LEFT JOIN account_move_line aml ON a.id = aml.account_id
        AND aml.date <= $1::date
        AND EXISTS (
          SELECT 1 FROM account_move m 
          WHERE m.id = aml.move_id AND m.state = 'posted'
        )
      WHERE a.deprecated = false
        AND a.account_type LIKE 'equity%'
      GROUP BY a.account_type
      ORDER BY a.account_type`,
      [dateAsOf]
    );

    res.json({
      date_as_of: dateAsOf,
      assets: assetsResult.rows,
      liabilities: liabilitiesResult.rows,
      equity: equityResult.rows,
    });
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== PROFIT & LOSS ==========

router.get('/profit-loss', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const dateFrom = date_from || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dateTo = date_to || new Date().toISOString().split('T')[0];

    // Income
    const incomeResult = await pool.query(
      `SELECT 
        a.account_type,
        COALESCE(SUM(aml.credit) - SUM(aml.debit), 0) as balance
      FROM account_account a
      LEFT JOIN account_move_line aml ON a.id = aml.account_id
        AND aml.date >= $1::date 
        AND aml.date <= $2::date
        AND EXISTS (
          SELECT 1 FROM account_move m 
          WHERE m.id = aml.move_id AND m.state = 'posted'
        )
      WHERE a.deprecated = false
        AND a.account_type LIKE 'income%'
      GROUP BY a.account_type
      ORDER BY a.account_type`,
      [dateFrom, dateTo]
    );

    // Expenses
    const expenseResult = await pool.query(
      `SELECT 
        a.account_type,
        COALESCE(SUM(aml.debit) - SUM(aml.credit), 0) as balance
      FROM account_account a
      LEFT JOIN account_move_line aml ON a.id = aml.account_id
        AND aml.date >= $1::date 
        AND aml.date <= $2::date
        AND EXISTS (
          SELECT 1 FROM account_move m 
          WHERE m.id = aml.move_id AND m.state = 'posted'
        )
      WHERE a.deprecated = false
        AND a.account_type LIKE 'expense%'
      GROUP BY a.account_type
      ORDER BY a.account_type`,
      [dateFrom, dateTo]
    );

    const totalIncome = incomeResult.rows.reduce((sum, row) => sum + parseFloat(row.balance || 0), 0);
    const totalExpenses = expenseResult.rows.reduce((sum, row) => sum + parseFloat(row.balance || 0), 0);
    const netIncome = totalIncome - totalExpenses;

    res.json({
      date_from: dateFrom,
      date_to: dateTo,
      income: incomeResult.rows,
      expenses: expenseResult.rows,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_income: netIncome,
    });
  } catch (error) {
    console.error('Error fetching profit & loss:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== CASH FLOW ==========

router.get('/cash-flow', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const dateFrom = date_from || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dateTo = date_to || new Date().toISOString().split('T')[0];

    // Operating activities (simplified - would need proper categorization)
    const operatingResult = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN aml.debit > 0 THEN aml.debit ELSE 0 END), 0) as cash_out,
        COALESCE(SUM(CASE WHEN aml.credit > 0 THEN aml.credit ELSE 0 END), 0) as cash_in
      FROM account_move_line aml
      JOIN account_account a ON aml.account_id = a.id
      JOIN account_move m ON aml.move_id = m.id
      WHERE aml.date >= $1::date 
        AND aml.date <= $2::date
        AND m.state = 'posted'
        AND a.account_type IN ('income', 'expense')`,
      [dateFrom, dateTo]
    );

    // Investing activities (asset purchases/sales)
    const investingResult = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN aml.debit > 0 THEN aml.debit ELSE 0 END), 0) as cash_out,
        COALESCE(SUM(CASE WHEN aml.credit > 0 THEN aml.credit ELSE 0 END), 0) as cash_in
      FROM account_move_line aml
      JOIN account_account a ON aml.account_id = a.id
      JOIN account_move m ON aml.move_id = m.id
      WHERE aml.date >= $1::date 
        AND aml.date <= $2::date
        AND m.state = 'posted'
        AND a.account_type LIKE 'asset_fixed%'`,
      [dateFrom, dateTo]
    );

    // Financing activities (liabilities, equity)
    const financingResult = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN aml.debit > 0 THEN aml.debit ELSE 0 END), 0) as cash_out,
        COALESCE(SUM(CASE WHEN aml.credit > 0 THEN aml.credit ELSE 0 END), 0) as cash_in
      FROM account_move_line aml
      JOIN account_account a ON aml.account_id = a.id
      JOIN account_move m ON aml.move_id = m.id
      WHERE aml.date >= $1::date 
        AND aml.date <= $2::date
        AND m.state = 'posted'
        AND (a.account_type LIKE 'liability%' OR a.account_type LIKE 'equity%')`,
      [dateFrom, dateTo]
    );

    res.json({
      date_from: dateFrom,
      date_to: dateTo,
      operating: {
        cash_in: parseFloat(operatingResult.rows[0].cash_in || 0),
        cash_out: parseFloat(operatingResult.rows[0].cash_out || 0),
        net: parseFloat(operatingResult.rows[0].cash_in || 0) - parseFloat(operatingResult.rows[0].cash_out || 0),
      },
      investing: {
        cash_in: parseFloat(investingResult.rows[0].cash_in || 0),
        cash_out: parseFloat(investingResult.rows[0].cash_out || 0),
        net: parseFloat(investingResult.rows[0].cash_in || 0) - parseFloat(investingResult.rows[0].cash_out || 0),
      },
      financing: {
        cash_in: parseFloat(financingResult.rows[0].cash_in || 0),
        cash_out: parseFloat(financingResult.rows[0].cash_out || 0),
        net: parseFloat(financingResult.rows[0].cash_in || 0) - parseFloat(financingResult.rows[0].cash_out || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

