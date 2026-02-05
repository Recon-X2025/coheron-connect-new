import express from 'express';
import { NurtureSequence } from '../models/NurtureSequence.js';
import { NurtureEnrollment } from '../models/NurtureEnrollment.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET all sequences
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.status) filter.status = req.query.status;
  const sequences = await NurtureSequence.find(filter).sort({ created_at: -1 }).lean();
  res.json(sequences);
}));

// GET single
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const seq = await NurtureSequence.findById(req.params.id).lean();
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  res.json(seq);
}));

// CREATE
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const seq = await NurtureSequence.create({ ...req.body, tenant_id: tenantId, created_by: userId });
  res.status(201).json(seq);
}));

// UPDATE
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const seq = await NurtureSequence.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  res.json(seq);
}));

// DELETE
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await NurtureSequence.findByIdAndDelete(req.params.id);
  await NurtureEnrollment.deleteMany({ sequence_id: req.params.id });
  res.json({ success: true });
}));

// ACTIVATE
router.post('/:id/activate', authenticate, asyncHandler(async (req, res) => {
  const seq = await NurtureSequence.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  res.json(seq);
}));

// ENROLL leads
router.post('/:id/enroll', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const { lead_ids } = req.body;
  const enrollments = await NurtureEnrollment.insertMany(
    (lead_ids || []).map((lid: string) => ({
      tenant_id: tenantId,
      sequence_id: req.params.id,
      lead_id: lid,
      current_step: 0,
      status: 'active',
      enrolled_at: new Date(),
    }))
  );
  await NurtureSequence.findByIdAndUpdate(req.params.id, { $inc: { enrolled_count: lead_ids?.length || 0 } });
  res.status(201).json(enrollments);
}));

// GET enrollments
router.get('/:id/enrollments', authenticate, asyncHandler(async (req, res) => {
  const enrollments = await NurtureEnrollment.find({ sequence_id: req.params.id }).sort({ enrolled_at: -1 }).limit(200).lean();
  res.json(enrollments);
}));

// GET analytics (step-by-step funnel)
router.get('/:id/analytics', authenticate, asyncHandler(async (req, res) => {
  const seq = await NurtureSequence.findById(req.params.id).lean();
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  const enrollments = await NurtureEnrollment.find({ sequence_id: req.params.id }).lean();
  const total = enrollments.length;
  const funnel = (seq.steps || []).map((step: any, idx: number) => {
    const reached = enrollments.filter((e: any) => e.current_step >= idx || e.status === 'completed').length;
    return {
      step_index: idx,
      step_type: step.type,
      order: step.order,
      reached,
      percentage: total > 0 ? Math.round((reached / total) * 100) : 0,
      sent_count: step.sent_count || 0,
      open_rate: step.open_rate || 0,
      click_rate: step.click_rate || 0,
    };
  });
  res.json({ total_enrolled: total, completed: enrollments.filter((e: any) => e.status === 'completed').length, funnel });
}));

// ADVANCE enrollment
router.post('/enrollments/:enrollmentId/advance', authenticate, asyncHandler(async (req, res) => {
  const enrollment = await NurtureEnrollment.findById(req.params.enrollmentId);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  const seq = await NurtureSequence.findById(enrollment.sequence_id).lean();
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  const nextStep = enrollment.current_step + 1;
  if (nextStep >= (seq.steps || []).length) {
    enrollment.status = 'completed';
    enrollment.completed_at = new Date();
    await NurtureSequence.findByIdAndUpdate(seq._id, { $inc: { completed_count: 1 } });
  } else {
    enrollment.current_step = nextStep;
  }
  enrollment.step_history.push({ step_index: enrollment.current_step, executed_at: new Date(), result: 'advanced' });
  await enrollment.save();
  res.json(enrollment);
}));

export default router;
