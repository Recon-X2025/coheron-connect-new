import express from 'express';
import mongoose from 'mongoose';
import BankAccount from '../../../models/BankAccount.js';
import BankStatement from '../../../models/BankStatement.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ========== BANK ACCOUNTS ==========

// Get all bank accounts
router.get('/accounts', asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  const filter: any = {};

  if (is_active !== undefined) {
    filter.is_active = is_active === 'true';
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    BankAccount.find(filter)
      .populate('journal_id', 'name')
      .populate('account_id', 'code name')
      .sort({ name: 1 })
      .lean(),
    pagination, filter, BankAccount
  );

  const data = paginatedResult.data.map((b: any) => ({
    ...b,
    id: b._id,
    journal_name: b.journal_id?.name || null,
    account_code: b.account_id?.code || null,
    account_name: b.account_id?.name || null,
    journal_id: b.journal_id?._id || b.journal_id,
    account_id: b.account_id?._id || b.account_id,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create bank account
router.post('/accounts', asyncHandler(async (req, res) => {
  const {
    name,
    bank_name,
    account_number,
    routing_number,
    iban,
    swift_code,
    account_type,
    currency_id,
    journal_id,
    account_id,
    balance_start,
  } = req.body;

  const bankAccount = await BankAccount.create({
    name,
    bank_name: bank_name || null,
    account_number: account_number || null,
    routing_number: routing_number || null,
    iban: iban || null,
    swift_code: swift_code || null,
    account_type: account_type || 'checking',
    currency_id: currency_id || null,
    journal_id: journal_id || null,
    account_id: account_id || null,
    balance_start: balance_start || 0,
    balance_end: balance_start || 0,
  });

  res.status(201).json(bankAccount);
}));

// ========== BANK STATEMENTS ==========

// Get all bank statements
router.get('/statements', asyncHandler(async (req, res) => {
  const { bank_account_id, state, date_from, date_to } = req.query;
  const filter: any = {};

  if (bank_account_id) filter.bank_account_id = bank_account_id;
  if (state) filter.state = state;

  if (date_from || date_to) {
    if (date_from) {
      filter.date_start = { ...filter.date_start, $gte: new Date(date_from as string) };
    }
    if (date_to) {
      filter.date_end = { ...filter.date_end, $lte: new Date(date_to as string) };
    }
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    BankStatement.find(filter)
      .populate('bank_account_id', 'name account_number')
      .sort({ date_start: -1 })
      .lean(),
    pagination, filter, BankStatement
  );

  const data = paginatedResult.data.map((s: any) => ({
    ...s,
    id: s._id,
    bank_account_name: s.bank_account_id?.name || null,
    account_number: s.bank_account_id?.account_number || null,
    bank_account_id: s.bank_account_id?._id || s.bank_account_id,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get statement by ID with lines
router.get('/statements/:id', asyncHandler(async (req, res) => {
  const statement = await BankStatement.findById(req.params.id)
    .populate('bank_account_id', 'name')
    .populate('lines.partner_id', 'name')
    .populate('lines.move_id', 'name')
    .lean();

  if (!statement) {
    return res.status(404).json({ error: 'Bank statement not found' });
  }

  const result: any = {
    ...statement,
    id: statement._id,
    bank_account_name: (statement.bank_account_id as any)?.name || null,
    bank_account_id: (statement.bank_account_id as any)?._id || statement.bank_account_id,
    lines: (statement.lines || []).map((l: any) => ({
      ...l,
      id: l._id,
      partner_name: l.partner_id?.name || null,
      move_name: l.move_id?.name || null,
      partner_id: l.partner_id?._id || l.partner_id,
      move_id: l.move_id?._id || l.move_id,
    })),
  };

  res.json(result);
}));

// Create bank statement
router.post('/statements', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      name,
      bank_account_id,
      date_start,
      date_end,
      balance_start,
      lines,
      imported_file_path,
    } = req.body;

    // Calculate balance_end from lines
    let balanceEnd = balance_start;
    const statementLines: any[] = [];
    if (lines && lines.length > 0) {
      for (const line of lines) {
        balanceEnd += parseFloat(line.amount || 0);
        statementLines.push({
          date: line.date || date_start,
          name: line.name || '',
          amount: line.amount || 0,
          partner_id: line.partner_id || null,
          ref: line.ref || null,
          note: line.note || null,
        });
      }
    }

    const [statement] = await BankStatement.create([{
      name,
      bank_account_id,
      date_start,
      date_end,
      balance_start,
      balance_end: balanceEnd,
      imported_file_path: imported_file_path || null,
      state: 'draft',
      lines: statementLines,
    }], { session });

    await session.commitTransaction();

    res.status(201).json(statement);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error creating bank statement:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    session.endSession();
  }
});

// Reconcile statement line
router.post('/statements/:statementId/lines/:lineId/reconcile', asyncHandler(async (req, res) => {
  const { move_id, payment_id, receipt_id } = req.body;

  const statement = await BankStatement.findOneAndUpdate(
    {
      _id: req.params.statementId,
      'lines._id': req.params.lineId,
    },
    {
      $set: {
        'lines.$.reconciled': true,
        'lines.$.move_id': move_id || null,
        'lines.$.payment_id': payment_id || null,
        'lines.$.receipt_id': receipt_id || null,
      },
    },
    { new: true }
  );

  if (!statement) {
    return res.status(404).json({ error: 'Statement line not found' });
  }

  const line = statement.lines.find(
    (l: any) => l._id?.toString() === req.params.lineId
  );

  res.json(line);
}));

// Confirm statement (finalize reconciliation)
router.post('/statements/:id/confirm', asyncHandler(async (req, res) => {
  const statement = await BankStatement.findOneAndUpdate(
    { _id: req.params.id, state: 'open' },
    {
      state: 'confirm',
      $expr: { balance_end_real: '$balance_end' },
    },
    { new: true }
  );

  if (!statement) {
    // Try a two-step approach since $expr in update doesn't work cleanly
    const doc = await BankStatement.findOne({ _id: req.params.id, state: 'open' });
    if (!doc) {
      return res.status(404).json({ error: 'Statement not found or cannot be confirmed' });
    }
    doc.state = 'confirm';
    doc.balance_end_real = doc.balance_end;
    await doc.save();
    return res.json(doc);
  }

  res.json(statement);
}));

export default router;
