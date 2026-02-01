import express from 'express';
import AccountAccount from '../../../models/AccountAccount.js';
import AccountMove from '../../../models/AccountMove.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { validate } from '../../../shared/middleware/validate.js';
import { objectIdParam } from '../../../shared/schemas/common.js';
import { createAccountSchema, updateAccountSchema } from '../schemas.js';

const router = express.Router();

// Get all accounts (Chart of Accounts)
router.get('/', asyncHandler(async (req, res) => {
  const { account_type, parent_id, search, deprecated } = req.query;
  const filter: any = {};

  if (account_type) {
    filter.account_type = account_type;
  }

  if (parent_id !== undefined) {
    if (parent_id === null || parent_id === 'null') {
      filter.parent_id = null;
    } else {
      filter.parent_id = parent_id;
    }
  }

  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  if (deprecated !== undefined) {
    filter.deprecated = deprecated === 'true';
  }

  const accounts = await AccountAccount.find(filter).sort({ code: 1 }).lean();

  // Add child_count for each account
  const accountsWithChildCount = await Promise.all(
    accounts.map(async (account: any) => {
      const child_count = await AccountAccount.countDocuments({ parent_id: account._id });
      return { ...account, id: account._id, child_count };
    })
  );

  res.json(accountsWithChildCount);
}));

// Get account by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const account = await AccountAccount.findById(req.params.id).lean();

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json(account);
}));

// Create account
router.post('/', validate({ body: createAccountSchema }), asyncHandler(async (req, res) => {
  const {
    code,
    name,
    account_type,
    parent_id,
    internal_type,
    reconcile,
    currency_id,
    tag_ids,
    notes,
  } = req.body;

  // Calculate level based on parent
  let level = 0;
  if (parent_id) {
    const parent = await AccountAccount.findById(parent_id);
    if (parent) {
      level = parent.level + 1;
    }
  }

  const account = await AccountAccount.create({
    code,
    name,
    account_type,
    parent_id: parent_id || null,
    level,
    internal_type: internal_type || null,
    reconcile: reconcile || false,
    currency_id: currency_id || null,
    tag_ids: tag_ids || null,
    notes: notes || null,
  });

  res.status(201).json(account);
}));

// Update account
router.put('/:id', validate({ params: objectIdParam, body: updateAccountSchema }), asyncHandler(async (req, res) => {
  const {
    name,
    account_type,
    parent_id,
    internal_type,
    reconcile,
    deprecated,
    currency_id,
    tag_ids,
    notes,
  } = req.body;

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (account_type !== undefined) updateData.account_type = account_type;
  if (parent_id !== undefined) updateData.parent_id = parent_id || null;
  if (internal_type !== undefined) updateData.internal_type = internal_type;
  if (reconcile !== undefined) updateData.reconcile = reconcile;
  if (deprecated !== undefined) updateData.deprecated = deprecated;
  if (currency_id !== undefined) updateData.currency_id = currency_id;
  if (tag_ids !== undefined) updateData.tag_ids = tag_ids;
  if (notes !== undefined) updateData.notes = notes;

  // Recalculate level if parent changed
  if (parent_id !== undefined) {
    if (parent_id) {
      const parent = await AccountAccount.findById(parent_id);
      if (parent) {
        updateData.level = parent.level + 1;
      }
    } else {
      updateData.level = 0;
    }
  }

  const account = await AccountAccount.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json(account);
}));

// Delete account (soft delete by setting deprecated)
router.delete('/:id', asyncHandler(async (req, res) => {
  const account = await AccountAccount.findByIdAndUpdate(
    req.params.id,
    { deprecated: true },
    { new: true }
  );

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json({ message: 'Account deprecated successfully' });
}));

// Get account balance
router.get('/:id/balance', asyncHandler(async (req, res) => {
  const { date_start, date_end } = req.query;
  const accountId = req.params.id;

  const matchStage: any = { 'lines.account_id': accountId };

  if (date_start || date_end) {
    matchStage['lines.date'] = {};
    if (date_start) matchStage['lines.date'].$gte = new Date(date_start as string);
    if (date_end) matchStage['lines.date'].$lte = new Date(date_end as string);
  }

  const result = await AccountMove.aggregate([
    { $unwind: '$lines' },
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total_debit: { $sum: '$lines.debit' },
        total_credit: { $sum: '$lines.credit' },
      },
    },
    {
      $project: {
        _id: 0,
        total_debit: { $ifNull: ['$total_debit', 0] },
        total_credit: { $ifNull: ['$total_credit', 0] },
        balance: { $subtract: [{ $ifNull: ['$total_debit', 0] }, { $ifNull: ['$total_credit', 0] }] },
      },
    },
  ]);

  res.json(result[0] || { total_debit: 0, total_credit: 0, balance: 0 });
}));

export default router;
