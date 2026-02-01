import express from 'express';
import { EngineeringChangeOrder } from '../models/EngineeringChangeOrder.js';
import { ProductRevision } from '../models/ProductRevision.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// List ECOs
router.get('/eco', asyncHandler(async (req, res) => {
  const { status, priority, product_id, page = '1', limit = '20' } = req.query;
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (product_id) filter.product_id = product_id;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [data, total] = await Promise.all([
    EngineeringChangeOrder.find(filter)
      .populate('product_id', 'name sku')
      .populate('requested_by', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean(),
    EngineeringChangeOrder.countDocuments(filter),
  ]);

  res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

// Create ECO
router.post('/eco', asyncHandler(async (req, res) => {
  const count = await EngineeringChangeOrder.countDocuments({ tenant_id: req.body.tenant_id });
  const eco_number = `ECO-${String(count + 1).padStart(5, '0')}`;
  const eco = await EngineeringChangeOrder.create({ ...req.body, eco_number });
  res.status(201).json({ data: eco });
}));

// Get ECO detail
router.get('/eco/:id', asyncHandler(async (req, res) => {
  const eco = await EngineeringChangeOrder.findById(req.params.id)
    .populate('product_id', 'name sku')
    .populate('requested_by', 'name email')
    .populate('reviewers.user_id', 'name email')
    .populate('approved_by', 'name email')
    .lean();
  if (!eco) return res.status(404).json({ error: 'ECO not found' });
  res.json({ data: eco });
}));

// Update ECO
router.put('/eco/:id', asyncHandler(async (req, res) => {
  const eco = await EngineeringChangeOrder.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!eco) return res.status(404).json({ error: 'ECO not found' });
  res.json({ data: eco });
}));

// Submit ECO for review
router.post('/eco/:id/submit-review', asyncHandler(async (req, res) => {
  const eco = await EngineeringChangeOrder.findById(req.params.id);
  if (!eco) return res.status(404).json({ error: 'ECO not found' });
  if (eco.status !== 'draft') return res.status(400).json({ error: 'ECO must be in draft status to submit for review' });
  eco.status = 'review';
  if (req.body.reviewers) {
    eco.reviewers = req.body.reviewers.map((user_id: string) => ({
      user_id,
      status: 'pending',
    }));
  }
  await eco.save();
  res.json({ data: eco });
}));

// Approve ECO
router.post('/eco/:id/approve', asyncHandler(async (req, res) => {
  const eco = await EngineeringChangeOrder.findById(req.params.id);
  if (!eco) return res.status(404).json({ error: 'ECO not found' });
  if (eco.status !== 'review') return res.status(400).json({ error: 'ECO must be in review status to approve' });

  const { user_id, action, comments } = req.body;

  // Update reviewer status
  const reviewer = eco.reviewers.find((r: any) => r.user_id.toString() === user_id);
  if (reviewer) {
    reviewer.status = action === 'approve' ? 'approved' : 'rejected';
    reviewer.reviewed_at = new Date();
    reviewer.comments = comments;
  }

  // Check if all reviewers approved
  const allReviewed = eco.reviewers.every((r: any) => r.status !== 'pending');
  const allApproved = eco.reviewers.every((r: any) => r.status === 'approved');
  const anyRejected = eco.reviewers.some((r: any) => r.status === 'rejected');

  if (allReviewed) {
    if (allApproved) {
      eco.status = 'approved';
      eco.approved_by = user_id;
    } else if (anyRejected) {
      eco.status = 'rejected';
    }
  }

  await eco.save();
  res.json({ data: eco });
}));

// Implement ECO - create product revision
router.post('/eco/:id/implement', asyncHandler(async (req, res) => {
  const eco = await EngineeringChangeOrder.findById(req.params.id);
  if (!eco) return res.status(404).json({ error: 'ECO not found' });
  if (eco.status !== 'approved') return res.status(400).json({ error: 'ECO must be approved before implementation' });

  eco.status = 'in_progress';
  eco.implementation_notes = req.body.implementation_notes || '';
  await eco.save();

  // Mark previous active revision as obsolete
  await ProductRevision.updateMany(
    { tenant_id: eco.tenant_id, product_id: eco.product_id, status: 'active' },
    { status: 'obsolete', effective_to: new Date() }
  );

  // Create new revision
  const revision = await ProductRevision.create({
    tenant_id: eco.tenant_id,
    product_id: eco.product_id,
    revision: eco.new_revision,
    eco_id: eco._id,
    status: 'active',
    bom_snapshot: req.body.bom_snapshot || null,
    routing_snapshot: req.body.routing_snapshot || null,
    change_summary: eco.description,
    effective_from: eco.effective_date || new Date(),
    created_by: req.body.implemented_by,
  });

  eco.status = 'completed';
  eco.effective_date = eco.effective_date || new Date();
  await eco.save();

  res.json({ data: { eco, revision } });
}));

// List product revisions
router.get('/revisions', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.status) filter.status = req.query.status;

  const data = await ProductRevision.find(filter)
    .populate('product_id', 'name sku')
    .populate('eco_id', 'eco_number title')
    .populate('created_by', 'name email')
    .sort({ created_at: -1 })
    .lean();
  res.json({ data });
}));

// Revision history for a product
router.get('/revisions/:productId', asyncHandler(async (req, res) => {
  const data = await ProductRevision.find({ product_id: req.params.productId })
    .populate('eco_id', 'eco_number title reason')
    .populate('created_by', 'name email')
    .sort({ effective_from: -1 })
    .lean();
  res.json({ data });
}));

export default router;
