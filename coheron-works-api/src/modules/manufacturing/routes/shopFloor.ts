import express from 'express';
import ShopFloorLog from '../../../models/ShopFloorLog.js';
import ScrapEntry from '../../../models/ScrapEntry.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get active operations
router.get('/active', authenticate, asyncHandler(async (req, res) => {
  const active = await ShopFloorLog.find({
    action: { $in: ['start', 'resume'] },
    ended_at: { $exists: false },
  })
    .populate('manufacturing_order_id', 'mo_number name')
    .populate('work_center_id', 'name code')
    .populate('operator_id', 'name')
    .sort({ started_at: -1 })
    .lean();
  res.json({ data: active });
}));

// Start operation
router.post('/start', authenticate, asyncHandler(async (req, res) => {
  const log = await ShopFloorLog.create({
    ...req.body,
    action: 'start',
    started_at: new Date(),
  });
  res.status(201).json({ data: log });
}));

// Pause operation
router.post('/pause', authenticate, asyncHandler(async (req, res) => {
  const { log_id, notes } = req.body;
  const log = await ShopFloorLog.findById(log_id);
  if (!log) return res.status(404).json({ error: 'Log not found' });
  const now = new Date();
  log.ended_at = now;
  if (log.started_at) {
    log.duration_minutes = Math.round((now.getTime() - new Date(log.started_at).getTime()) / 60000);
  }
  if (notes) log.notes = notes;
  await log.save();
  // Create pause entry
  const pauseLog = await ShopFloorLog.create({
    tenant_id: log.tenant_id,
    manufacturing_order_id: log.manufacturing_order_id,
    work_center_id: log.work_center_id,
    operation_name: log.operation_name,
    operator_id: log.operator_id,
    action: 'pause',
    started_at: now,
    notes,
  });
  res.json({ data: pauseLog });
}));

// Resume operation
router.post('/resume', authenticate, asyncHandler(async (req, res) => {
  const log = await ShopFloorLog.create({
    ...req.body,
    action: 'resume',
    started_at: new Date(),
  });
  res.status(201).json({ data: log });
}));

// Complete operation
router.post('/complete', authenticate, asyncHandler(async (req, res) => {
  const { log_id, quantity_produced, quantity_rejected, rejection_reason, notes } = req.body;
  const log = await ShopFloorLog.findById(log_id);
  if (!log) return res.status(404).json({ error: 'Log not found' });
  const now = new Date();
  log.ended_at = now;
  if (log.started_at) {
    log.duration_minutes = Math.round((now.getTime() - new Date(log.started_at).getTime()) / 60000);
  }
  log.quantity_produced = quantity_produced || 0;
  log.quantity_rejected = quantity_rejected || 0;
  if (rejection_reason) log.rejection_reason = rejection_reason;
  if (notes) log.notes = notes;
  // Create complete entry
  const completeLog = await ShopFloorLog.create({
    tenant_id: log.tenant_id,
    manufacturing_order_id: log.manufacturing_order_id,
    work_center_id: log.work_center_id,
    operation_name: log.operation_name,
    operator_id: log.operator_id,
    action: 'complete',
    started_at: log.started_at,
    ended_at: now,
    duration_minutes: log.duration_minutes,
    quantity_produced: quantity_produced || 0,
    quantity_rejected: quantity_rejected || 0,
    rejection_reason,
    notes,
  });
  await log.save();
  res.json({ data: completeLog });
}));

// Get shop floor logs
router.get('/logs', authenticate, asyncHandler(async (req, res) => {
  const { manufacturing_order_id, work_center_id, operator_id, action } = req.query;
  const filter: any = {};
  if (manufacturing_order_id) filter.manufacturing_order_id = manufacturing_order_id;
  if (work_center_id) filter.work_center_id = work_center_id;
  if (operator_id) filter.operator_id = operator_id;
  if (action) filter.action = action;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    ShopFloorLog.find(filter)
      .populate('manufacturing_order_id', 'mo_number')
      .populate('work_center_id', 'name')
      .populate('operator_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, ShopFloorLog
  );
  res.json({ data: result.data, pagination: result.pagination });
}));

// Record scrap entry
router.post('/scrap', authenticate, asyncHandler(async (req, res) => {
  const scrap = await ScrapEntry.create(req.body);
  res.status(201).json({ data: scrap });
}));

// List scrap entries
router.get('/scrap', authenticate, asyncHandler(async (req, res) => {
  const { manufacturing_order_id, product_id, scrap_reason, disposal_method } = req.query;
  const filter: any = {};
  if (manufacturing_order_id) filter.manufacturing_order_id = manufacturing_order_id;
  if (product_id) filter.product_id = product_id;
  if (scrap_reason) filter.scrap_reason = scrap_reason;
  if (disposal_method) filter.disposal_method = disposal_method;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    ScrapEntry.find(filter)
      .populate('product_id', 'name')
      .populate('work_center_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, ScrapEntry
  );
  res.json({ data: result.data, pagination: result.pagination });
}));

// Scrap summary by reason/product
router.get('/scrap/summary', authenticate, asyncHandler(async (req, res) => {
  const { group_by } = req.query;
  const groupField = group_by === 'product' ? '$product_id' : '$scrap_reason';
  const summary = await ScrapEntry.aggregate([
    { $group: {
      _id: groupField,
      total_quantity: { $sum: '$quantity' },
      total_estimated_value: { $sum: '$estimated_value' },
      total_salvage_value: { $sum: '$salvage_value' },
      count: { $sum: 1 },
    }},
    { $sort: { total_quantity: -1 } },
  ]);
  res.json({ data: summary });
}));

export default router;
