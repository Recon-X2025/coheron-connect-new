import express from 'express';
import { EmployeeLifecycleEvent } from '../../../models/EmployeeLifecycleEvent.js';
import { OnboardingTemplate } from '../../../models/OnboardingTemplate.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET /events
router.get('/events', asyncHandler(async (req: any, res) => {
  const filter: any = { tenant_id: req.user.tenant_id };
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  if (req.query.event_type) filter.event_type = req.query.event_type;
  const events = await EmployeeLifecycleEvent.find(filter).sort({ event_date: -1 }).lean();
  res.json(events);
}));

// POST /events
router.post('/events', asyncHandler(async (req: any, res) => {
  const event = await EmployeeLifecycleEvent.create({ ...req.body, tenant_id: req.user.tenant_id, created_by: req.user._id });
  res.status(201).json(event);
}));

// GET /events/:id
router.get('/events/:id', asyncHandler(async (req: any, res) => {
  const event = await EmployeeLifecycleEvent.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).lean();
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
}));

// PUT /events/:id
router.put('/events/:id', asyncHandler(async (req: any, res) => {
  const event = await EmployeeLifecycleEvent.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body, { new: true }
  );
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
}));

// POST /events/:id/approve
router.post('/events/:id/approve', asyncHandler(async (req: any, res) => {
  const event = await EmployeeLifecycleEvent.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id, status: 'pending' },
    { status: 'approved', approved_by: req.user._id, approved_at: new Date() },
    { new: true }
  );
  if (!event) return res.status(404).json({ error: 'Event not found or not pending' });
  res.json(event);
}));

// POST /events/:id/complete
router.post('/events/:id/complete', asyncHandler(async (req: any, res) => {
  const event = await EmployeeLifecycleEvent.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    { status: 'completed' },
    { new: true }
  );
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
}));

// GET /onboarding-templates
router.get('/onboarding-templates', asyncHandler(async (req: any, res) => {
  const templates = await OnboardingTemplate.find({ tenant_id: req.user.tenant_id }).lean();
  res.json(templates);
}));

// POST /onboarding-templates
router.post('/onboarding-templates', asyncHandler(async (req: any, res) => {
  const template = await OnboardingTemplate.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(template);
}));

// POST /onboard/:employeeId
router.post('/onboard/:employeeId', asyncHandler(async (req: any, res) => {
  const { template_id } = req.body;
  const template = template_id ? await OnboardingTemplate.findById(template_id).lean() : null;
  const checklist = template ? (template as any).checklist.map((c: any) => ({ item: c.item, completed: false })) : [];
  const event = await EmployeeLifecycleEvent.create({
    tenant_id: req.user.tenant_id,
    employee_id: req.params.employeeId,
    event_type: 'onboarding',
    event_date: new Date(),
    effective_date: req.body.joining_date || new Date(),
    checklist,
    status: 'pending',
    created_by: req.user._id,
  });
  res.status(201).json(event);
}));

// POST /offboard/:employeeId
router.post('/offboard/:employeeId', asyncHandler(async (req: any, res) => {
  const checklist = [
    { item: 'Collect company assets', completed: false },
    { item: 'Revoke system access', completed: false },
    { item: 'Knowledge transfer', completed: false },
    { item: 'Exit interview', completed: false },
    { item: 'Final settlement processing', completed: false },
  ];
  const event = await EmployeeLifecycleEvent.create({
    tenant_id: req.user.tenant_id,
    employee_id: req.params.employeeId,
    event_type: req.body.event_type || 'resignation',
    event_date: new Date(),
    effective_date: req.body.last_working_date,
    checklist,
    status: 'pending',
    created_by: req.user._id,
    notes: req.body.notes,
  });
  res.status(201).json(event);
}));

export default router;
