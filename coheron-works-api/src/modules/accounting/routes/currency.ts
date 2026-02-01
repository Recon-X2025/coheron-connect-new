import { Router } from 'express';
import Currency from '../../../models/Currency.js';
import ExchangeRate from '../../../models/ExchangeRate.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import currencyService from '../../../services/currencyService.js';

const router = Router();

// --- Currencies ---
router.get('/', asyncHandler(async (req: any, res) => {
  const currencies = await Currency.find({ tenant_id: req.user.tenant_id }).sort({ code: 1 });
  res.json(currencies);
}));

router.post('/', asyncHandler(async (req: any, res) => {
  const currency = await Currency.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(currency);
}));

router.put('/:id', asyncHandler(async (req: any, res) => {
  const currency = await Currency.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!currency) return res.status(404).json({ error: 'Currency not found' });
  res.json(currency);
}));

router.delete('/:id', asyncHandler(async (req: any, res) => {
  await Currency.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  res.json({ message: 'Deleted' });
}));

// --- Exchange Rates ---
router.get('/exchange-rates', asyncHandler(async (req: any, res) => {
  const { from, to } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (from) filter.from_currency = from;
  if (to) filter.to_currency = to;
  const rates = await ExchangeRate.find(filter).sort({ effective_date: -1 }).limit(100);
  res.json(rates);
}));

router.post('/exchange-rates', asyncHandler(async (req: any, res) => {
  const rate = await ExchangeRate.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(rate);
}));

router.put('/exchange-rates/:id', asyncHandler(async (req: any, res) => {
  const rate = await ExchangeRate.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!rate) return res.status(404).json({ error: 'Exchange rate not found' });
  res.json(rate);
}));

// --- Convert endpoint ---
router.post('/convert', asyncHandler(async (req: any, res) => {
  const { amount, from_currency, to_currency, date } = req.body;
  const result = await currencyService.convert(
    req.user.tenant_id.toString(),
    amount,
    from_currency,
    to_currency,
    date ? new Date(date) : undefined
  );
  res.json(result);
}));

export default router;
