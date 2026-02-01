import express from 'express';
import { AttributionModel } from '../models/AttributionModel.js';
import { TouchPoint } from '../models/TouchPoint.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// ATTRIBUTION MODELS
// ============================================

router.get('/models', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const models = await AttributionModel.find({ tenant_id }).sort({ created_at: -1 }).lean();
  res.json(models);
}));

router.get('/models/:id', asyncHandler(async (req, res) => {
  const model = await AttributionModel.findById(req.params.id).lean();
  if (!model) return res.status(404).json({ error: 'Model not found' });
  res.json(model);
}));

router.post('/models', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (req.body.is_default) {
    await AttributionModel.updateMany({ tenant_id }, { is_default: false });
  }
  const model = await AttributionModel.create({ ...req.body, tenant_id });
  res.status(201).json(model);
}));

router.put('/models/:id', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (req.body.is_default) {
    await AttributionModel.updateMany({ tenant_id }, { is_default: false });
  }
  const model = await AttributionModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!model) return res.status(404).json({ error: 'Model not found' });
  res.json(model);
}));

router.delete('/models/:id', asyncHandler(async (req, res) => {
  const model = await AttributionModel.findByIdAndDelete(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  res.json({ message: 'Model deleted successfully' });
}));

// ============================================
// TOUCHPOINTS
// ============================================

router.get('/touchpoints', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.contact_id) filter.contact_id = req.query.contact_id;
  if (req.query.campaign) filter.campaign = req.query.campaign;
  if (req.query.channel) filter.channel = req.query.channel;
  if (req.query.event_type) filter.event_type = req.query.event_type;
  if (req.query.from || req.query.to) {
    filter.timestamp = {};
    if (req.query.from) filter.timestamp.$gte = new Date(req.query.from as string);
    if (req.query.to) filter.timestamp.$lte = new Date(req.query.to as string);
  }
  const touchpoints = await TouchPoint.find(filter).populate('contact_id', 'name email').sort({ timestamp: -1 }).limit(parseInt(req.query.limit as string) || 500).lean();
  res.json(touchpoints);
}));

// Channel performance
router.get('/channel-performance', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const matchFilter: any = { tenant_id };
  if (req.query.from || req.query.to) {
    matchFilter.timestamp = {};
    if (req.query.from) matchFilter.timestamp.$gte = new Date(req.query.from as string);
    if (req.query.to) matchFilter.timestamp.$lte = new Date(req.query.to as string);
  }
  const results = await TouchPoint.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$channel', touchpoints: { $sum: 1 }, total_revenue: { $sum: '$attributed_revenue.amount' }, unique_contacts: { $addToSet: '$contact_id' } } },
    { $project: { channel: '$_id', touchpoints: 1, total_revenue: 1, unique_contacts: { $size: '$unique_contacts' }, _id: 0 } },
    { $sort: { total_revenue: -1 } },
  ]);
  res.json(results);
}));

// Campaign ROI
router.get('/campaign-roi', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const results = await TouchPoint.aggregate([
    { $match: { tenant_id, campaign: { $ne: '' } } },
    { $group: { _id: '$campaign', touchpoints: { $sum: 1 }, total_revenue: { $sum: '$attributed_revenue.amount' }, unique_contacts: { $addToSet: '$contact_id' } } },
    { $project: { campaign: '$_id', touchpoints: 1, total_revenue: 1, unique_contacts: { $size: '$unique_contacts' }, _id: 0 } },
    { $sort: { total_revenue: -1 } },
  ]);
  res.json(results);
}));

// Calculate attribution
router.post('/calculate', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { model_id } = req.body;
  const model = await AttributionModel.findById(model_id).lean();
  if (!model) return res.status(404).json({ error: 'Attribution model not found' });

  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - (model.config?.lookback_window_days || 30));

  const touchpoints = await TouchPoint.find({ tenant_id, timestamp: { $gte: lookbackDate } }).sort({ contact_id: 1, timestamp: 1 });

  // Group by contact
  const grouped: Record<string, typeof touchpoints> = {};
  for (const tp of touchpoints) {
    const key = tp.contact_id.toString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tp);
  }

  let updated = 0;
  for (const [, tps] of Object.entries(grouped)) {
    const count = tps.length;
    if (count === 0) continue;
    for (let i = 0; i < count; i++) {
      let weight = 0;
      switch (model.type) {
        case 'first_touch': weight = i === 0 ? 1 : 0; break;
        case 'last_touch': weight = i === count - 1 ? 1 : 0; break;
        case 'linear': weight = 1 / count; break;
        case 'u_shaped': weight = (i === 0 || i === count - 1) ? 0.4 : 0.2 / Math.max(count - 2, 1); break;
        default: weight = 1 / count;
      }
      tps[i].attributed_revenue = { model_id: model._id, amount: tps[i].event_value * weight };
      await tps[i].save();
      updated++;
    }
  }

  res.json({ message: 'Attribution calculated', model: model.name, touchpoints_updated: updated, contacts_processed: Object.keys(grouped).length });
}));

export default router;
