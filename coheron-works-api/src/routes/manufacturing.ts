import express from 'express';
import ManufacturingOrder from '../models/ManufacturingOrder.js';
import WorkOrder from '../models/WorkOrder.js';
import MoMaterialConsumption from '../models/MoMaterialConsumption.js';
import MoMaterialReservation from '../models/MoMaterialReservation.js';
import MoFinishedGoods from '../models/MoFinishedGoods.js';
import MoQualityInspection from '../models/MoQualityInspection.js';
import MoCosting from '../models/MoCosting.js';
import MoSplit from '../models/MoSplit.js';
import BomLine from '../models/BomLine.js';
import RoutingOperation from '../models/RoutingOperation.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// MANUFACTURING ORDERS - CRUD & Lifecycle
// ============================================

// Get all manufacturing orders with filters
router.get('/', asyncHandler(async (req, res) => {
  const { state, mo_type, search, product_id, sale_order_id, date_from, date_to } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (mo_type) filter.mo_type = mo_type;
  if (product_id) filter.product_id = product_id;
  if (sale_order_id) filter.sale_order_id = sale_order_id;
  if (date_from) filter.date_planned_start = { ...(filter.date_planned_start || {}), $gte: new Date(date_from as string) };
  if (date_to) filter.date_planned_finished = { ...(filter.date_planned_finished || {}), $lte: new Date(date_to as string) };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mo_number: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ManufacturingOrder.find(filter)
      .populate('product_id', 'name')
      .populate('user_id', 'name')
      .populate('sale_order_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, ManufacturingOrder
  );

  const data = paginatedResult.data.map((mo: any) => ({
    ...mo,
    product_name: mo.product_id?.name,
    user_name: mo.user_id?.name,
    sale_order_name: mo.sale_order_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get manufacturing order by ID with full details
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const mo = await ManufacturingOrder.findById(id)
    .populate('product_id', 'name')
    .populate('user_id', 'name')
    .populate('sale_order_id', 'name')
    .lean();

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found' });
  }

  const [workOrders, materialConsumption, materialReservations, finishedGoods, qualityInspections, costing] = await Promise.all([
    WorkOrder.find({ mo_id: id }).sort({ sequence: 1 }).lean(),
    MoMaterialConsumption.find({ mo_id: id }).lean(),
    MoMaterialReservation.find({ mo_id: id }).lean(),
    MoFinishedGoods.find({ mo_id: id }).lean(),
    MoQualityInspection.find({ mo_id: id }).lean(),
    MoCosting.find({ mo_id: id }).lean(),
  ]);

  res.json({
    ...mo,
    product_name: (mo as any).product_id?.name,
    user_name: (mo as any).user_id?.name,
    sale_order_name: (mo as any).sale_order_id?.name,
    work_orders: workOrders,
    material_consumption: materialConsumption,
    material_reservations: materialReservations,
    finished_goods: finishedGoods,
    quality_inspections: qualityInspections,
    costing,
  });
}));

// Create manufacturing order
router.post('/', asyncHandler(async (req, res) => {
  const {
    name, product_id, product_qty, mo_type, priority, state,
    date_planned_start, date_planned_finished, user_id, bom_id, routing_id,
    sale_order_id, project_id, warehouse_id, origin,
  } = req.body;

  let mo_number = req.body.mo_number;
  if (!mo_number) {
    const count = await ManufacturingOrder.countDocuments();
    mo_number = `MO-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  const mo = await ManufacturingOrder.create({
    name, mo_number, product_id, product_qty,
    mo_type: mo_type || 'make_to_stock',
    priority: priority || 'medium',
    state: state || 'draft',
    date_planned_start, date_planned_finished, user_id, bom_id, routing_id,
    sale_order_id, project_id, warehouse_id,
    origin: origin || 'manual',
  });

  if (bom_id && routing_id && state === 'confirmed') {
    await createWorkOrdersFromRouting(mo._id.toString(), routing_id, product_qty);
  }

  res.status(201).json(mo);
}));

// Update manufacturing order
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    state, product_qty, qty_produced, qty_scrapped,
    date_planned_start, date_planned_finished, date_start, date_finished,
    priority, user_id, notes,
  } = req.body;

  const updateData: any = {};
  if (state !== undefined) updateData.state = state;
  if (product_qty !== undefined) updateData.product_qty = product_qty;
  if (qty_produced !== undefined) updateData.qty_produced = qty_produced;
  if (qty_scrapped !== undefined) updateData.qty_scrapped = qty_scrapped;
  if (date_planned_start !== undefined) updateData.date_planned_start = date_planned_start;
  if (date_planned_finished !== undefined) updateData.date_planned_finished = date_planned_finished;
  if (date_start !== undefined) updateData.date_start = date_start;
  if (date_finished !== undefined) updateData.date_finished = date_finished;
  if (priority !== undefined) updateData.priority = priority;
  if (user_id !== undefined) updateData.user_id = user_id;
  if (notes !== undefined) updateData.notes = notes;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const mo = await ManufacturingOrder.findByIdAndUpdate(id, updateData, { new: true });

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found' });
  }

  res.json(mo);
}));

// Delete manufacturing order
router.delete('/:id', asyncHandler(async (req, res) => {
  const mo = await ManufacturingOrder.findOneAndDelete({ _id: req.params.id, state: 'draft' });

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found or cannot be deleted' });
  }

  res.json({ message: 'Manufacturing order deleted successfully' });
}));

// ============================================
// MANUFACTURING ORDER LIFECYCLE ACTIONS
// ============================================

// Confirm MO
router.post('/:id/confirm', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const mo = await ManufacturingOrder.findById(id);

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found' });
  }

  if (mo.state !== 'draft') {
    return res.status(400).json({ error: 'MO must be in draft state to confirm' });
  }

  const availability = await checkMaterialAvailability(id);
  if (!availability.available) {
    return res.status(400).json({
      error: 'Materials not available',
      details: availability.missing_materials,
    });
  }

  if (mo.routing_id) {
    await createWorkOrdersFromRouting(id, mo.routing_id.toString(), mo.product_qty);
  }

  await reserveMaterials(id);

  const result = await ManufacturingOrder.findByIdAndUpdate(
    id,
    {
      state: 'confirmed',
      ...(mo.date_planned_start ? {} : { date_planned_start: new Date() }),
    },
    { new: true }
  );

  res.json(result);
}));

// Start production
router.post('/:id/start', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const mo = await ManufacturingOrder.findById(id);

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found' });
  }

  if (mo.state !== 'confirmed') {
    return res.status(400).json({ error: 'MO must be confirmed to start' });
  }

  const result = await ManufacturingOrder.findByIdAndUpdate(
    id,
    { state: 'progress', date_start: new Date() },
    { new: true }
  );

  // Start first work order
  const firstWO = await WorkOrder.findOne({ mo_id: id })
    .sort({ sequence: 1 });
  if (firstWO) {
    await WorkOrder.findByIdAndUpdate(firstWO._id, {
      state: 'progress',
      date_start: new Date(),
    });
  }

  res.json(result);
}));

// Complete MO
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { qty_produced } = req.body;

  const mo = await ManufacturingOrder.findById(id);

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found' });
  }

  if (mo.state !== 'progress') {
    return res.status(400).json({ error: 'MO must be in progress to complete' });
  }

  await WorkOrder.updateMany(
    { mo_id: id, state: { $ne: 'done' } },
    { state: 'done', date_finished: new Date() }
  );

  const result = await ManufacturingOrder.findByIdAndUpdate(
    id,
    {
      state: 'done',
      date_finished: new Date(),
      ...(qty_produced !== undefined ? { qty_produced } : {}),
    },
    { new: true }
  );

  if (qty_produced) {
    await MoFinishedGoods.create({
      mo_id: id,
      product_id: mo.product_id,
      product_uom_qty: qty_produced,
      state: 'done',
      date_actual: new Date(),
    });
  }

  res.json(result);
}));

// Cancel MO
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const mo = await ManufacturingOrder.findById(id);

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found' });
  }

  if (mo.state === 'done') {
    return res.status(400).json({ error: 'Cannot cancel completed MO' });
  }

  await WorkOrder.updateMany(
    { mo_id: id, state: { $ne: 'cancel' } },
    { state: 'cancel' }
  );

  await MoMaterialReservation.updateMany(
    { mo_id: id },
    { state: 'cancel' }
  );

  const result = await ManufacturingOrder.findByIdAndUpdate(
    id,
    { state: 'cancel' },
    { new: true }
  );

  res.json(result);
}));

// Check material availability
router.get('/:id/availability', asyncHandler(async (req, res) => {
  const availability = await checkMaterialAvailability(req.params.id);
  res.json(availability);
}));

// Split MO
router.post('/:id/split', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { split_qty, reason } = req.body;

  const mo = await ManufacturingOrder.findById(id);

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found' });
  }

  if (mo.state !== 'draft' && mo.state !== 'confirmed') {
    return res.status(400).json({ error: 'Can only split draft or confirmed MOs' });
  }

  if (split_qty >= mo.product_qty) {
    return res.status(400).json({ error: 'Split quantity must be less than MO quantity' });
  }

  const newMo = await ManufacturingOrder.create({
    name: `${mo.name}-SPLIT`,
    mo_number: `${mo.mo_number}-SPLIT`,
    product_id: mo.product_id,
    product_qty: split_qty,
    mo_type: mo.mo_type,
    priority: mo.priority,
    state: mo.state,
    date_planned_start: mo.date_planned_start,
    date_planned_finished: mo.date_planned_finished,
    user_id: mo.user_id,
    bom_id: mo.bom_id,
    routing_id: mo.routing_id,
    sale_order_id: mo.sale_order_id,
    project_id: mo.project_id,
    warehouse_id: mo.warehouse_id,
    origin: mo.origin,
  });

  await ManufacturingOrder.findByIdAndUpdate(id, {
    $inc: { product_qty: -split_qty },
  });

  await MoSplit.create({
    parent_mo_id: id,
    child_mo_id: newMo._id,
    split_qty,
    reason,
  });

  res.json(newMo);
}));

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkMaterialAvailability(moId: string) {
  const mo = await ManufacturingOrder.findById(moId).lean();

  if (!mo || !mo.bom_id) {
    return { available: true, missing_materials: [] };
  }

  const bomLines = await BomLine.find({ bom_id: mo.bom_id }).lean();

  const missing: any[] = [];
  for (const line of bomLines) {
    const requiredQty = line.product_qty * mo.product_qty;
    const product = await Product.findById(line.product_id).lean();

    if (!product || (product as any).qty_available < requiredQty) {
      missing.push({
        product_id: line.product_id,
        required_qty: requiredQty,
        available_qty: (product as any)?.qty_available || 0,
      });
    }
  }

  return {
    available: missing.length === 0,
    missing_materials: missing,
  };
}

async function reserveMaterials(moId: string) {
  const mo = await ManufacturingOrder.findById(moId).lean();

  if (!mo || !mo.bom_id) return;

  const bomLines = await BomLine.find({ bom_id: mo.bom_id }).lean();

  for (const line of bomLines) {
    const requiredQty = line.product_qty * mo.product_qty;
    await MoMaterialReservation.create({
      mo_id: moId,
      product_id: line.product_id,
      bom_line_id: line._id,
      product_uom_qty: requiredQty,
      state: 'assigned',
      date_planned: mo.date_planned_start,
    });
  }
}

async function createWorkOrdersFromRouting(moId: string, routingId: string, qty: number) {
  const operations = await RoutingOperation.find({ routing_id: routingId }).sort({ sequence: 1 }).lean();

  for (const op of operations) {
    const cycleTime = op.time_cycle || op.time_cycle_manual || 0;
    const duration = cycleTime * qty;
    const dateStart = new Date();
    const dateFinish = new Date(dateStart.getTime() + duration * 60 * 60 * 1000);

    await WorkOrder.create({
      name: `WO-${moId}-${op.sequence}`,
      mo_id: moId,
      operation_id: op._id,
      workcenter_id: op.workcenter_id,
      sequence: op.sequence,
      state: 'pending',
      date_planned_start: dateStart,
      date_planned_finished: dateFinish,
      duration_expected: duration,
    });
  }

  await ManufacturingOrder.findByIdAndUpdate(moId, {
    workorder_count: operations.length,
  });
}

export default router;
