import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { CommissionPlan } from '../../../models/CommissionPlan.js';
import { CommissionEntry } from '../../../models/CommissionEntry.js';
import { Invoice } from '../../../models/Invoice.js';

const router = express.Router();

router.get('/plans', asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  const filter: any = {};
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  const params = getPaginationParams(req);
  const result = await paginateQuery(CommissionPlan.find(filter).sort({ created_at: -1 }).lean(), params, filter, CommissionPlan);
  res.json(result);
}));

router.post('/plans', asyncHandler(async (req, res) => {
  const plan = new CommissionPlan(req.body);
  await plan.save();
  res.status(201).json(plan);
}));

router.put('/plans/:id', asyncHandler(async (req, res) => {
  const plan = await CommissionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!plan) return res.status(404).json({ message: 'Commission plan not found' });
  res.json(plan);
}));

router.get('/entries', asyncHandler(async (req, res) => {
  const { sales_person_id, status, period_start, period_end } = req.query;
  const filter: any = {};
  if (sales_person_id) filter.sales_person_id = sales_person_id;
  if (status) filter.status = status;
  if (period_start) filter.period_start = { $gte: new Date(period_start as string) };
  if (period_end) filter.period_end = { $lte: new Date(period_end as string) };
  const params = getPaginationParams(req);
  const result = await paginateQuery(
    CommissionEntry.find(filter).populate('sales_person_id', 'name employee_id').populate('commission_plan_id', 'name type').sort({ created_at: -1 }).lean(),
    params, filter, CommissionEntry
  );
  res.json(result);
}));

router.post('/calculate', asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.body;
  if (!period_start || !period_end) return res.status(400).json({ message: 'period_start and period_end are required' });
  const start = new Date(period_start);
  const end = new Date(period_end);
  const invoices = await Invoice.find({ date: { $gte: start, $lte: end }, status: { $in: ['sent', 'paid'] } }).lean();
  const plans = await CommissionPlan.find({ is_active: true }).lean();
  if (!plans.length) return res.status(400).json({ message: 'No active commission plans found' });
  const entries: any[] = [];
  for (const invoice of invoices) {
    const inv = invoice as any;
    if (!inv.sales_person_id) continue;
    for (const plan of plans) {
      const p = plan as any;
      let commissionAmount = 0;
      let commissionRate = 0;
      const orderAmount = inv.total || inv.grand_total || 0;
      if (p.type === 'flat_rate') { commissionAmount = p.flat_amount || 0; }
      else if (p.type === 'percentage') { commissionRate = p.percentage || 0; commissionAmount = orderAmount * (commissionRate / 100); }
      else if (p.type === 'tiered') {
        for (const tier of (p.tiers || [])) {
          if (orderAmount >= tier.from_amount && orderAmount <= tier.to_amount) { commissionRate = tier.rate_pct; commissionAmount = orderAmount * (tier.rate_pct / 100); break; }
        }
      }
      if (commissionAmount > 0) {
        entries.push({ sales_person_id: inv.sales_person_id, commission_plan_id: p._id, sale_order_id: inv.sale_order_id, invoice_id: inv._id, order_amount: orderAmount, commission_amount: commissionAmount, commission_rate: commissionRate, status: 'pending', period_start: start, period_end: end });
      }
    }
  }
  if (entries.length > 0) await CommissionEntry.insertMany(entries);
  res.json({ message: 'Calculated ' + entries.length + ' commission entries', count: entries.length });
}));

router.post('/entries/:id/approve', asyncHandler(async (req, res) => {
  const entry = await CommissionEntry.findByIdAndUpdate(req.params.id, { status: 'approved', approved_by: (req as any).user?.id, approved_at: new Date() }, { new: true });
  if (!entry) return res.status(404).json({ message: 'Commission entry not found' });
  res.json(entry);
}));

router.post('/entries/bulk-approve', asyncHandler(async (req, res) => {
  const { entry_ids } = req.body;
  if (!entry_ids || !entry_ids.length) return res.status(400).json({ message: 'entry_ids required' });
  const result = await CommissionEntry.updateMany({ _id: { $in: entry_ids }, status: 'pending' }, { status: 'approved', approved_by: (req as any).user?.id, approved_at: new Date() });
  res.json({ message: 'Approved ' + result.modifiedCount + ' entries', modified: result.modifiedCount });
}));

router.post('/entries/:id/pay', asyncHandler(async (req, res) => {
  const { payment_reference } = req.body;
  const entry = await CommissionEntry.findByIdAndUpdate(req.params.id, { status: 'paid', paid_at: new Date(), payment_reference }, { new: true });
  if (!entry) return res.status(404).json({ message: 'Commission entry not found' });
  res.json(entry);
}));

router.get('/summary', asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.query;
  const match: any = {};
  if (period_start) match.period_start = { $gte: new Date(period_start as string) };
  if (period_end) match.period_end = { $lte: new Date(period_end as string) };
  const summary = await CommissionEntry.aggregate([
    { $match: match },
    { $group: { _id: { sales_person_id: '$sales_person_id', status: '$status' }, total_amount: { $sum: '$commission_amount' }, total_orders: { $sum: '$order_amount' }, count: { $sum: 1 } } },
    { $group: { _id: '$_id.sales_person_id', statuses: { $push: { status: '$_id.status', total_amount: '$total_amount', total_orders: '$total_orders', count: '$count' } }, grand_total: { $sum: '$total_amount' }, total_entries: { $sum: '$count' } } },
    { $sort: { grand_total: -1 } }
  ]);
  await CommissionEntry.populate(summary, { path: '_id', model: 'Employee', select: 'name employee_id' });
  res.json(summary);
}));

export default router;
