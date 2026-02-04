import express from 'express';
import { PickWave } from '../models/PickWave.js';
import { PickList } from '../models/PickList.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET / - list waves with pagination, filter by status/warehouse
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const { status, warehouse_id, pick_type, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (pick_type) filter.pick_type = pick_type;

  const skip = (Number(page) - 1) * Number(limit);
  const [waves, total] = await Promise.all([
    PickWave.find(filter)
      .populate('warehouse_id', 'name')
      .populate('assigned_to', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    PickWave.countDocuments(filter),
  ]);

  res.json({ data: waves, total, page: Number(page), limit: Number(limit) });
}));

// POST / - create wave from selected orders
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const count = await PickWave.countDocuments({ tenant_id: req.user.tenant_id });
  const wave_number = `WV-${String(count + 1).padStart(5, '0')}`;

  const wave = await PickWave.create({
    ...req.body,
    tenant_id: req.user.tenant_id,
    wave_number,
    created_by: req.user._id,
  });
  res.status(201).json(wave);
}));

// GET /:id - get wave with pick lists
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const wave = await PickWave.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('warehouse_id', 'name')
    .populate('orders')
    .populate('assigned_to', 'name email')
    .lean();
  if (!wave) return res.status(404).json({ error: 'Wave not found' });

  const pickLists = await PickList.find({ wave_id: wave._id, tenant_id: req.user.tenant_id })
    .populate('assigned_to', 'name email')
    .lean();

  res.json({ ...wave, pick_lists_detail: pickLists });
}));

// PUT /:id - update wave
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const wave = await PickWave.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true }
  );
  if (!wave) return res.status(404).json({ error: 'Wave not found' });
  res.json(wave);
}));

// POST /:id/release - release wave, generate pick lists
router.post('/:id/release', authenticate, asyncHandler(async (req: any, res) => {
  const wave = await PickWave.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!wave) return res.status(404).json({ error: 'Wave not found' });
  if (wave.status !== 'draft') return res.status(400).json({ error: 'Wave must be in draft status to release' });

  // Generate pick lists - one per assigned user, or one if no assignments
  const assignees = wave.assigned_to.length > 0 ? wave.assigned_to : [null];
  const pickListIds: any[] = [];

  for (let i = 0; i < assignees.length; i++) {
    const plCount = await PickList.countDocuments({ tenant_id: req.user.tenant_id });
    const pick_list_number = `PL-${String(plCount + 1).padStart(5, '0')}`;

    const pickList = await PickList.create({
      tenant_id: req.user.tenant_id,
      pick_list_number,
      wave_id: wave._id,
      warehouse_id: wave.warehouse_id,
      assigned_to: assignees[i] || undefined,
      status: 'pending',
      items: [],
      pick_sequence: [],
    });
    pickListIds.push(pickList._id);
  }

  wave.status = 'released';
  wave.pick_lists = pickListIds;
  await wave.save();

  res.json(wave);
}));

// POST /:id/start - start picking
router.post('/:id/start', authenticate, asyncHandler(async (req: any, res) => {
  const wave = await PickWave.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!wave) return res.status(404).json({ error: 'Wave not found' });
  if (wave.status !== 'released') return res.status(400).json({ error: 'Wave must be released to start' });

  wave.status = 'in_progress';
  wave.started_at = new Date();
  await wave.save();

  // Mark associated pick lists as in_progress
  await PickList.updateMany(
    { wave_id: wave._id, tenant_id: req.user.tenant_id },
    { status: 'in_progress', started_at: new Date() }
  );

  res.json(wave);
}));

// POST /:id/complete - complete wave
router.post('/:id/complete', authenticate, asyncHandler(async (req: any, res) => {
  const wave = await PickWave.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!wave) return res.status(404).json({ error: 'Wave not found' });
  if (wave.status !== 'in_progress') return res.status(400).json({ error: 'Wave must be in progress to complete' });

  wave.status = 'completed';
  wave.completed_at = new Date();
  await wave.save();

  res.json(wave);
}));

// GET /pick-lists - list pick lists
router.get('/pick-lists/list', authenticate, asyncHandler(async (req: any, res) => {
  const { status, wave_id, warehouse_id, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;
  if (wave_id) filter.wave_id = wave_id;
  if (warehouse_id) filter.warehouse_id = warehouse_id;

  const skip = (Number(page) - 1) * Number(limit);
  const [pickLists, total] = await Promise.all([
    PickList.find(filter)
      .populate('warehouse_id', 'name')
      .populate('wave_id', 'wave_number')
      .populate('assigned_to', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    PickList.countDocuments(filter),
  ]);

  res.json({ data: pickLists, total, page: Number(page), limit: Number(limit) });
}));

// GET /pick-lists/:id - get pick list details
router.get('/pick-lists/:id', authenticate, asyncHandler(async (req: any, res) => {
  const pickList = await PickList.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('warehouse_id', 'name')
    .populate('wave_id', 'wave_number')
    .populate('assigned_to', 'name email')
    .populate('items.product_id', 'name sku')
    .lean();
  if (!pickList) return res.status(404).json({ error: 'Pick list not found' });
  res.json(pickList);
}));

// PUT /pick-lists/:id/items/:idx - update pick item (mark picked)
router.put('/pick-lists/:id/items/:idx', authenticate, asyncHandler(async (req: any, res) => {
  const pickList = await PickList.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!pickList) return res.status(404).json({ error: 'Pick list not found' });

  const idx = Number(req.params.idx);
  if (idx < 0 || idx >= pickList.items.length) {
    return res.status(400).json({ error: 'Invalid item index' });
  }

  const item = pickList.items[idx];
  if (req.body.quantity_picked !== undefined) item.quantity_picked = req.body.quantity_picked;
  if (req.body.serial_numbers) item.serial_numbers = req.body.serial_numbers;
  if (req.body.batch_number) item.batch_number = req.body.batch_number;
  if (req.body.status) item.status = req.body.status;

  // Auto-set status based on quantity
  if (item.quantity_picked >= item.quantity_required) {
    item.status = 'picked';
  } else if (item.quantity_picked > 0 && item.quantity_picked < item.quantity_required) {
    item.status = 'short';
  }

  await pickList.save();

  // Update wave picked_items count
  if (pickList.wave_id) {
    const allPickLists = await PickList.find({ wave_id: pickList.wave_id, tenant_id: req.user.tenant_id }).lean();
    let totalPicked = 0;
    for (const pl of allPickLists) {
      totalPicked += pl.items.filter((i: any) => i.status === 'picked').length;
    }
    await PickWave.findByIdAndUpdate(pickList.wave_id, { picked_items: totalPicked });
  }

  res.json(pickList);
}));

export default router;
