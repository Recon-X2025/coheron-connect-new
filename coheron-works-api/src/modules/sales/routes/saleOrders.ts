import Project from '../../../models/Project.js';
import ProjectTask from '../../../models/ProjectTask.js';
import express from 'express';
import { SaleOrder } from '../../../models/SaleOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { triggerWorkflows } from '../../../shared/middleware/workflowTrigger.js';
import salesLifecycleService from '../../../services/salesLifecycleService.js';
import paymentRecordingService from '../../../services/paymentRecordingService.js';
import { validate } from '../../../shared/middleware/validate.js';
import { checkRecordAccess } from '../../../shared/middleware/permissions.js';
import { objectIdParam } from '../../../shared/schemas/common.js';
import { createSaleOrderSchema, updateSaleOrderSchema } from '../schemas.js';

const router = express.Router();

/**
 * @swagger
 * /sale-orders:
 *   get:
 *     tags: [Sales]
 *     summary: List sale orders with pagination
 *     parameters:
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated list of sale orders
 *   post:
 *     tags: [Sales]
 *     summary: Create a new sale order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               partner_id: { type: string }
 *               date_order: { type: string, format: date-time }
 *               order_line:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id: { type: string }
 *                     product_uom_qty: { type: number }
 *                     price_unit: { type: number }
 *     responses:
 *       201:
 *         description: Sale order created
 */
router.get('/', asyncHandler(async (req, res) => {
  const { state, search } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (search) {
    filter.name = { $regex: search as string, $options: 'i' };
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    SaleOrder.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    SaleOrder
  );
  res.json(result);
}));

// Get sale order by ID
router.get('/:id', checkRecordAccess('sale_orders'), asyncHandler(async (req, res) => {
  const order = await SaleOrder.findOne({ _id: req.params.id, ...req.recordFilter }).lean();

  if (!order) {
    return res.status(404).json({ error: 'Sale order not found' });
  }

  res.json(order);
}));

// Create sale order
router.post('/', validate({ body: createSaleOrderSchema }), asyncHandler(async (req, res) => {
  const { name, partner_id, date_order, user_id, order_line } = req.body;

  const amount_total = order_line?.reduce(
    (sum: number, line: any) => sum + (line.price_unit * line.product_uom_qty),
    0
  ) || 0;

  const lines = (order_line || []).map((line: any) => ({
    product_id: line.product_id,
    product_uom_qty: line.product_uom_qty,
    price_unit: line.price_unit,
    price_subtotal: line.price_unit * line.product_uom_qty,
  }));

  const order = await SaleOrder.create({
    name,
    partner_id,
    date_order: date_order || new Date(),
    amount_total,
    user_id: user_id || undefined,
    order_line: lines,
  });

  res.status(201).json(order);
}));

// Update sale order
router.put('/:id', validate({ params: objectIdParam, body: updateSaleOrderSchema }), checkRecordAccess('sale_orders'), asyncHandler(async (req, res) => {
  const { state, amount_total } = req.body;

  const updateData: any = {};
  if (state !== undefined) updateData.state = state;
  if (amount_total !== undefined) updateData.amount_total = amount_total;

  const oldOrder = await SaleOrder.findOne({ _id: req.params.id, ...req.recordFilter }).lean();
  const order = await SaleOrder.findOneAndUpdate({ _id: req.params.id, ...req.recordFilter }, updateData, { new: true });

  if (!order) {
    return res.status(404).json({ error: 'Sale order not found' });
  }

  // Trigger workflows on status change
  if (state && state !== (oldOrder as any)?.state) {
    triggerWorkflows('on_update', 'SaleOrder', req.params.id);
  }

  res.json(order);
}));

// Delete sale order
router.delete('/:id', checkRecordAccess('sale_orders'), asyncHandler(async (req, res) => {
  const order = await SaleOrder.findOneAndDelete({ _id: req.params.id, ...req.recordFilter });

  if (!order) {
    return res.status(404).json({ error: 'Sale order not found' });
  }

  res.json({ message: 'Sale order deleted successfully' });
}));

// Confirm sale order
router.post('/:id/confirm', validate({ params: objectIdParam }), asyncHandler(async (req: any, res) => {
  const order = await salesLifecycleService.confirmSaleOrder(req.user.tenant_id.toString(), req.params.id);
  res.json(order);
}));

// Create invoice from sale order
router.post('/:id/create-invoice', validate({ params: objectIdParam }), asyncHandler(async (req: any, res) => {
  const invoice = await salesLifecycleService.createInvoiceFromOrder(req.user.tenant_id.toString(), req.params.id, req.user._id.toString());
  res.status(201).json(invoice);
}));

// Cancel sale order
router.post('/:id/cancel', validate({ params: objectIdParam }), asyncHandler(async (req: any, res) => {
  const order = await salesLifecycleService.cancelSaleOrder(req.user.tenant_id.toString(), req.params.id);
  res.json(order);
}));

// POST /:id/create-project
router.post('/:id/create-project', asyncHandler(async (req: any, res) => {
  const order = await SaleOrder.findOne({ _id: req.params.id }).lean() as any;
  if (!order) return res.status(404).json({ error: 'Sale order not found' });
  if (order.state !== 'confirmed' && order.state !== 'sale') {
    return res.status(400).json({ error: 'Order must be confirmed to create a project' });
  }

  const projectCode = 'PRJ-' + order.name;
  const project = await Project.create({
    key: projectCode,
    code: projectCode,
    name: 'Project for ' + order.name,
    partner_id: order.partner_id,
    start_date: new Date(),
    state: 'active',
  });

  const tasks = (order.order_line || []).map((line: any, i: number) => ({
    project_id: project._id,
    title: 'Deliver: ' + (line.product_id || 'Item ' + (i + 1)),
    status: 'todo',
    priority: 'medium',
  }));
  if (tasks.length) await ProjectTask.insertMany(tasks);

  await SaleOrder.findByIdAndUpdate(order._id, { project_id: project._id });
  res.status(201).json({ project, tasks_created: tasks.length });
}));

export default router;
