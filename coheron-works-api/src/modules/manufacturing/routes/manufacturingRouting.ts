import express from 'express';
import Routing from '../../../models/Routing.js';
import RoutingOperation from '../../../models/RoutingOperation.js';
import Workcenter from '../../../models/Workcenter.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// ROUTING - CRUD
// ============================================

// Get all routings
router.get('/', asyncHandler(async (req, res) => {
  const { active, search } = req.query;
  const filter: any = {};

  if (active !== undefined) filter.active = active === 'true';

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Routing.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, Routing
  );

  res.json(paginatedResult);
}));

// Get routing by ID with operations
router.get('/:id', asyncHandler(async (req, res) => {
  const routing = await Routing.findById(req.params.id).lean();

  if (!routing) {
    return res.status(404).json({ error: 'Routing not found' });
  }

  const operations = await RoutingOperation.find({ routing_id: req.params.id })
    .populate('workcenter_id', 'name code')
    .sort({ sequence: 1 })
    .lean();

  const ops = operations.map((ro: any) => ({
    ...ro,
    workcenter_name: ro.workcenter_id?.name,
    workcenter_code: ro.workcenter_id?.code,
  }));

  res.json({ ...routing, operations: ops });
}));

// Create routing
router.post('/', asyncHandler(async (req, res) => {
  const { name, code, active, company_id, location_id, note, operations } = req.body;

  const routing = await Routing.create({
    name, code,
    active: active !== false,
    company_id, location_id, note,
  });

  if (operations && Array.isArray(operations)) {
    for (const op of operations) {
      await RoutingOperation.create({
        routing_id: routing._id,
        name: op.name,
        sequence: op.sequence,
        workcenter_id: op.workcenter_id,
        time_mode: op.time_mode || 'auto',
        time_cycle_manual: op.time_cycle_manual,
        time_cycle: op.time_cycle,
        time_mode_batch: op.time_mode_batch || 1,
        batch_size: op.batch_size || 1,
        time_start: op.time_start || 0,
        time_stop: op.time_stop || 0,
        worksheet_type: op.worksheet_type,
        note: op.note,
      });
    }
  }

  res.status(201).json(routing);
}));

// Update routing
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = ['name', 'code', 'active', 'company_id', 'location_id', 'note'];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const routing = await Routing.findByIdAndUpdate(id, updateData, { new: true });

  if (!routing) {
    return res.status(404).json({ error: 'Routing not found' });
  }

  res.json(routing);
}));

// Delete routing
router.delete('/:id', asyncHandler(async (req, res) => {
  const routing = await Routing.findByIdAndDelete(req.params.id);
  if (!routing) {
    return res.status(404).json({ error: 'Routing not found' });
  }
  await RoutingOperation.deleteMany({ routing_id: req.params.id });
  res.json({ message: 'Routing deleted successfully' });
}));

// ============================================
// ROUTING OPERATIONS - CRUD
// ============================================

// Get routing operations
router.get('/:routing_id/operations', asyncHandler(async (req, res) => {
  const operations = await RoutingOperation.find({ routing_id: req.params.routing_id })
    .populate('workcenter_id', 'name code')
    .sort({ sequence: 1 })
    .lean();

  const result = operations.map((ro: any) => ({
    ...ro,
    workcenter_name: ro.workcenter_id?.name,
    workcenter_code: ro.workcenter_id?.code,
  }));

  res.json(result);
}));

// Add routing operation
router.post('/:routing_id/operations', asyncHandler(async (req, res) => {
  const { routing_id } = req.params;
  const {
    name, sequence, workcenter_id, time_mode, time_cycle_manual, time_cycle,
    time_mode_batch, batch_size, time_start, time_stop, worksheet_type, note,
  } = req.body;

  const operation = await RoutingOperation.create({
    routing_id, name, sequence, workcenter_id,
    time_mode: time_mode || 'auto',
    time_cycle_manual, time_cycle,
    time_mode_batch: time_mode_batch || 1,
    batch_size: batch_size || 1,
    time_start: time_start || 0,
    time_stop: time_stop || 0,
    worksheet_type, note,
  });

  res.status(201).json(operation);
}));

// Update routing operation
router.put('/operations/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'name', 'sequence', 'workcenter_id', 'time_mode', 'time_cycle_manual',
    'time_cycle', 'time_mode_batch', 'batch_size', 'time_start', 'time_stop',
    'worksheet_type', 'note',
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const operation = await RoutingOperation.findByIdAndUpdate(id, updateData, { new: true });

  if (!operation) {
    return res.status(404).json({ error: 'Routing operation not found' });
  }

  res.json(operation);
}));

// Delete routing operation
router.delete('/operations/:id', asyncHandler(async (req, res) => {
  const operation = await RoutingOperation.findByIdAndDelete(req.params.id);
  if (!operation) {
    return res.status(404).json({ error: 'Routing operation not found' });
  }
  res.json({ message: 'Routing operation deleted successfully' });
}));

// ============================================
// WORK CENTERS - CRUD
// ============================================

// Get all work centers
router.get('/workcenters', asyncHandler(async (req, res) => {
  const { active, search } = req.query;
  const filter: any = {};

  if (active !== undefined) filter.active = active === 'true';

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Workcenter.find(filter).sort({ name: 1 }).lean(),
    pagination, filter, Workcenter
  );

  res.json(paginatedResult);
}));

// Get work center by ID
router.get('/workcenters/:id', asyncHandler(async (req, res) => {
  const wc = await Workcenter.findById(req.params.id).lean();
  if (!wc) {
    return res.status(404).json({ error: 'Work center not found' });
  }
  res.json(wc);
}));

// Create work center
router.post('/workcenters', asyncHandler(async (req, res) => {
  const {
    name, code, active, workcenter_type, capacity, time_efficiency,
    time_start, time_stop, costs_hour, costs_cycle, oee_target,
    location_id, resource_calendar_id, company_id, notes,
  } = req.body;

  const wc = await Workcenter.create({
    name, code,
    active: active !== false,
    workcenter_type,
    capacity: capacity || 1,
    time_efficiency: time_efficiency || 100,
    time_start: time_start || 0,
    time_stop: time_stop || 0,
    costs_hour: costs_hour || 0,
    costs_cycle: costs_cycle || 0,
    oee_target: oee_target || 90,
    location_id, resource_calendar_id, company_id, notes,
  });

  res.status(201).json(wc);
}));

// Update work center
router.put('/workcenters/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'name', 'code', 'active', 'workcenter_type', 'capacity', 'time_efficiency',
    'time_start', 'time_stop', 'costs_hour', 'costs_cycle', 'oee_target',
    'location_id', 'resource_calendar_id', 'company_id', 'notes',
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const wc = await Workcenter.findByIdAndUpdate(id, updateData, { new: true });

  if (!wc) {
    return res.status(404).json({ error: 'Work center not found' });
  }

  res.json(wc);
}));

// Delete work center
router.delete('/workcenters/:id', asyncHandler(async (req, res) => {
  const wc = await Workcenter.findByIdAndDelete(req.params.id);
  if (!wc) {
    return res.status(404).json({ error: 'Work center not found' });
  }
  res.json({ message: 'Work center deleted successfully' });
}));

export default router;
