import express from 'express';
import mongoose from 'mongoose';
import AccountMove from '../../../models/AccountMove.js';
import AccountJournal from '../../../models/AccountJournal.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { validate } from '../../../shared/middleware/validate.js';
import { authenticate, checkRecordAccess } from '../../../shared/middleware/permissions.js';
import { objectIdParam } from '../../../shared/schemas/common.js';
import { createJournalEntrySchema, updateJournalEntrySchema } from '../schemas.js';

const router = express.Router();

// Get all journal entries
router.get('/', asyncHandler(async (req, res) => {
  const { journal_id, state, date_from, date_to, partner_id, search } = req.query;
  const filter: any = {};

  if (journal_id) filter.journal_id = journal_id;
  if (state) filter.state = state;
  if (partner_id) filter.partner_id = partner_id;

  if (date_from || date_to) {
    filter.date = {};
    if (date_from) filter.date.$gte = new Date(date_from as string);
    if (date_to) filter.date.$lte = new Date(date_to as string);
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { ref: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    AccountMove.find(filter)
      .populate('journal_id', 'name code')
      .populate('partner_id', 'name')
      .sort({ date: -1, created_at: -1 })
      .lean(),
    pagination,
    filter,
    AccountMove
  );

  const data = paginatedResult.data.map((m: any) => ({
    ...m,
    id: m._id,
    journal_name: m.journal_id?.name || null,
    journal_code: m.journal_id?.code || null,
    partner_name: m.partner_id?.name || null,
    journal_id: m.journal_id?._id || m.journal_id,
    partner_id: m.partner_id?._id || m.partner_id,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get journal entry by ID with lines
router.get('/:id', authenticate, checkRecordAccess('journal_entries'), asyncHandler(async (req, res) => {
  const move = await AccountMove.findOne({ _id: req.params.id, ...req.recordFilter })
    .populate('journal_id', 'name code')
    .populate('partner_id', 'name')
    .populate('lines.account_id', 'code name')
    .populate('lines.partner_id', 'name')
    .lean();

  if (!move) {
    return res.status(404).json({ error: 'Journal entry not found' });
  }

  const result: any = {
    ...move,
    id: move._id,
    journal_name: (move.journal_id as any)?.name || null,
    journal_code: (move.journal_id as any)?.code || null,
    partner_name: (move.partner_id as any)?.name || null,
    journal_id: (move.journal_id as any)?._id || move.journal_id,
    partner_id: (move.partner_id as any)?._id || move.partner_id,
    lines: (move.lines || []).map((l: any) => ({
      ...l,
      id: l._id,
      account_code: l.account_id?.code || null,
      account_name: l.account_id?.name || null,
      partner_name: l.partner_id?.name || null,
      account_id: l.account_id?._id || l.account_id,
      partner_id: l.partner_id?._id || l.partner_id,
    })),
  };

  res.json(result);
}));

// Create journal entry
router.post('/', validate({ body: createJournalEntrySchema }), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      journal_id,
      date,
      ref,
      move_type,
      partner_id,
      currency_id,
      lines,
    } = req.body;

    // Generate journal entry number
    const journal = await AccountJournal.findById(journal_id).session(session);
    if (!journal) {
      throw new Error('Journal not found');
    }

    const journalCode = journal.code;
    const dateStr = new Date(date).toISOString().slice(0, 10).replace(/-/g, '');
    const name = `${journalCode}/${dateStr}/${Date.now().toString().slice(-6)}`;

    // Calculate total
    let amountTotal = 0;
    const moveLines: any[] = [];
    if (lines && lines.length > 0) {
      for (const line of lines) {
        const debit = parseFloat(line.debit || 0);
        const credit = parseFloat(line.credit || 0);
        amountTotal += debit - credit;
        moveLines.push({
          account_id: line.account_id,
          partner_id: line.partner_id || null,
          name: line.name || '',
          debit,
          credit,
          balance: debit - credit,
          date: line.date || date,
          date_maturity: line.date_maturity || null,
          cost_center_id: line.cost_center_id || null,
          project_id: line.project_id || null,
          product_id: line.product_id || null,
          tax_ids: line.tax_ids || null,
        });
      }
    }

    const [move] = await AccountMove.create([{
      name,
      journal_id,
      date,
      ref: ref || null,
      move_type: move_type || 'entry',
      partner_id: partner_id || null,
      amount_total: amountTotal,
      currency_id: currency_id || null,
      state: 'draft',
      lines: moveLines,
    }], { session });

    await session.commitTransaction();

    // Fetch complete entry with populated refs
    const complete = await AccountMove.findById(move._id)
      .populate('journal_id', 'name code')
      .populate('lines.account_id', 'code name')
      .lean();

    const result: any = {
      ...complete,
      id: complete!._id,
      journal_name: (complete!.journal_id as any)?.name || null,
      journal_code: (complete!.journal_id as any)?.code || null,
      journal_id: (complete!.journal_id as any)?._id || complete!.journal_id,
      lines: (complete!.lines || []).map((l: any) => ({
        ...l,
        id: l._id,
        account_code: l.account_id?.code || null,
        account_name: l.account_id?.name || null,
        account_id: l.account_id?._id || l.account_id,
      })),
    };

    res.status(201).json(result);
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// Update journal entry
router.put('/:id', validate({ params: objectIdParam, body: updateJournalEntrySchema }), authenticate, checkRecordAccess('journal_entries'), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { date, ref, partner_id, lines } = req.body;
    const moveId = req.params.id;

    const move = await AccountMove.findOne({ _id: moveId, ...req.recordFilter }).session(session);

    if (!move) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    if (move.state === 'posted') {
      return res.status(400).json({ error: 'Cannot modify posted entry' });
    }

    // Update fields
    if (date !== undefined) move.date = date;
    if (ref !== undefined) move.ref = ref;
    if (partner_id !== undefined) move.partner_id = partner_id;

    // Update lines if provided
    if (lines !== undefined) {
      move.lines = lines.map((line: any) => ({
        account_id: line.account_id,
        partner_id: line.partner_id || null,
        name: line.name || '',
        debit: line.debit || 0,
        credit: line.credit || 0,
        balance: parseFloat(line.debit || 0) - parseFloat(line.credit || 0),
        date: line.date || date || move.date,
        date_maturity: line.date_maturity || null,
        cost_center_id: line.cost_center_id || null,
        project_id: line.project_id || null,
        product_id: line.product_id || null,
        tax_ids: line.tax_ids || null,
      }));
    }

    await move.save({ session });
    await session.commitTransaction();

    // Fetch updated entry with populated refs
    const updated = await AccountMove.findById(moveId)
      .populate('journal_id', 'name code')
      .populate('lines.account_id', 'code name')
      .lean();

    const result: any = {
      ...updated,
      id: updated!._id,
      journal_name: (updated!.journal_id as any)?.name || null,
      journal_code: (updated!.journal_id as any)?.code || null,
      journal_id: (updated!.journal_id as any)?._id || updated!.journal_id,
      lines: (updated!.lines || []).map((l: any) => ({
        ...l,
        id: l._id,
        account_code: l.account_id?.code || null,
        account_name: l.account_id?.name || null,
        account_id: l.account_id?._id || l.account_id,
      })),
    };

    res.json(result);
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// Post journal entry
router.post('/:id/post', validate({ params: objectIdParam }), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const moveId = req.params.id;

    const move = await AccountMove.findById(moveId).session(session);

    if (!move) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    if (move.state !== 'draft') {
      return res.status(400).json({ error: 'Entry is not in draft state' });
    }

    // Verify lines balance (debits = credits)
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of move.lines) {
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: 'Entry is not balanced',
        details: { total_debit: totalDebit, total_credit: totalCredit },
      });
    }

    move.state = 'posted';
    move.posted_at = new Date();
    move.posted_by = req.body.user_id || null;

    await move.save({ session });
    await session.commitTransaction();

    res.json(move);
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// Cancel journal entry
router.post('/:id/cancel', validate({ params: objectIdParam }), asyncHandler(async (req, res) => {
  const move = await AccountMove.findOneAndUpdate(
    { _id: req.params.id, state: 'posted' },
    { state: 'cancel' },
    { new: true }
  );

  if (!move) {
    return res.status(404).json({ error: 'Journal entry not found or cannot be cancelled' });
  }

  res.json(move);
}));

// Delete journal entry
router.delete('/:id', authenticate, checkRecordAccess('journal_entries'), asyncHandler(async (req, res) => {
  const move = await AccountMove.findOne({ _id: req.params.id, ...req.recordFilter });

  if (!move) {
    return res.status(404).json({ error: 'Journal entry not found' });
  }

  if (move.state === 'posted') {
    return res.status(400).json({ error: 'Cannot delete posted entry' });
  }

  await AccountMove.findOneAndDelete({ _id: req.params.id, ...req.recordFilter });

  res.json({ message: 'Journal entry deleted successfully' });
}));

export default router;
