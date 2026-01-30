import express from 'express';
import MoQualityInspection from '../../../models/MoQualityInspection.js';
import MoQualityChecklist from '../../../models/MoQualityChecklist.js';
import MoNonConformance from '../../../models/MoNonConformance.js';
import MoReworkOrder from '../../../models/MoReworkOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// QUALITY INSPECTIONS - CRUD
// ============================================

// Get all quality inspections
router.get('/', asyncHandler(async (req, res) => {
  const { mo_id, workorder_id, inspection_type, state, search } = req.query;
  const filter: any = {};

  if (mo_id) filter.mo_id = mo_id;
  if (workorder_id) filter.workorder_id = workorder_id;
  if (inspection_type) filter.inspection_type = inspection_type;
  if (state) filter.state = state;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    MoQualityInspection.find(filter)
      .populate('mo_id', 'name mo_number')
      .populate('workorder_id', 'name')
      .populate('product_id', 'name')
      .populate('inspector_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, MoQualityInspection
  );

  // Post-filter for search on populated fields
  let result = paginatedResult.data.map((qi: any) => ({
    ...qi,
    mo_name: qi.mo_id?.name,
    mo_number: qi.mo_id?.mo_number,
    workorder_name: qi.workorder_id?.name,
    product_name: qi.product_id?.name,
    inspector_name: qi.inspector_id?.name,
  }));

  if (search) {
    const s = (search as string).toLowerCase();
    result = result.filter((qi: any) =>
      qi.mo_name?.toLowerCase().includes(s) || qi.mo_number?.toLowerCase().includes(s)
    );
  }

  res.json({ data: result, pagination: paginatedResult.pagination });
}));

// Get inspection by ID with checklist
router.get('/:id', asyncHandler(async (req, res) => {
  const inspection = await MoQualityInspection.findById(req.params.id)
    .populate('mo_id', 'name mo_number')
    .populate('workorder_id', 'name')
    .populate('product_id', 'name')
    .populate('inspector_id', 'name')
    .lean();

  if (!inspection) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  const checklist = await MoQualityChecklist.find({ inspection_id: req.params.id })
    .sort({ _id: 1 })
    .lean();

  res.json({
    ...inspection,
    mo_name: (inspection as any).mo_id?.name,
    mo_number: (inspection as any).mo_id?.mo_number,
    workorder_name: (inspection as any).workorder_id?.name,
    product_name: (inspection as any).product_id?.name,
    inspector_name: (inspection as any).inspector_id?.name,
    checklist,
  });
}));

// Create quality inspection
router.post('/', asyncHandler(async (req, res) => {
  const {
    mo_id, workorder_id, inspection_type, product_id, qty_to_inspect,
    inspector_id, inspection_date, notes, checklist,
  } = req.body;

  const inspection = await MoQualityInspection.create({
    mo_id, workorder_id,
    inspection_type: inspection_type || 'in_process',
    product_id, qty_to_inspect, inspector_id, inspection_date, notes,
    state: 'draft',
  });

  if (checklist && Array.isArray(checklist)) {
    for (const item of checklist) {
      await MoQualityChecklist.create({
        inspection_id: inspection._id,
        checklist_item: item.checklist_item,
        specification: item.specification,
        tolerance_min: item.tolerance_min,
        tolerance_max: item.tolerance_max,
        notes: item.notes,
      });
    }
  }

  res.status(201).json(inspection);
}));

// Update inspection
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'inspection_type', 'product_id', 'qty_to_inspect', 'qty_inspected',
    'qty_passed', 'qty_failed', 'state', 'inspector_id', 'inspection_date', 'notes',
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

  const inspection = await MoQualityInspection.findByIdAndUpdate(id, updateData, { new: true });

  if (!inspection) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  res.json(inspection);
}));

// Complete inspection
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { qty_passed, qty_failed, checklist_results } = req.body;

  if (checklist_results && Array.isArray(checklist_results)) {
    for (const item of checklist_results) {
      await MoQualityChecklist.findByIdAndUpdate(item.id, {
        actual_value: item.actual_value,
        result: item.result,
        notes: item.notes,
      });
    }
  }

  const result = await MoQualityInspection.findByIdAndUpdate(
    id,
    {
      state: 'done',
      qty_inspected: qty_passed + qty_failed,
      qty_passed,
      qty_failed,
    },
    { new: true }
  );

  if (qty_failed > 0 && result) {
    const ncrNumber = `NCR-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;

    await MoNonConformance.create({
      mo_id: result.mo_id,
      workorder_id: result.workorder_id,
      inspection_id: id,
      ncr_number: ncrNumber,
      product_id: result.product_id,
      qty_non_conforming: qty_failed,
      severity: 'major',
      state: 'open',
    });
  }

  res.json(result);
}));

// ============================================
// QUALITY CHECKLIST - CRUD
// ============================================

// Add checklist item
router.post('/:inspection_id/checklist', asyncHandler(async (req, res) => {
  const { inspection_id } = req.params;
  const { checklist_item, specification, tolerance_min, tolerance_max, notes } = req.body;

  const item = await MoQualityChecklist.create({
    inspection_id, checklist_item, specification, tolerance_min, tolerance_max, notes,
  });

  res.status(201).json(item);
}));

// Update checklist item
router.put('/checklist/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'checklist_item', 'specification', 'actual_value', 'tolerance_min',
    'tolerance_max', 'result', 'notes',
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

  const item = await MoQualityChecklist.findByIdAndUpdate(id, updateData, { new: true });

  if (!item) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  res.json(item);
}));

// ============================================
// NON-CONFORMANCE REPORTS (NCR) - CRUD
// ============================================

// Get all NCRs
router.get('/ncr', asyncHandler(async (req, res) => {
  const { mo_id, state, severity, search } = req.query;
  const filter: any = {};

  if (mo_id) filter.mo_id = mo_id;
  if (state) filter.state = state;
  if (severity) filter.severity = severity;

  if (search) {
    filter.$or = [
      { ncr_number: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    MoNonConformance.find(filter)
      .populate('mo_id', 'name mo_number')
      .populate('workorder_id', 'name')
      .populate('product_id', 'name')
      .populate('assigned_to', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, MoNonConformance
  );

  const data = paginatedResult.data.map((ncr: any) => ({
    ...ncr,
    mo_name: ncr.mo_id?.name,
    mo_number: ncr.mo_id?.mo_number,
    workorder_name: ncr.workorder_id?.name,
    product_name: ncr.product_id?.name,
    assigned_to_name: ncr.assigned_to?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get NCR by ID
router.get('/ncr/:id', asyncHandler(async (req, res) => {
  const ncr = await MoNonConformance.findById(req.params.id)
    .populate('mo_id', 'name mo_number')
    .populate('workorder_id', 'name')
    .populate('product_id', 'name')
    .populate('assigned_to', 'name')
    .lean();

  if (!ncr) {
    return res.status(404).json({ error: 'NCR not found' });
  }

  res.json({
    ...ncr,
    mo_name: (ncr as any).mo_id?.name,
    mo_number: (ncr as any).mo_id?.mo_number,
    workorder_name: (ncr as any).workorder_id?.name,
    product_name: (ncr as any).product_id?.name,
    assigned_to_name: (ncr as any).assigned_to?.name,
  });
}));

// Update NCR
router.put('/ncr/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'qty_non_conforming', 'severity', 'root_cause', 'corrective_action',
    'preventive_action', 'state', 'assigned_to', 'resolution_date',
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

  const ncr = await MoNonConformance.findByIdAndUpdate(id, updateData, { new: true });

  if (!ncr) {
    return res.status(404).json({ error: 'NCR not found' });
  }

  res.json(ncr);
}));

// ============================================
// REWORK ORDERS - CRUD
// ============================================

// Get rework orders
router.get('/rework', asyncHandler(async (req, res) => {
  const { mo_id, ncr_id, state } = req.query;
  const filter: any = {};

  if (mo_id) filter.mo_id = mo_id;
  if (ncr_id) filter.ncr_id = ncr_id;
  if (state) filter.state = state;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    MoReworkOrder.find(filter)
      .populate('mo_id', 'name mo_number')
      .populate('ncr_id', 'ncr_number')
      .populate('product_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, MoReworkOrder
  );

  const data = paginatedResult.data.map((rw: any) => ({
    ...rw,
    mo_name: rw.mo_id?.name,
    mo_number: rw.mo_id?.mo_number,
    ncr_number: rw.ncr_id?.ncr_number,
    product_name: rw.product_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create rework order from NCR
router.post('/ncr/:ncr_id/rework', asyncHandler(async (req, res) => {
  const { ncr_id } = req.params;
  const { qty_to_rework, workorder_id, date_planned_start, date_planned_finished, notes } = req.body;

  const ncr = await MoNonConformance.findById(ncr_id);

  if (!ncr) {
    return res.status(404).json({ error: 'NCR not found' });
  }

  const reworkName = `RWORK-${new Date().getFullYear()}-${String(ncr_id).padStart(6, '0')}`;

  const rework = await MoReworkOrder.create({
    mo_id: ncr.mo_id,
    ncr_id,
    name: reworkName,
    product_id: ncr.product_id,
    qty_to_rework: qty_to_rework || ncr.qty_non_conforming,
    workorder_id,
    state: 'draft',
    date_planned_start,
    date_planned_finished,
    notes,
  });

  res.status(201).json(rework);
}));

export default router;
