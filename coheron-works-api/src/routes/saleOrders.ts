import express from 'express';
import { SaleOrder } from '../models/SaleOrder.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

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
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await SaleOrder.findById(req.params.id).lean();

  if (!order) {
    return res.status(404).json({ error: 'Sale order not found' });
  }

  res.json(order);
}));

// Create sale order
router.post('/', asyncHandler(async (req, res) => {
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
router.put('/:id', asyncHandler(async (req, res) => {
  const { state, amount_total } = req.body;

  const updateData: any = {};
  if (state !== undefined) updateData.state = state;
  if (amount_total !== undefined) updateData.amount_total = amount_total;

  const order = await SaleOrder.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!order) {
    return res.status(404).json({ error: 'Sale order not found' });
  }

  res.json(order);
}));

// Delete sale order
router.delete('/:id', asyncHandler(async (req, res) => {
  const order = await SaleOrder.findByIdAndDelete(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Sale order not found' });
  }

  res.json({ message: 'Sale order deleted successfully' });
}));

export default router;
