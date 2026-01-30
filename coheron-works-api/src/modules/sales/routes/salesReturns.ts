import express from 'express';
import { Rma, Warranty, RepairRequest } from '../../../models/Rma.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// RETURN MERCHANDISE AUTHORIZATION (RMA)
// ============================================

// Get all RMAs
router.get('/', asyncHandler(async (req, res) => {
  const { partner_id, sale_order_id, status } = req.query;
  const filter: any = {};

  if (partner_id) filter.partner_id = partner_id;
  if (sale_order_id) filter.sale_order_id = sale_order_id;
  if (status) filter.status = status;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Rma.find(filter)
      .populate('sale_order_id', 'name')
      .populate('partner_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, Rma
  );

  const data = paginatedResult.data.map((r: any) => ({
    ...r,
    sale_order_name: r.sale_order_id?.name,
    partner_name: r.partner_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get RMA by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const rma = await Rma.findById(req.params.id)
    .populate('sale_order_id', 'name')
    .populate('partner_id', 'name')
    .lean();

  if (!rma) {
    return res.status(404).json({ error: 'RMA not found' });
  }

  res.json({
    ...rma,
    sale_order_name: (rma.sale_order_id as any)?.name,
    partner_name: (rma.partner_id as any)?.name,
  });
}));

// Create RMA
router.post('/', asyncHandler(async (req, res) => {
  const { sale_order_id, delivery_order_id, partner_id, reason, requested_date, notes, rma_lines } = req.body;

  const count = await Rma.countDocuments();
  const rmaNumber = `RMA-${String(count + 1).padStart(6, '0')}`;

  let totalRefund = 0;
  const lines = (rma_lines || []).map((line: any) => {
    totalRefund += parseFloat(line.refund_amount || 0);
    return {
      sale_order_line_id: line.sale_order_line_id,
      product_id: line.product_id,
      quantity_returned: line.quantity_returned,
      condition: line.condition || 'used',
      refund_amount: line.refund_amount || 0,
      replacement_product_id: line.replacement_product_id,
    };
  });

  const rma = await Rma.create({
    rma_number: rmaNumber,
    sale_order_id,
    delivery_order_id,
    partner_id,
    reason,
    requested_date,
    refund_amount: totalRefund,
    notes,
    rma_lines: lines,
  });

  res.status(201).json(rma);
}));

// Update RMA status
router.put('/:id/status', asyncHandler(async (req, res) => {
  const { status, approved_date, received_date, processed_date, refund_method, replacement_order_id } = req.body;

  const updateData: any = { status };
  if (approved_date !== undefined) updateData.approved_date = approved_date;
  if (received_date !== undefined) updateData.received_date = received_date;
  if (processed_date !== undefined) updateData.processed_date = processed_date;
  if (refund_method !== undefined) updateData.refund_method = refund_method;
  if (replacement_order_id !== undefined) updateData.replacement_order_id = replacement_order_id;

  const rma = await Rma.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!rma) {
    return res.status(404).json({ error: 'RMA not found' });
  }

  res.json(rma);
}));

// ============================================
// WARRANTIES
// ============================================

// Get warranties
router.get('/warranties', asyncHandler(async (req, res) => {
  const { partner_id, product_id, status } = req.query;
  const filter: any = {};

  if (partner_id) filter.partner_id = partner_id;
  if (product_id) filter.product_id = product_id;
  if (status) filter.status = status;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Warranty.find(filter)
      .populate('product_id', 'name')
      .populate('partner_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, Warranty
  );

  const data = paginatedResult.data.map((w: any) => ({
    ...w,
    product_name: w.product_id?.name,
    partner_name: w.partner_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create warranty
router.post('/warranties', asyncHandler(async (req, res) => {
  const {
    sale_order_id, sale_order_line_id, product_id, partner_id,
    warranty_type, warranty_period_months, start_date, terms_and_conditions,
  } = req.body;

  const count = await Warranty.countDocuments();
  const warrantyNumber = `WAR-${String(count + 1).padStart(6, '0')}`;

  const start = new Date(start_date);
  const end = new Date(start);
  end.setMonth(end.getMonth() + warranty_period_months);

  const warranty = await Warranty.create({
    warranty_number: warrantyNumber,
    sale_order_id,
    sale_order_line_id,
    product_id,
    partner_id,
    warranty_type,
    warranty_period_months,
    start_date,
    end_date: end.toISOString().split('T')[0],
    terms_and_conditions,
  });

  res.status(201).json(warranty);
}));

// ============================================
// REPAIR REQUESTS
// ============================================

// Get repair requests
router.get('/repairs', asyncHandler(async (req, res) => {
  const { partner_id, status } = req.query;
  const filter: any = {};

  if (partner_id) filter.partner_id = partner_id;
  if (status) filter.status = status;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    RepairRequest.find(filter)
      .populate('product_id', 'name')
      .populate('partner_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, RepairRequest
  );

  const data = paginatedResult.data.map((r: any) => ({
    ...r,
    product_name: r.product_id?.name,
    partner_name: r.partner_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create repair request
router.post('/repairs', asyncHandler(async (req, res) => {
  const {
    warranty_id, sale_order_id, partner_id, product_id,
    issue_description, requested_date, estimated_cost,
  } = req.body;

  const count = await RepairRequest.countDocuments();
  const repairNumber = `REP-${String(count + 1).padStart(6, '0')}`;

  const repair = await RepairRequest.create({
    repair_number: repairNumber,
    warranty_id,
    sale_order_id,
    partner_id,
    product_id,
    issue_description,
    requested_date,
    estimated_cost: estimated_cost || 0,
  });

  res.status(201).json(repair);
}));

// Update repair request status
router.put('/repairs/:id/status', asyncHandler(async (req, res) => {
  const { status, completed_date, actual_cost, repair_center, notes } = req.body;

  const updateData: any = { status };
  if (completed_date !== undefined) updateData.completed_date = completed_date;
  if (actual_cost !== undefined) updateData.actual_cost = actual_cost;
  if (repair_center !== undefined) updateData.repair_center = repair_center;
  if (notes !== undefined) updateData.notes = notes;

  const repair = await RepairRequest.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!repair) {
    return res.status(404).json({ error: 'Repair request not found' });
  }

  res.json(repair);
}));

export default router;
