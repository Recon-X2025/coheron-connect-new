import express from 'express';
import { DeliveryOrder, ShipmentTracking, FreightCharge } from '../../../models/DeliveryOrder.js';
import { SaleOrder } from '../../../models/SaleOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// DELIVERY ORDERS
// ============================================

// Get all delivery orders
router.get('/', asyncHandler(async (req, res) => {
  const { sale_order_id, status, warehouse_id } = req.query;
  const filter: any = {};

  if (sale_order_id) filter.sale_order_id = sale_order_id;
  if (status) filter.status = status;
  if (warehouse_id) filter.warehouse_id = warehouse_id;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    DeliveryOrder.find(filter)
      .populate('sale_order_id', 'name partner_id')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, DeliveryOrder
  );

  const data = paginatedResult.data.map((d: any) => ({
    ...d,
    sale_order_name: d.sale_order_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get delivery order by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const delivery = await DeliveryOrder.findById(req.params.id)
    .populate('sale_order_id', 'name partner_id')
    .lean();

  if (!delivery) {
    return res.status(404).json({ error: 'Delivery order not found' });
  }

  const tracking = await ShipmentTracking.find({ delivery_order_id: req.params.id }).sort({ event_date: -1 }).lean();
  const freight_charges = await FreightCharge.find({ delivery_order_id: req.params.id }).lean();

  res.json({
    ...delivery,
    sale_order_name: (delivery.sale_order_id as any)?.name,
    tracking,
    freight_charges,
  });
}));

// Create delivery order from sales order
router.post('/', asyncHandler(async (req, res) => {
  const { sale_order_id, warehouse_id, delivery_date, delivery_address, delivery_method, delivery_lines } = req.body;

  const saleOrder = await SaleOrder.findById(sale_order_id);
  if (!saleOrder) {
    return res.status(404).json({ error: 'Sales order not found' });
  }

  const count = await DeliveryOrder.countDocuments();
  const deliveryNumber = `DO-${String(count + 1).padStart(6, '0')}`;

  let lines;
  if (delivery_lines && delivery_lines.length > 0) {
    lines = delivery_lines.map((line: any) => ({
      sale_order_line_id: line.sale_order_line_id,
      product_id: line.product_id,
      quantity_ordered: line.quantity_ordered,
      quantity_delivered: line.quantity_delivered || 0,
    }));
  } else {
    // Auto-create from sales order lines
    lines = (saleOrder.order_line || []).map((line: any) => ({
      sale_order_line_id: line._id,
      product_id: line.product_id,
      quantity_ordered: line.product_uom_qty,
      quantity_delivered: 0,
    }));
  }

  const deliveryOrder = await DeliveryOrder.create({
    delivery_number: deliveryNumber,
    sale_order_id,
    warehouse_id,
    delivery_date,
    delivery_address,
    delivery_method,
    delivery_lines: lines,
  });

  res.status(201).json(deliveryOrder);
}));

// Update delivery order status
router.put('/:id/status', asyncHandler(async (req, res) => {
  const { status, delivered_at, tracking_number, carrier_name } = req.body;

  const updateData: any = { status };
  if (delivered_at !== undefined) updateData.delivered_at = delivered_at;
  if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
  if (carrier_name !== undefined) updateData.carrier_name = carrier_name;

  const delivery = await DeliveryOrder.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!delivery) {
    return res.status(404).json({ error: 'Delivery order not found' });
  }

  // If delivered, update delivery lines
  if (status === 'delivered') {
    const doc = await DeliveryOrder.findById(req.params.id);
    if (doc) {
      doc.delivery_lines.forEach((line: any) => {
        if (line.quantity_delivered < line.quantity_ordered) {
          line.quantity_delivered = line.quantity_ordered;
        }
      });
      await doc.save();
    }
  }

  res.json(delivery);
}));

// Update delivery line quantities
router.put('/:id/lines/:lineId', asyncHandler(async (req, res) => {
  const { quantity_delivered } = req.body;

  const delivery = await DeliveryOrder.findById(req.params.id);
  if (!delivery) {
    return res.status(404).json({ error: 'Delivery order not found' });
  }

  const line = delivery.delivery_lines.id(req.params.lineId);
  if (!line) {
    return res.status(404).json({ error: 'Delivery line not found' });
  }

  line.quantity_delivered = quantity_delivered;
  await delivery.save();

  res.json(line);
}));

// ============================================
// SHIPMENT TRACKING
// ============================================

// Add tracking event
router.post('/:id/tracking', asyncHandler(async (req, res) => {
  const { tracking_event, location, notes } = req.body;

  const tracking = await ShipmentTracking.create({
    delivery_order_id: req.params.id,
    tracking_event,
    location,
    notes,
  });

  res.status(201).json(tracking);
}));

// Get tracking history
router.get('/:id/tracking', asyncHandler(async (req, res) => {
  const tracking = await ShipmentTracking.find({ delivery_order_id: req.params.id }).sort({ event_date: -1 }).lean();
  res.json(tracking);
}));

// ============================================
// FREIGHT CHARGES
// ============================================

// Add freight charge
router.post('/:id/freight', asyncHandler(async (req, res) => {
  const { charge_type, amount, currency, description } = req.body;

  const charge = await FreightCharge.create({
    delivery_order_id: req.params.id,
    charge_type,
    amount,
    currency: currency || 'INR',
    description,
  });

  res.status(201).json(charge);
}));

// Get freight charges
router.get('/:id/freight', asyncHandler(async (req, res) => {
  const charges = await FreightCharge.find({ delivery_order_id: req.params.id }).lean();
  res.json(charges);
}));

export default router;
