import express from 'express';
import AccountAccount from '../models/AccountAccount.js';
import AccountMove from '../models/AccountMove.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// ========== TRIAL BALANCE ==========

router.get('/trial-balance', asyncHandler(async (req, res) => {
  const { date_from, date_to, account_type } = req.query;
  const dateFrom = date_from ? new Date(date_from as string) : new Date(new Date().getFullYear(), 0, 1);
  const dateTo = date_to ? new Date(date_to as string) : new Date();

  // Get all non-deprecated accounts
  const accountFilter: any = { deprecated: false };
  if (account_type) accountFilter.account_type = account_type;

  const accounts = await AccountAccount.find(accountFilter)
    .sort({ code: 1 })
    .lean();

  // Get totals from posted moves within date range
  const moveTotals = await AccountMove.aggregate([
    { $match: { state: 'posted' } },
    { $unwind: '$lines' },
    {
      $match: {
        'lines.date': { $gte: dateFrom, $lte: dateTo },
      },
    },
    {
      $group: {
        _id: '$lines.account_id',
        total_debit: { $sum: '$lines.debit' },
        total_credit: { $sum: '$lines.credit' },
      },
    },
  ]);

  const totalsMap = new Map(
    moveTotals.map((t: any) => [t._id.toString(), t])
  );

  const result = accounts
    .map((a: any) => {
      const totals = totalsMap.get(a._id.toString());
      const total_debit = totals?.total_debit || 0;
      const total_credit = totals?.total_credit || 0;
      const balance = total_debit - total_credit;

      if (total_debit === 0 && total_credit === 0) return null;

      return {
        id: a._id,
        code: a.code,
        name: a.name,
        account_type: a.account_type,
        total_debit,
        total_credit,
        balance,
      };
    })
    .filter(Boolean);

  res.json(result);
}));

// ========== BALANCE SHEET ==========

router.get('/balance-sheet', asyncHandler(async (req, res) => {
  const { date_as_of } = req.query;
  const dateAsOf = date_as_of ? new Date(date_as_of as string) : new Date();

  const aggregateByType = async (typePattern: RegExp, creditNormal: boolean) => {
    const accounts = await AccountAccount.find({
      deprecated: false,
      account_type: { $regex: typePattern },
    }).lean();

    const accountIds = accounts.map((a: any) => a._id);

    const totals = await AccountMove.aggregate([
      { $match: { state: 'posted' } },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.date': { $lte: dateAsOf },
          'lines.account_id': { $in: accountIds },
        },
      },
      {
        $lookup: {
          from: 'accountaccounts',
          localField: 'lines.account_id',
          foreignField: '_id',
          as: 'account_info',
        },
      },
      { $unwind: '$account_info' },
      {
        $group: {
          _id: '$account_info.account_type',
          balance: creditNormal
            ? { $sum: { $subtract: ['$lines.credit', '$lines.debit'] } }
            : { $sum: { $subtract: ['$lines.debit', '$lines.credit'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return totals.map((t: any) => ({
      account_type: t._id,
      balance: t.balance,
    }));
  };

  const [assets, liabilities, equity] = await Promise.all([
    aggregateByType(/^asset/, false),
    aggregateByType(/^liability/, true),
    aggregateByType(/^equity/, true),
  ]);

  res.json({
    date_as_of: dateAsOf.toISOString().split('T')[0],
    assets,
    liabilities,
    equity,
  });
}));

// ========== PROFIT & LOSS ==========

router.get('/profit-loss', asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;
  const dateFrom = date_from ? new Date(date_from as string) : new Date(new Date().getFullYear(), 0, 1);
  const dateTo = date_to ? new Date(date_to as string) : new Date();

  const aggregateByType = async (typePattern: RegExp, creditNormal: boolean) => {
    const accounts = await AccountAccount.find({
      deprecated: false,
      account_type: { $regex: typePattern },
    }).lean();

    const accountIds = accounts.map((a: any) => a._id);

    const totals = await AccountMove.aggregate([
      { $match: { state: 'posted' } },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.date': { $gte: dateFrom, $lte: dateTo },
          'lines.account_id': { $in: accountIds },
        },
      },
      {
        $lookup: {
          from: 'accountaccounts',
          localField: 'lines.account_id',
          foreignField: '_id',
          as: 'account_info',
        },
      },
      { $unwind: '$account_info' },
      {
        $group: {
          _id: '$account_info.account_type',
          balance: creditNormal
            ? { $sum: { $subtract: ['$lines.credit', '$lines.debit'] } }
            : { $sum: { $subtract: ['$lines.debit', '$lines.credit'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return totals.map((t: any) => ({
      account_type: t._id,
      balance: t.balance,
    }));
  };

  const [income, expenses] = await Promise.all([
    aggregateByType(/^income/, true),
    aggregateByType(/^expense/, false),
  ]);

  const totalIncome = income.reduce((sum, row) => sum + (row.balance || 0), 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + (row.balance || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  res.json({
    date_from: dateFrom.toISOString().split('T')[0],
    date_to: dateTo.toISOString().split('T')[0],
    income,
    expenses,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_income: netIncome,
  });
}));

// ========== CASH FLOW ==========

router.get('/cash-flow', asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;
  const dateFrom = date_from ? new Date(date_from as string) : new Date(new Date().getFullYear(), 0, 1);
  const dateTo = date_to ? new Date(date_to as string) : new Date();

  const aggregateCashFlow = async (accountTypes: string[] | RegExp) => {
    const accountFilter: any = { deprecated: false };
    if (Array.isArray(accountTypes)) {
      accountFilter.account_type = { $in: accountTypes };
    } else {
      accountFilter.account_type = { $regex: accountTypes };
    }

    const accounts = await AccountAccount.find(accountFilter).lean();
    const accountIds = accounts.map((a: any) => a._id);

    const totals = await AccountMove.aggregate([
      { $match: { state: 'posted' } },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.date': { $gte: dateFrom, $lte: dateTo },
          'lines.account_id': { $in: accountIds },
        },
      },
      {
        $group: {
          _id: null,
          cash_out: {
            $sum: { $cond: [{ $gt: ['$lines.debit', 0] }, '$lines.debit', 0] },
          },
          cash_in: {
            $sum: { $cond: [{ $gt: ['$lines.credit', 0] }, '$lines.credit', 0] },
          },
        },
      },
    ]);

    const row = totals[0] || { cash_in: 0, cash_out: 0 };
    return {
      cash_in: row.cash_in || 0,
      cash_out: row.cash_out || 0,
      net: (row.cash_in || 0) - (row.cash_out || 0),
    };
  };

  const [operating, investing, financing] = await Promise.all([
    aggregateCashFlow(['income', 'expense']),
    aggregateCashFlow(/^asset_fixed/),
    aggregateCashFlow(/^(liability|equity)/),
  ]);

  res.json({
    date_from: dateFrom.toISOString().split('T')[0],
    date_to: dateTo.toISOString().split('T')[0],
    operating,
    investing,
    financing,
  });
}));

export default router;
