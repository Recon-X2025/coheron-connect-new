import express from 'express';
import AccountTax from '../models/AccountTax.js';
import TaxGroup from '../models/TaxGroup.js';
import TaxReturn from '../models/TaxReturn.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ========== TAX GROUPS ==========

router.get('/groups', asyncHandler(async (req, res) => {
  const groups = await TaxGroup.find({ active: true }).sort({ name: 1 }).lean();
  res.json(groups);
}));

// ========== TAXES ==========

// Get all taxes
router.get('/', asyncHandler(async (req, res) => {
  const { type_tax_use, country_id, active } = req.query;
  const filter: any = {};

  if (type_tax_use) filter.type_tax_use = type_tax_use;
  if (country_id) filter.country_id = country_id;
  if (active !== undefined) filter.active = active === 'true';

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    AccountTax.find(filter)
      .populate('tax_group_id', 'name')
      .sort({ sequence: 1, name: 1 })
      .lean(),
    pagination, filter, AccountTax
  );

  const data = paginatedResult.data.map((t: any) => ({
    ...t,
    id: t._id,
    tax_group_name: t.tax_group_id?.name || null,
    tax_group_id: t.tax_group_id?._id || t.tax_group_id,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get tax by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const tax = await AccountTax.findById(req.params.id)
    .populate('tax_group_id', 'name')
    .lean();

  if (!tax) {
    return res.status(404).json({ error: 'Tax not found' });
  }

  const result = {
    ...tax,
    id: (tax as any)._id,
    tax_group_name: (tax as any).tax_group_id?.name || null,
    tax_group_id: (tax as any).tax_group_id?._id || tax.tax_group_id,
  };

  res.json(result);
}));

// Create tax
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    code,
    type_tax_use,
    amount_type,
    amount,
    tax_group_id,
    account_id,
    refund_account_id,
    country_id,
    active,
    sequence,
    price_include,
  } = req.body;

  const tax = await AccountTax.create({
    name,
    code: code || null,
    type_tax_use,
    amount_type: amount_type || 'percent',
    amount,
    tax_group_id: tax_group_id || null,
    account_id: account_id || null,
    refund_account_id: refund_account_id || null,
    country_id: country_id || null,
    active: active !== false,
    sequence: sequence || 0,
    price_include: price_include || false,
  });

  res.status(201).json(tax);
}));

// ========== TAX RETURNS ==========

// Get all tax returns
router.get('/returns', asyncHandler(async (req, res) => {
  const { tax_type, state, period_start, period_end } = req.query;
  const filter: any = {};

  if (tax_type) filter.tax_type = tax_type;
  if (state) filter.state = state;

  if (period_start) {
    filter.period_start = { $gte: new Date(period_start as string) };
  }

  if (period_end) {
    filter.period_end = { $lte: new Date(period_end as string) };
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    TaxReturn.find(filter).sort({ period_start: -1 }).lean(),
    pagination, filter, TaxReturn
  );

  res.json(paginatedResult);
}));

// Create tax return
router.post('/returns', asyncHandler(async (req, res) => {
  const {
    name,
    tax_type,
    period_start,
    period_end,
    filing_date,
    due_date,
  } = req.body;

  const taxReturn = await TaxReturn.create({
    name,
    tax_type,
    period_start,
    period_end,
    filing_date: filing_date || null,
    due_date: due_date || null,
    state: 'draft',
  });

  res.status(201).json(taxReturn);
}));

// File tax return
router.post('/returns/:id/file', asyncHandler(async (req, res) => {
  const { export_file_path } = req.body;

  const taxReturn = await TaxReturn.findOneAndUpdate(
    { _id: req.params.id, state: 'draft' },
    {
      state: 'filed',
      export_file_path: export_file_path || null,
      filed_at: new Date(),
      filed_by: req.body.user_id || null,
    },
    { new: true }
  );

  if (!taxReturn) {
    return res.status(404).json({ error: 'Tax return not found or cannot be filed' });
  }

  res.json(taxReturn);
}));

export default router;
