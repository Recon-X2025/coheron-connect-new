import express from 'express';
import { HazmatClassification } from '../models/HazmatClassification.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET /
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const { hazard_class, packing_group, is_active, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (hazard_class) filter.hazard_class = hazard_class;
  if (packing_group) filter.packing_group = packing_group;
  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    HazmatClassification.find(filter)
      .populate('product_id', 'name sku')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    HazmatClassification.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

// POST /
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const classification = await HazmatClassification.create({
    ...req.body,
    tenant_id: req.user.tenant_id,
  });
  res.status(201).json(classification);
}));

// GET /:id
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const classification = await HazmatClassification.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('product_id', 'name sku').lean();
  if (!classification) return res.status(404).json({ error: 'Classification not found' });
  res.json(classification);
}));

// PUT /:id
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const classification = await HazmatClassification.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true }
  );
  if (!classification) return res.status(404).json({ error: 'Classification not found' });
  res.json(classification);
}));

// DELETE /:id
router.delete('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const classification = await HazmatClassification.findOneAndDelete({
    _id: req.params.id, tenant_id: req.user.tenant_id,
  });
  if (!classification) return res.status(404).json({ error: 'Classification not found' });
  res.json({ message: 'Classification deleted' });
}));

// GET /products - products with hazmat classification
router.get('/products', authenticate, asyncHandler(async (req: any, res) => {
  const classifications = await HazmatClassification.find({
    tenant_id: req.user.tenant_id,
    is_active: true,
  }).populate('product_id', 'name sku category').lean();
  res.json(classifications);
}));

// GET /compliance-report
router.get('/compliance-report', authenticate, asyncHandler(async (req: any, res) => {
  const all = await HazmatClassification.find({ tenant_id: req.user.tenant_id, is_active: true }).lean();

  const byClass: Record<string, number> = {};
  let missingContact = 0;
  let missingSds = 0;

  for (const h of all) {
    byClass[h.hazard_class] = (byClass[h.hazard_class] || 0) + 1;
    if (!h.emergency_contact) missingContact++;
    if (!h.sds_url) missingSds++;
  }

  res.json({
    total_hazmat_products: all.length,
    by_hazard_class: byClass,
    missing_emergency_contact: missingContact,
    missing_sds: missingSds,
    compliance_score: all.length > 0 ? Math.round(((all.length - missingContact - missingSds) / (all.length * 2)) * 100) : 100,
  });
}));

// GET /storage-requirements
router.get('/storage-requirements', authenticate, asyncHandler(async (req: any, res) => {
  const classifications = await HazmatClassification.find({
    tenant_id: req.user.tenant_id,
    is_active: true,
  }).populate('product_id', 'name sku').select('product_id storage_requirements hazard_class packing_group').lean();
  res.json(classifications);
}));

export default router;
