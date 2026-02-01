import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { ConfigurationItem } from '../models/ConfigurationItem.js';
import { CIRelationship } from '../models/CIRelationship.js';

const router = express.Router();

// ── Configuration Items ────────────────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { status, ci_type, environment, criticality, search, page = '1', limit = '20' } = req.query;
  const filter: any = { tenant_id };
  if (status) filter.status = status;
  if (ci_type) filter.ci_type = ci_type;
  if (environment) filter.environment = environment;
  if (criticality) filter.criticality = criticality;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { serial_number: { $regex: search, $options: 'i' } },
    { ip_address: { $regex: search, $options: 'i' } },
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    ConfigurationItem.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).populate('owner_id', 'name email').lean(),
    ConfigurationItem.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}));

router.get('/by-type', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const result = await ConfigurationItem.aggregate([
    { $match: { tenant_id } },
    { $group: { _id: '$ci_type', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json(result.map(r => ({ type: r._id, count: r.count })));
}));

router.get('/warranty-expiring', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { days = '30' } = req.query;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + Number(days));
  const items = await ConfigurationItem.find({
    tenant_id,
    warranty_expiry: { $lte: threshold, $gte: new Date() },
    status: { $ne: 'retired' },
  }).sort({ warranty_expiry: 1 }).lean();
  res.json(items);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const item = await ConfigurationItem.findOne({ _id: req.params.id, tenant_id }).populate('owner_id', 'name email').lean();
  if (!item) return res.status(404).json({ error: 'CI not found' });
  res.json(item);
}));

router.post('/', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const item = await ConfigurationItem.create({ ...req.body, tenant_id });
  res.status(201).json(item);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const item = await ConfigurationItem.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: req.body },
    { new: true },
  ).lean();
  if (!item) return res.status(404).json({ error: 'CI not found' });
  res.json(item);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  await ConfigurationItem.findOneAndDelete({ _id: req.params.id, tenant_id });
  await CIRelationship.deleteMany({ tenant_id, $or: [{ source_ci_id: req.params.id }, { target_ci_id: req.params.id }] });
  res.json({ success: true });
}));

// ── Relationships ──────────────────────────────────────────────────

router.get('/relationships/all', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const rels = await CIRelationship.find({ tenant_id, is_active: true })
    .populate('source_ci_id', 'name ci_type status')
    .populate('target_ci_id', 'name ci_type status').lean();
  res.json(rels);
}));

router.post('/relationships', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const rel = await CIRelationship.create({ ...req.body, tenant_id });
  res.status(201).json(rel);
}));

router.put('/relationships/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const rel = await CIRelationship.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: req.body },
    { new: true },
  ).lean();
  if (!rel) return res.status(404).json({ error: 'Relationship not found' });
  res.json(rel);
}));

router.delete('/relationships/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  await CIRelationship.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// ── Topology & Impact Analysis ─────────────────────────────────────

router.get('/topology', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const [nodes, edges] = await Promise.all([
    ConfigurationItem.find({ tenant_id, status: { $ne: 'retired' } }).select('name ci_type status criticality environment').lean(),
    CIRelationship.find({ tenant_id, is_active: true }).select('source_ci_id target_ci_id relationship_type').lean(),
  ]);
  res.json({ nodes, edges });
}));

router.get('/impact-analysis/:ciId', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const ciId = req.params.ciId;
  const ci = await ConfigurationItem.findOne({ _id: ciId, tenant_id }).lean();
  if (!ci) return res.status(404).json({ error: 'CI not found' });

  // BFS to find all impacted CIs
  const visited = new Set<string>([ciId]);
  const queue = [ciId];
  const impacted: any[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const rels = await CIRelationship.find({
      tenant_id, is_active: true,
      $or: [{ source_ci_id: current }, { target_ci_id: current }],
    }).lean();

    for (const rel of rels) {
      const neighborId = rel.source_ci_id.toString() === current ? rel.target_ci_id.toString() : rel.source_ci_id.toString();
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
        const neighbor = await ConfigurationItem.findById(neighborId).select('name ci_type status criticality').lean();
        if (neighbor) {
          impacted.push({ ...neighbor, relationship_type: rel.relationship_type, via: current });
        }
      }
    }
  }

  res.json({ ci, impacted, total_impacted: impacted.length });
}));

export default router;
