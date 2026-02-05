import express from 'express';
import Project from '../../../models/Project.js';
import ProjectPurchaseRequest from '../../../models/ProjectPurchaseRequest.js';
import ProjectPurchaseRequestLine from '../../../models/ProjectPurchaseRequestLine.js';
import ProjectInventoryReservation from '../../../models/ProjectInventoryReservation.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();
router.use(authenticate);

// ============================================
// PROJECT PROCUREMENT & INVENTORY
// ============================================

// Get project purchase requests
router.get('/:projectId/purchase-requests', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;

  const requests = await ProjectPurchaseRequest.find(filter)
    .populate('requested_by', 'name')
    .populate('approved_by', 'name')
    .populate('task_id', 'name')
    .sort({ created_at: -1 })
    .lean();

  const result = await Promise.all(requests.map(async (pr: any) => {
    const obj: any = { ...pr };
    if (obj.requested_by) obj.requested_by_name = obj.requested_by.name;
    if (obj.approved_by) obj.approved_by_name = obj.approved_by.name;
    if (obj.task_id) obj.task_name = obj.task_id.name;

    const lineAgg = await ProjectPurchaseRequestLine.aggregate([
      { $match: { request_id: pr._id } },
      { $group: { _id: null, line_count: { $sum: 1 }, total_amount: { $sum: '$total_amount' } } },
    ]);
    obj.line_count = lineAgg[0]?.line_count || 0;
    obj.total_amount = lineAgg[0]?.total_amount || 0;
    return obj;
  }));

  res.json(result);
}));

// Create purchase request
router.post('/:projectId/purchase-requests', asyncHandler(async (req, res) => {
  const { task_id, description, required_date, requested_by, lines } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  const project = await Project.findById(req.params.projectId).lean();
  const projectCode = project?.code || 'PROJ';
  const count = await ProjectPurchaseRequest.countDocuments({ project_id: req.params.projectId });
  const num = count + 1;
  const requestCode = `${projectCode}-PR-${num.toString().padStart(4, '0')}`;

  const request = await ProjectPurchaseRequest.create({
    project_id: req.params.projectId,
    request_code: requestCode,
    task_id, description, required_date, requested_by,
    status: 'draft',
  });

  if (lines && Array.isArray(lines) && lines.length > 0) {
    for (const line of lines) {
      const totalAmount = (line.quantity || 0) * (line.unit_price || 0);
      await ProjectPurchaseRequestLine.create({
        request_id: request._id,
        product_id: line.product_id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_amount: totalAmount,
        vendor_id: line.vendor_id,
      });
    }
  }

  const fullRequest = await ProjectPurchaseRequest.findById(request._id)
    .populate('requested_by', 'name')
    .populate('task_id', 'name')
    .lean();

  const linesDocs = await ProjectPurchaseRequestLine.find({ request_id: request._id })
    .populate('product_id', 'name')
    .lean();

  const lineRows = linesDocs.map((l: any) => {
    const obj: any = { ...l };
    if (obj.product_id) obj.product_name = obj.product_id.name;
    return obj;
  });

  res.status(201).json({
    ...(fullRequest || {}),
    lines: lineRows,
  });
}));

// Get purchase request lines
router.get('/purchase-requests/:id/lines', asyncHandler(async (req, res) => {
  const lines = await ProjectPurchaseRequestLine.find({ request_id: req.params.id })
    .populate('product_id', 'name default_code')
    .lean();

  const rows = lines.map((l: any) => {
    const obj: any = { ...l };
    if (obj.product_id) {
      obj.product_name = obj.product_id.name;
      obj.product_code = obj.product_id.default_code;
    }
    return obj;
  });

  res.json(rows);
}));

// Approve purchase request
router.post('/purchase-requests/:id/approve', asyncHandler(async (req, res) => {
  const { approved_by } = req.body;

  const request = await ProjectPurchaseRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'approved', approved_by, approved_at: new Date() },
    { new: true }
  );

  if (!request) return res.status(404).json({ error: 'Purchase request not found' });
  res.json(request);
}));

// ============================================
// INVENTORY RESERVATIONS
// ============================================

router.get('/:projectId/inventory-reservations', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;

  const reservations = await ProjectInventoryReservation.find(filter)
    .populate('product_id', 'name default_code')
    .populate('task_id', 'name')
    .sort({ reserved_date: -1 })
    .lean();

  const rows = reservations.map((ir: any) => {
    const obj: any = { ...ir };
    if (obj.product_id) { obj.product_name = obj.product_id.name; obj.product_code = obj.product_id.default_code; }
    if (obj.task_id) obj.task_name = obj.task_id.name;
    return obj;
  });

  res.json(rows);
}));

router.post('/:projectId/inventory-reservations', asyncHandler(async (req, res) => {
  const { task_id, product_id, quantity, batch_number, serial_number } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'Product ID and quantity are required' });
  }

  const reservation = await ProjectInventoryReservation.create({
    project_id: req.params.projectId,
    task_id, product_id, quantity, batch_number, serial_number,
    status: 'reserved',
  });

  res.status(201).json(reservation);
}));

router.put('/inventory-reservations/:id', asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['reserved', 'allocated', 'consumed', 'released'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const reservation = await ProjectInventoryReservation.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  res.json(reservation);
}));

export default router;
