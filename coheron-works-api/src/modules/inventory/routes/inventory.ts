import express from 'express';
import mongoose from 'mongoose';
import Warehouse from '../../../models/Warehouse.js';
import StockLocation from '../../../models/StockLocation.js';
import StockQuant from '../../../models/StockQuant.js';
import StockGrn from '../../../models/StockGrn.js';
import StockTransfer from '../../../models/StockTransfer.js';
import StockAdjustment from '../../../models/StockAdjustment.js';
import StockProductionLot from '../../../models/StockProductionLot.js';
import StockSerial from '../../../models/StockSerial.js';
import StockLedger from '../../../models/StockLedger.js';
import StockReorderSuggestion from '../../../models/StockReorderSuggestion.js';
import StockIssue from '../../../models/StockIssue.js';
import StockReturn from '../../../models/StockReturn.js';
import PutawayTask from '../../../models/PutawayTask.js';
import PickingTask from '../../../models/PickingTask.js';
import PackingTask from '../../../models/PackingTask.js';
import CycleCount from '../../../models/CycleCount.js';
import InventorySettings from '../../../models/InventorySettings.js';
import Product from '../../../shared/models/Product.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { eventBus } from '../../../orchestration/EventBus.js';
import { STOCK_ADJUSTED } from '../../../orchestration/events.js';

const router = express.Router();

// ============================================
// WAREHOUSES
// ============================================

// Get all warehouses
router.get('/warehouses', asyncHandler(async (req, res) => {
  const { search, active } = req.query;
  const filter: any = {};

  if (active !== undefined) {
    filter.active = active === 'true';
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Warehouse.find(filter)
      .populate('manager_id', 'name')
      .populate('partner_id', 'name')
      .sort({ name: 1 })
      .lean(),
    pagination,
    filter,
    Warehouse
  );

  const mapItem = (w: any) => ({
    ...w,
    manager_name: w.manager_id?.name,
    partner_name: w.partner_id?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Get warehouse by ID
router.get('/warehouses/:id', asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findById(req.params.id)
    .populate('manager_id', 'name')
    .populate('partner_id', 'name')
    .lean();

  if (!warehouse) {
    return res.status(404).json({ error: 'Warehouse not found' });
  }

  res.json({
    ...warehouse,
    manager_name: (warehouse as any).manager_id?.name,
    partner_name: (warehouse as any).partner_id?.name,
  });
}));

// Create warehouse
router.post('/warehouses', asyncHandler(async (req, res) => {
  const {
    code, name, warehouse_type, partner_id, address, city, state, country,
    zip_code, phone, email, manager_id, active, temperature_controlled,
    humidity_controlled, security_level, operating_hours, capacity_cubic_meters, notes,
  } = req.body;

  const warehouse = await Warehouse.create({
    code, name,
    warehouse_type: warehouse_type || 'internal',
    partner_id, address, city, state, country, zip_code, phone, email, manager_id,
    active: active !== undefined ? active : true,
    temperature_controlled: temperature_controlled || false,
    humidity_controlled: humidity_controlled || false,
    security_level, operating_hours, capacity_cubic_meters, notes,
  });

  res.status(201).json(warehouse);
}));

// Update warehouse
router.put('/warehouses/:id', asyncHandler(async (req, res) => {
  const {
    code, name, warehouse_type, partner_id, address, city, state, country,
    zip_code, phone, email, manager_id, active, temperature_controlled,
    humidity_controlled, security_level, operating_hours, capacity_cubic_meters, notes,
  } = req.body;

  const warehouse = await Warehouse.findByIdAndUpdate(
    req.params.id,
    {
      code, name, warehouse_type, partner_id, address, city, state, country,
      zip_code, phone, email, manager_id, active, temperature_controlled,
      humidity_controlled, security_level, operating_hours, capacity_cubic_meters, notes,
    },
    { new: true }
  );

  if (!warehouse) {
    return res.status(404).json({ error: 'Warehouse not found' });
  }

  res.json(warehouse);
}));

// ============================================
// STOCK LOCATIONS
// ============================================

// Get locations by warehouse
router.get('/warehouses/:warehouseId/locations', asyncHandler(async (req, res) => {
  const locations = await StockLocation.find({ warehouse_id: req.params.warehouseId })
    .sort({ name: 1 })
    .lean();
  res.json(locations);
}));

// Create location
router.post('/locations', asyncHandler(async (req, res) => {
  const {
    name, location_id, warehouse_id, usage, active, scrap_location,
    return_location, posx, posy, posz, removal_strategy, barcode, notes,
  } = req.body;

  // Generate complete_name
  let completeName = name;
  if (location_id) {
    const parent = await StockLocation.findById(location_id).lean();
    if (parent) {
      completeName = `${parent.complete_name} / ${name}`;
    }
  }

  const location = await StockLocation.create({
    name, complete_name: completeName, location_id, warehouse_id,
    usage: usage || 'internal',
    active: active !== undefined ? active : true,
    scrap_location: scrap_location || false,
    return_location: return_location || false,
    posx, posy, posz,
    removal_strategy: removal_strategy || 'fifo',
    barcode, notes,
  });

  res.status(201).json(location);
}));

// ============================================
// STOCK QUANTITY (Stock on Hand)
// ============================================

// Get stock quantity by product and location
router.get('/stock-quant', asyncHandler(async (req, res) => {
  const { product_id, location_id, warehouse_id } = req.query;
  const filter: any = {};

  if (product_id) filter.product_id = product_id;
  if (location_id) filter.location_id = location_id;

  let quants = await StockQuant.find(filter)
    .populate('product_id', 'name default_code')
    .populate('lot_id', 'name')
    .populate({
      path: 'location_id',
      select: 'name warehouse_id',
      populate: { path: 'warehouse_id', select: 'name' },
    })
    .sort({ 'product_id.name': 1 })
    .lean();

  // Filter by warehouse_id if needed (post-populate filter)
  if (warehouse_id) {
    quants = quants.filter((q: any) => {
      const loc = q.location_id;
      return loc?.warehouse_id?._id?.toString() === warehouse_id ||
             loc?.warehouse_id?.toString() === warehouse_id;
    });
  }

  const result = quants.map((q: any) => ({
    ...q,
    product_name: q.product_id?.name,
    product_code: q.product_id?.default_code,
    location_name: q.location_id?.name,
    warehouse_name: q.location_id?.warehouse_id?.name,
    lot_name: q.lot_id?.name,
  }));

  res.json(result);
}));

// Get stock summary by product
router.get('/stock-summary', asyncHandler(async (req, res) => {
  const { product_id, warehouse_id } = req.query;

  const matchStage: any = {};
  if (product_id) matchStage.product_id = new mongoose.Types.ObjectId(product_id as string);

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'stocklocations',
        localField: 'location_id',
        foreignField: '_id',
        as: 'location',
      },
    },
    { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
  ];

  if (warehouse_id) {
    pipeline.push({
      $match: { 'location.warehouse_id': new mongoose.Types.ObjectId(warehouse_id as string) },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'products',
        localField: 'product_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$product_id',
        product_id: { $first: '$product_id' },
        product_name: { $first: '$product.name' },
        product_code: { $first: '$product.default_code' },
        total_qty: { $sum: '$quantity' },
        total_reserved: { $sum: '$reserved_quantity' },
        location_count: { $addToSet: '$location_id' },
      },
    },
    {
      $project: {
        _id: 0,
        product_id: 1,
        product_name: 1,
        product_code: 1,
        total_qty: 1,
        total_reserved: 1,
        available_qty: { $subtract: ['$total_qty', '$total_reserved'] },
        location_count: { $size: '$location_count' },
      },
    },
    { $sort: { product_name: 1 } }
  );

  const result = await StockQuant.aggregate(pipeline);
  res.json(result);
}));

// ============================================
// GOODS RECEIPT NOTE (GRN)
// ============================================

// Get all GRNs
router.get('/grn', asyncHandler(async (req, res) => {
  const { state, partner_id, warehouse_id, start_date, end_date } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (partner_id) filter.partner_id = partner_id;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (start_date) filter.grn_date = { ...(filter.grn_date || {}), $gte: new Date(start_date as string) };
  if (end_date) filter.grn_date = { ...(filter.grn_date || {}), $lte: new Date(end_date as string) };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockGrn.find(filter)
      .populate('partner_id', 'name')
      .populate('warehouse_id', 'name')
      .populate('received_by', 'name')
      .populate('approved_by', 'name')
      .populate('qc_inspector_id', 'name')
      .sort({ grn_date: -1, grn_number: -1 })
      .lean(),
    pagination,
    filter,
    StockGrn
  );

  const mapItem = (g: any) => ({
    ...g,
    partner_name: g.partner_id?.name,
    warehouse_name: g.warehouse_id?.name,
    received_by_name: g.received_by?.name,
    approved_by_name: g.approved_by?.name,
    qc_inspector_name: g.qc_inspector_id?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Get GRN by ID with lines
router.get('/grn/:id', asyncHandler(async (req, res) => {
  const grn = await StockGrn.findById(req.params.id)
    .populate('partner_id', 'name')
    .populate('warehouse_id', 'name')
    .populate('lines.product_id', 'name default_code')
    .lean();

  if (!grn) {
    return res.status(404).json({ error: 'GRN not found' });
  }

  const lines = (grn.lines || []).map((l: any) => ({
    ...l,
    product_name: l.product_id?.name,
    product_code: l.product_id?.default_code,
  }));

  res.json({
    ...grn,
    partner_name: (grn as any).partner_id?.name,
    warehouse_name: (grn as any).warehouse_id?.name,
    lines,
  });
}));

// Create GRN
router.post('/grn', asyncHandler(async (req, res) => {
  // Generate GRN number
  const count = await StockGrn.countDocuments({ grn_number: { $regex: /^GRN-/ } });
  const grnNumber = `GRN-${String(count + 1).padStart(6, '0')}`;

  const {
    partner_id, warehouse_id, grn_date, expected_date, purchase_order_id,
    delivery_challan_number, supplier_invoice_number, notes, lines,
  } = req.body;

  const grnLines = (lines || []).map((line: any) => ({
    product_id: line.product_id,
    purchase_line_id: line.purchase_line_id,
    product_uom_id: line.product_uom_id,
    ordered_qty: line.ordered_qty,
    received_qty: line.received_qty || 0,
    unit_price: line.unit_price || 0,
    landed_cost: line.landed_cost || 0,
  }));

  const grn = await StockGrn.create({
    grn_number: grnNumber,
    partner_id, warehouse_id,
    grn_date: grn_date || new Date(),
    expected_date, purchase_order_id,
    delivery_challan_number, supplier_invoice_number,
    notes, state: 'draft',
    lines: grnLines,
  });

  const populated = await StockGrn.findById(grn._id)
    .populate('partner_id', 'name')
    .populate('warehouse_id', 'name')
    .lean();

  res.status(201).json({
    ...populated,
    partner_name: (populated as any)?.partner_id?.name,
    warehouse_name: (populated as any)?.warehouse_id?.name,
  });
}));

// Update GRN
router.put('/grn/:id', asyncHandler(async (req, res) => {
  const {
    grn_date, expected_date, delivery_challan_number, supplier_invoice_number,
    qc_status, qc_inspector_id, qc_date, qc_remarks, received_by, approved_by,
    state, notes, lines,
  } = req.body;

  const updateData: any = {
    grn_date, expected_date, delivery_challan_number, supplier_invoice_number,
    qc_status, qc_inspector_id, qc_date, qc_remarks, received_by, approved_by,
    state, notes,
  };

  if (lines && Array.isArray(lines)) {
    updateData.lines = lines.map((line: any) => ({
      product_id: line.product_id,
      purchase_line_id: line.purchase_line_id,
      product_uom_id: line.product_uom_id,
      ordered_qty: line.ordered_qty,
      received_qty: line.received_qty || 0,
      accepted_qty: line.accepted_qty || 0,
      rejected_qty: line.rejected_qty || 0,
      unit_price: line.unit_price || 0,
      landed_cost: line.landed_cost || 0,
      qc_status: line.qc_status || 'pending',
      qc_remarks: line.qc_remarks,
    }));
  }

  const grn = await StockGrn.findByIdAndUpdate(req.params.id, updateData, { new: true })
    .populate('partner_id', 'name')
    .populate('warehouse_id', 'name')
    .lean();

  if (!grn) {
    return res.status(404).json({ error: 'GRN not found' });
  }

  res.json({
    ...grn,
    partner_name: (grn as any).partner_id?.name,
    warehouse_name: (grn as any).warehouse_id?.name,
  });
}));

// ============================================
// STOCK TRANSFERS
// ============================================

// Get all transfers
router.get('/transfers', asyncHandler(async (req, res) => {
  const { state, from_warehouse_id, to_warehouse_id } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (from_warehouse_id) filter.from_warehouse_id = from_warehouse_id;
  if (to_warehouse_id) filter.to_warehouse_id = to_warehouse_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockTransfer.find(filter)
      .populate('from_warehouse_id', 'name')
      .populate('to_warehouse_id', 'name')
      .populate('initiated_by', 'name')
      .populate('received_by', 'name')
      .sort({ transfer_date: -1, transfer_number: -1 })
      .lean(),
    pagination,
    filter,
    StockTransfer
  );

  const mapItem = (t: any) => ({
    ...t,
    from_warehouse_name: t.from_warehouse_id?.name,
    to_warehouse_name: t.to_warehouse_id?.name,
    initiated_by_name: t.initiated_by?.name,
    received_by_name: t.received_by?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Create transfer
router.post('/transfers', asyncHandler(async (req, res) => {
  const count = await StockTransfer.countDocuments({ transfer_number: { $regex: /^TRF-/ } });
  const transferNumber = `TRF-${String(count + 1).padStart(6, '0')}`;

  const {
    from_warehouse_id, to_warehouse_id, from_location_id, to_location_id,
    transfer_date, expected_delivery_date, transfer_type, initiated_by, notes, lines,
  } = req.body;

  const transferLines = (lines || []).map((line: any) => ({
    product_id: line.product_id,
    product_uom_id: line.product_uom_id,
    quantity: line.quantity,
    lot_id: line.lot_id,
    unit_cost: line.unit_cost || 0,
  }));

  const transfer = await StockTransfer.create({
    transfer_number: transferNumber,
    from_warehouse_id, to_warehouse_id, from_location_id, to_location_id,
    transfer_date: transfer_date || new Date(),
    expected_delivery_date,
    transfer_type: transfer_type || 'warehouse_to_warehouse',
    initiated_by, notes, state: 'draft',
    lines: transferLines,
  });

  res.status(201).json(transfer);
}));

// ============================================
// STOCK ADJUSTMENTS
// ============================================

// Get all adjustments
router.get('/adjustments', asyncHandler(async (req, res) => {
  const { state, warehouse_id, adjustment_type, start_date, end_date } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (adjustment_type) filter.adjustment_type = adjustment_type;
  if (start_date) filter.adjustment_date = { ...(filter.adjustment_date || {}), $gte: new Date(start_date as string) };
  if (end_date) filter.adjustment_date = { ...(filter.adjustment_date || {}), $lte: new Date(end_date as string) };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockAdjustment.find(filter)
      .populate('warehouse_id', 'name')
      .populate('adjusted_by', 'name')
      .populate('approved_by', 'name')
      .sort({ adjustment_date: -1, adjustment_number: -1 })
      .lean(),
    pagination,
    filter,
    StockAdjustment
  );

  const mapItem = (a: any) => ({
    ...a,
    warehouse_name: a.warehouse_id?.name,
    adjusted_by_name: a.adjusted_by?.name,
    approved_by_name: a.approved_by?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Create adjustment
router.post('/adjustments', asyncHandler(async (req, res) => {
  const count = await StockAdjustment.countDocuments({ adjustment_number: { $regex: /^ADJ-/ } });
  const adjustmentNumber = `ADJ-${String(count + 1).padStart(6, '0')}`;

  const {
    warehouse_id, location_id, adjustment_date, adjustment_type,
    reason_code, reason_description, adjusted_by, notes, lines,
  } = req.body;

  // Calculate total value and build lines
  let totalValue = 0;
  const adjustmentLines: any[] = [];

  if (lines && Array.isArray(lines)) {
    const productIds = lines.map((l: any) => new mongoose.Types.ObjectId(l.product_id));
    const [products, quantAggs] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).lean(),
      StockQuant.aggregate([
        { $match: { product_id: { $in: productIds }, location_id: new mongoose.Types.ObjectId(location_id || warehouse_id) } },
        { $group: { _id: '$product_id', qty: { $sum: '$quantity' } } }
      ]),
    ]);
    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));
    const quantMap = new Map(quantAggs.map((q: any) => [q._id.toString(), q.qty]));

    for (const line of lines) {
      const product = productMap.get(line.product_id.toString());
      const unitCost = (product as any)?.standard_price || line.unit_cost || 0;
      const systemQty = quantMap.get(line.product_id.toString()) || 0;

      const adjustmentQty = line.physical_qty - systemQty;
      const adjustmentValue = adjustmentQty * unitCost;
      totalValue += Math.abs(line.adjustment_qty || adjustmentQty) * unitCost;

      adjustmentLines.push({
        product_id: line.product_id,
        product_uom_id: line.product_uom_id,
        system_qty: systemQty,
        physical_qty: line.physical_qty,
        adjustment_qty: adjustmentQty,
        lot_id: line.lot_id,
        unit_cost: unitCost,
        adjustment_value: adjustmentValue,
        reason_code: line.reason_code,
      });
    }
  }

  const adjustment = await StockAdjustment.create({
    adjustment_number: adjustmentNumber,
    warehouse_id, location_id,
    adjustment_date: adjustment_date || new Date(),
    adjustment_type, reason_code, reason_description, adjusted_by,
    total_value: totalValue, notes, state: 'draft',
    lines: adjustmentLines,
  });

  eventBus.publish(STOCK_ADJUSTED, (req as any).user?.tenant_id?.toString() || '', {
    adjustment_id: adjustment._id.toString(),
    warehouse_id,
    product_ids: adjustmentLines.map((l: any) => l.product_id?.toString()),
  }, { user_id: (req as any).user?._id?.toString(), source: 'inventory-route' });

  res.status(201).json(adjustment);
}));

// ============================================
// BATCH/LOT MANAGEMENT
// ============================================

// Get lots by product
router.get('/lots', asyncHandler(async (req, res) => {
  const { product_id, name } = req.query;
  const filter: any = {};

  if (product_id) filter.product_id = product_id;
  if (name) filter.name = { $regex: name, $options: 'i' };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockProductionLot.find(filter)
      .populate('product_id', 'name default_code')
      .sort({ name: -1 })
      .lean(),
    pagination,
    filter,
    StockProductionLot
  );

  const mapItem = (l: any) => ({
    ...l,
    product_name: l.product_id?.name,
    product_code: l.product_id?.default_code,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Create lot
router.post('/lots', asyncHandler(async (req, res) => {
  const { name, product_id, ref, note } = req.body;
  const lot = await StockProductionLot.create({ name, product_id, ref, note });
  res.status(201).json(lot);
}));

// Update lot
router.put('/lots/:id', asyncHandler(async (req, res) => {
  const { name, ref, note } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (ref !== undefined) updateData.ref = ref;
  if (note !== undefined) updateData.note = note;

  const lot = await StockProductionLot.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!lot) {
    return res.status(404).json({ error: 'Lot not found' });
  }

  res.json(lot);
}));

// Delete lot
router.delete('/lots/:id', asyncHandler(async (req, res) => {
  const lot = await StockProductionLot.findByIdAndDelete(req.params.id);
  if (!lot) {
    return res.status(404).json({ error: 'Lot not found' });
  }
  res.json({ message: 'Lot deleted successfully' });
}));

// Get serials
router.get('/serials', asyncHandler(async (req, res) => {
  const { product_id, name } = req.query;
  const filter: any = {};

  if (product_id) filter.product_id = product_id;
  if (name) filter.name = { $regex: name, $options: 'i' };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockSerial.find(filter)
      .populate('product_id', 'name default_code')
      .sort({ name: -1 })
      .lean(),
    pagination,
    filter,
    StockSerial
  );

  const mapItem = (s: any) => ({
    ...s,
    product_name: s.product_id?.name,
    product_code: s.product_id?.default_code,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Get serial by ID
router.get('/serials/:id', asyncHandler(async (req, res) => {
  const serial = await StockSerial.findById(req.params.id)
    .populate('product_id', 'name default_code')
    .lean();

  if (!serial) {
    return res.status(404).json({ error: 'Serial not found' });
  }

  res.json({
    ...serial,
    product_name: (serial as any).product_id?.name,
    product_code: (serial as any).product_id?.default_code,
  });
}));

// Create serial
router.post('/serials', asyncHandler(async (req, res) => {
  const { name, product_id, lot_id, warranty_start_date, warranty_end_date, notes } = req.body;
  const serial = await StockSerial.create({ name, product_id, lot_id, warranty_start_date, warranty_end_date, notes });
  res.status(201).json(serial);
}));

// Update serial
router.put('/serials/:id', asyncHandler(async (req, res) => {
  const { name, lot_id, warranty_start_date, warranty_end_date, notes } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (lot_id !== undefined) updateData.lot_id = lot_id;
  if (warranty_start_date !== undefined) updateData.warranty_start_date = warranty_start_date;
  if (warranty_end_date !== undefined) updateData.warranty_end_date = warranty_end_date;
  if (notes !== undefined) updateData.notes = notes;

  const serial = await StockSerial.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!serial) {
    return res.status(404).json({ error: 'Serial not found' });
  }

  res.json(serial);
}));

// Delete serial
router.delete('/serials/:id', asyncHandler(async (req, res) => {
  const serial = await StockSerial.findByIdAndDelete(req.params.id);
  if (!serial) {
    return res.status(404).json({ error: 'Serial not found' });
  }
  res.json({ message: 'Serial deleted successfully' });
}));

// ============================================
// REPLENISHMENT & REORDER SUGGESTIONS
// ============================================

// Get reorder suggestions
router.get('/reorder-suggestions', asyncHandler(async (req, res) => {
  const { warehouse_id, state } = req.query;
  const filter: any = {};

  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (state) filter.state = state;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockReorderSuggestion.find(filter)
      .populate('product_id', 'name default_code')
      .populate('warehouse_id', 'name')
      .sort({ suggested_qty: -1 })
      .lean(),
    pagination,
    filter,
    StockReorderSuggestion
  );

  const mapItem = (rs: any) => ({
    ...rs,
    product_name: rs.product_id?.name,
    product_code: rs.product_id?.default_code,
    warehouse_name: rs.warehouse_id?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// ============================================
// STOCK ISSUES
// ============================================

// Get all stock issues
router.get('/stock-issues', asyncHandler(async (req, res) => {
  const { state, issue_type, warehouse_id, start_date, end_date } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (issue_type) filter.issue_type = issue_type;
  if (warehouse_id) filter.from_warehouse_id = warehouse_id;
  if (start_date) filter.issue_date = { ...(filter.issue_date || {}), $gte: new Date(start_date as string) };
  if (end_date) filter.issue_date = { ...(filter.issue_date || {}), $lte: new Date(end_date as string) };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockIssue.find(filter)
      .populate('from_warehouse_id', 'name')
      .populate('issued_by', 'name')
      .populate('approved_by', 'name')
      .sort({ issue_date: -1, issue_number: -1 })
      .lean(),
    pagination,
    filter,
    StockIssue
  );

  const mapItem = (si: any) => ({
    ...si,
    from_warehouse_name: si.from_warehouse_id?.name,
    issued_by_name: si.issued_by?.name,
    approved_by_name: si.approved_by?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Get stock issue by ID
router.get('/stock-issues/:id', asyncHandler(async (req, res) => {
  const issue = await StockIssue.findById(req.params.id)
    .populate('from_warehouse_id', 'name')
    .populate('lines.product_id', 'name default_code')
    .lean();

  if (!issue) {
    return res.status(404).json({ error: 'Stock issue not found' });
  }

  const lines = (issue.lines || []).map((l: any) => ({
    ...l,
    product_name: l.product_id?.name,
    product_code: l.product_id?.default_code,
  }));

  res.json({
    ...issue,
    from_warehouse_name: (issue as any).from_warehouse_id?.name,
    lines,
  });
}));

// Create stock issue
router.post('/stock-issues', asyncHandler(async (req, res) => {
  const count = await StockIssue.countDocuments({ issue_number: { $regex: /^ISSUE-/ } });
  const issueNumber = `ISSUE-${String(count + 1).padStart(6, '0')}`;

  const { issue_type, from_warehouse_id, to_entity_id, issue_date, issued_by, notes, lines } = req.body;

  const issueLines = (lines || []).map((line: any) => ({
    product_id: line.product_id,
    product_uom_id: line.product_uom_id,
    quantity: line.quantity,
    lot_id: line.lot_id,
  }));

  const issue = await StockIssue.create({
    issue_number: issueNumber,
    issue_type, from_warehouse_id, to_entity_id,
    issue_date: issue_date || new Date(),
    issued_by, notes, state: 'draft',
    lines: issueLines,
  });

  res.status(201).json(issue);
}));

// Update stock issue
router.put('/stock-issues/:id', asyncHandler(async (req, res) => {
  const { issue_date, notes, state, approved_by, lines } = req.body;

  const updateData: any = { issue_date, notes, state, approved_by };

  if (lines && Array.isArray(lines)) {
    updateData.lines = lines.map((line: any) => ({
      product_id: line.product_id,
      product_uom_id: line.product_uom_id,
      quantity: line.quantity,
      lot_id: line.lot_id,
    }));
  }

  const issue = await StockIssue.findByIdAndUpdate(req.params.id, updateData, { new: true })
    .populate('from_warehouse_id', 'name')
    .lean();

  if (!issue) {
    return res.status(404).json({ error: 'Stock issue not found' });
  }

  res.json({
    ...issue,
    from_warehouse_name: (issue as any).from_warehouse_id?.name,
  });
}));

// Approve stock issue
router.post('/stock-issues/:id/approve', asyncHandler(async (req, res) => {
  const { approved_by } = req.body;
  await StockIssue.findByIdAndUpdate(req.params.id, { state: 'approved', approved_by });
  res.json({ message: 'Stock issue approved' });
}));

// Issue stock (execute)
router.post('/stock-issues/:id/issue', asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const issue = await StockIssue.findById(req.params.id).session(session);
    if (!issue) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Stock issue not found' });
    }

    // Find the stock location for this warehouse
    const location = await StockLocation.findOne({
      warehouse_id: issue.from_warehouse_id,
      usage: 'internal',
    }).session(session);

    if (!location) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'No internal stock location found for warehouse' });
    }

    for (const line of issue.lines) {
      const quant = await StockQuant.findOne({
        product_id: line.product_id,
        location_id: location._id,
      }).session(session);

      if (!quant || quant.quantity < line.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          error: `Insufficient stock for product ${line.product_id}. Available: ${quant?.quantity ?? 0}, Requested: ${line.quantity}`,
        });
      }

      quant.quantity -= line.quantity;
      await quant.save({ session });
    }

    issue.state = 'issued';
    await issue.save({ session });

    await session.commitTransaction();
    res.json({ message: 'Stock issued successfully' });
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// Delete stock issue
router.delete('/stock-issues/:id', asyncHandler(async (req, res) => {
  const issue = await StockIssue.findByIdAndDelete(req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Stock issue not found' });
  }
  res.json({ message: 'Stock issue deleted successfully' });
}));

// ============================================
// STOCK RETURNS
// ============================================

// Get all stock returns
router.get('/stock-returns', asyncHandler(async (req, res) => {
  const { state, return_type, warehouse_id, start_date, end_date } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (return_type) filter.return_type = return_type;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (start_date) filter.return_date = { ...(filter.return_date || {}), $gte: new Date(start_date as string) };
  if (end_date) filter.return_date = { ...(filter.return_date || {}), $lte: new Date(end_date as string) };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockReturn.find(filter)
      .populate('warehouse_id', 'name')
      .populate('returned_by', 'name')
      .populate('approved_by', 'name')
      .sort({ return_date: -1, return_number: -1 })
      .lean(),
    pagination,
    filter,
    StockReturn
  );

  const mapItem = (sr: any) => ({
    ...sr,
    warehouse_name: sr.warehouse_id?.name,
    returned_by_name: sr.returned_by?.name,
    approved_by_name: sr.approved_by?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Get stock return by ID
router.get('/stock-returns/:id', asyncHandler(async (req, res) => {
  const stockReturn = await StockReturn.findById(req.params.id)
    .populate('warehouse_id', 'name')
    .populate('lines.product_id', 'name default_code')
    .lean();

  if (!stockReturn) {
    return res.status(404).json({ error: 'Stock return not found' });
  }

  const lines = (stockReturn.lines || []).map((l: any) => ({
    ...l,
    product_name: l.product_id?.name,
    product_code: l.product_id?.default_code,
  }));

  res.json({
    ...stockReturn,
    warehouse_name: (stockReturn as any).warehouse_id?.name,
    lines,
  });
}));

// Create stock return
router.post('/stock-returns', asyncHandler(async (req, res) => {
  const count = await StockReturn.countDocuments({ return_number: { $regex: /^RET-/ } });
  const returnNumber = `RET-${String(count + 1).padStart(6, '0')}`;

  const { return_type, original_transaction_id, warehouse_id, return_date, returned_by, notes, lines } = req.body;

  const returnLines = (lines || []).map((line: any) => ({
    product_id: line.product_id,
    product_uom_id: line.product_uom_id,
    quantity: line.quantity,
    reason_code: line.reason_code,
    lot_id: line.lot_id,
  }));

  const stockReturn = await StockReturn.create({
    return_number: returnNumber,
    return_type, original_transaction_id, warehouse_id,
    return_date: return_date || new Date(),
    returned_by, notes, state: 'draft',
    lines: returnLines,
  });

  res.status(201).json(stockReturn);
}));

// Update stock return
router.put('/stock-returns/:id', asyncHandler(async (req, res) => {
  const { return_date, notes, state, approved_by, qc_status, lines } = req.body;

  const updateData: any = { return_date, notes, state, approved_by, qc_status };

  if (lines && Array.isArray(lines)) {
    updateData.lines = lines.map((line: any) => ({
      product_id: line.product_id,
      product_uom_id: line.product_uom_id,
      quantity: line.quantity,
      reason_code: line.reason_code,
      lot_id: line.lot_id,
    }));
  }

  const stockReturn = await StockReturn.findByIdAndUpdate(req.params.id, updateData, { new: true })
    .populate('warehouse_id', 'name')
    .lean();

  if (!stockReturn) {
    return res.status(404).json({ error: 'Stock return not found' });
  }

  res.json({
    ...stockReturn,
    warehouse_name: (stockReturn as any).warehouse_id?.name,
  });
}));

// Delete stock return
router.delete('/stock-returns/:id', asyncHandler(async (req, res) => {
  const stockReturn = await StockReturn.findByIdAndDelete(req.params.id);
  if (!stockReturn) {
    return res.status(404).json({ error: 'Stock return not found' });
  }
  res.json({ message: 'Stock return deleted successfully' });
}));

// ============================================
// WAREHOUSE OPERATIONS
// ============================================

// Get putaway tasks
router.get('/warehouse-operations/putaway', asyncHandler(async (req, res) => {
  const { state, warehouse_id } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (warehouse_id) filter.warehouse_id = warehouse_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    PutawayTask.find(filter)
      .populate('grn_id', 'grn_number')
      .populate('product_id', 'name default_code')
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    PutawayTask
  );

  const mapItem = (pt: any) => ({
    ...pt,
    grn_number: pt.grn_id?.grn_number,
    product_name: pt.product_id?.name,
    product_code: pt.product_id?.default_code,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Start putaway task
router.post('/warehouse-operations/putaway/:id/start', asyncHandler(async (req, res) => {
  await PutawayTask.findByIdAndUpdate(req.params.id, {
    state: 'in_progress',
    started_at: new Date(),
  });
  res.json({ message: 'Putaway task started' });
}));

// Complete putaway task
router.post('/warehouse-operations/putaway/:id/complete', asyncHandler(async (req, res) => {
  const { actual_location } = req.body;
  const task = await PutawayTask.findById(req.params.id).lean();
  const startedAt = task?.started_at;
  const putawayTime = startedAt
    ? Math.round((new Date().getTime() - new Date(startedAt).getTime()) / 60000)
    : 0;

  await PutawayTask.findByIdAndUpdate(req.params.id, {
    state: 'completed',
    actual_location,
    completed_at: new Date(),
    putaway_time_minutes: putawayTime,
  });
  res.json({ message: 'Putaway task completed' });
}));

// Get picking tasks
router.get('/warehouse-operations/picking', asyncHandler(async (req, res) => {
  const { state, warehouse_id } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (warehouse_id) filter.warehouse_id = warehouse_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    PickingTask.find(filter)
      .populate('product_id', 'name default_code')
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    PickingTask
  );

  const mapItem = (pt: any) => ({
    ...pt,
    product_name: pt.product_id?.name,
    product_code: pt.product_id?.default_code,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// Start picking task
router.post('/warehouse-operations/picking/:id/start', asyncHandler(async (req, res) => {
  await PickingTask.findByIdAndUpdate(req.params.id, {
    state: 'in_progress',
    started_at: new Date(),
  });
  res.json({ message: 'Picking task started' });
}));

// Complete picking task
router.post('/warehouse-operations/picking/:id/complete', asyncHandler(async (req, res) => {
  const { quantity_picked } = req.body;
  const task = await PickingTask.findById(req.params.id).lean();
  const startedAt = task?.started_at;
  const pickingTime = startedAt
    ? Math.round((new Date().getTime() - new Date(startedAt).getTime()) / 60000)
    : 0;

  await PickingTask.findByIdAndUpdate(req.params.id, {
    state: 'completed',
    quantity_picked,
    completed_at: new Date(),
    picking_time_minutes: pickingTime,
  });
  res.json({ message: 'Picking task completed' });
}));

// Get packing tasks
router.get('/warehouse-operations/packing', asyncHandler(async (req, res) => {
  const { state } = req.query;
  const filter: any = {};

  if (state) filter.state = state;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    PackingTask.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    PackingTask
  );

  res.json(result);
}));

// Get cycle counts
router.get('/warehouse-operations/cycle-counts', asyncHandler(async (req, res) => {
  const { state, warehouse_id } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (warehouse_id) filter.warehouse_id = warehouse_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    CycleCount.find(filter)
      .populate('warehouse_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    CycleCount
  );

  const mapItem = (cc: any) => ({
    ...cc,
    warehouse_name: cc.warehouse_id?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

// ============================================
// SETTINGS
// ============================================

// Get inventory settings
router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await InventorySettings.findOne().lean();
  if (!settings) {
    res.json({
      default_removal_strategy: 'fifo',
      default_cost_method: 'fifo',
      auto_create_lots: false,
      auto_assign_lots: false,
      require_qc_on_grn: false,
      require_approval_for_adjustments: true,
      adjustment_approval_threshold: 10000,
      enable_abc_analysis: true,
      enable_cycle_counting: true,
      cycle_count_frequency_days: 30,
    });
  } else {
    res.json(settings);
  }
}));

// Update inventory settings
router.put('/settings', asyncHandler(async (req, res) => {
  const settings = req.body;
  const existing = await InventorySettings.findOne();

  if (existing) {
    await InventorySettings.findByIdAndUpdate(existing._id, settings);
  } else {
    await InventorySettings.create(settings);
  }

  res.json({ message: 'Settings updated successfully' });
}));

// ============================================
// STOCK LEDGER
// ============================================

// Get stock ledger
router.get('/stock-ledger', asyncHandler(async (req, res) => {
  const { product_id, location_id, start_date, end_date } = req.query;
  const filter: any = {};

  if (product_id) filter.product_id = product_id;
  if (location_id) filter.location_id = location_id;
  if (start_date) filter.transaction_date = { ...(filter.transaction_date || {}), $gte: new Date(start_date as string) };
  if (end_date) filter.transaction_date = { ...(filter.transaction_date || {}), $lte: new Date(end_date as string) };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockLedger.find(filter)
      .populate('product_id', 'name default_code')
      .populate({
        path: 'location_id',
        select: 'name warehouse_id',
        populate: { path: 'warehouse_id', select: 'name' },
      })
      .sort({ transaction_date: -1, created_at: -1 })
      .lean(),
    pagination,
    filter,
    StockLedger
  );

  const mapItem = (sl: any) => ({
    ...sl,
    product_name: sl.product_id?.name,
    product_code: sl.product_id?.default_code,
    location_name: sl.location_id?.name,
    warehouse_name: sl.location_id?.warehouse_id?.name,
  });

  res.json({ ...result, data: result.data.map(mapItem) });
}));

export default router;
