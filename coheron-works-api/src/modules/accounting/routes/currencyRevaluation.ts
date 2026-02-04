import { Router } from 'express';
import CurrencyRevaluation from '../../../models/CurrencyRevaluation.js';
import ExchangeRate from '../../../models/ExchangeRate.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = Router();

// POST /run - Run revaluation
router.post('/run', authenticate, asyncHandler(async (req: any, res) => {
  const { revaluation_date, base_currency, accounts } = req.body;
  // accounts: array of { account_id, account_name, currency, original_amount, original_rate }

  const accountsRevalued: any[] = [];
  let totalGain = 0;
  let totalLoss = 0;

  for (const acct of (accounts || [])) {
    // Get latest exchange rate for this currency
    const rate = await ExchangeRate.findOne({
      tenant_id: req.user.tenant_id,
      from_currency: acct.currency,
      to_currency: base_currency,
    }).sort({ effective_date: -1 }).lean();

    const newRate = rate ? (rate as any).rate : acct.original_rate;
    const originalBaseAmount = acct.original_amount * acct.original_rate;
    const newBaseAmount = acct.original_amount * newRate;
    const gainLoss = newBaseAmount - originalBaseAmount;

    accountsRevalued.push({
      account_id: acct.account_id,
      account_name: acct.account_name,
      currency: acct.currency,
      original_amount: acct.original_amount,
      original_rate: acct.original_rate,
      new_rate: newRate,
      original_base_amount: originalBaseAmount,
      new_base_amount: newBaseAmount,
      gain_loss: gainLoss,
    });

    if (gainLoss > 0) totalGain += gainLoss;
    else totalLoss += Math.abs(gainLoss);
  }

  const revaluation = await CurrencyRevaluation.create({
    tenant_id: req.user.tenant_id,
    revaluation_date: new Date(revaluation_date),
    base_currency,
    accounts_revalued: accountsRevalued,
    total_unrealized_gain: totalGain,
    total_unrealized_loss: totalLoss,
    net_gain_loss: totalGain - totalLoss,
    status: 'draft',
    created_by: req.user._id,
  });

  res.status(201).json(revaluation);
}));

// GET / - List revaluations
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const revaluations = await CurrencyRevaluation.find({ tenant_id: req.user.tenant_id })
    .sort({ revaluation_date: -1 });
  res.json({ data: revaluations });
}));

// GET /:id - Get revaluation detail
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const reval = await CurrencyRevaluation.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!reval) return res.status(404).json({ error: 'Revaluation not found' });
  res.json({ data: reval });
}));

// POST /:id/post - Post revaluation journal entry
router.post('/:id/post', authenticate, asyncHandler(async (req: any, res) => {
  const reval = await CurrencyRevaluation.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!reval) return res.status(404).json({ error: 'Revaluation not found' });
  if ((reval as any).status === 'posted') return res.status(400).json({ error: 'Already posted' });

  // In a real implementation, create a journal entry here
  // For now, mark as posted
  (reval as any).status = 'posted';
  (reval as any).journal_entry_id = req.body.journal_entry_id || null;
  await reval.save();

  res.json({ data: reval, message: 'Revaluation posted' });
}));

export default router;
