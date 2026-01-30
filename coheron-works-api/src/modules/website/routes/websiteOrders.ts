import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { WebsiteOrder, WebsiteOrderItem, WebsiteOrderStatusHistory } from '../../../models/WebsiteOrder.js';
import { WebsiteCart, WebsiteCartItem } from '../../../models/WebsiteCart.js';
import Product from '../../../shared/models/Product.js';
import { SaleOrder } from '../../../models/SaleOrder.js';
import { createOrder as createRazorpayOrder } from '../../crossmodule/services/paymentService.js';

const router = express.Router();

// Get all orders
router.get('/', asyncHandler(async (req, res) => {
  const { site_id, customer_id, status, search } = req.query;
  const filter: any = {};

  if (site_id) filter.site_id = site_id;
  if (customer_id) filter.customer_id = customer_id;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { order_number: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    WebsiteOrder.find(filter)
      .populate('customer_id', 'name email')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, WebsiteOrder
  );

  // If search includes partner name, we need post-filter
  let result = paginatedResult.data.map((o: any) => ({
    ...o,
    id: o._id,
    customer_name: o.customer_id?.name,
    customer_email: o.customer_id?.email,
  }));

  if (search) {
    const searchRegex = new RegExp(search as string, 'i');
    result = result.filter((o: any) =>
      searchRegex.test(o.order_number) || searchRegex.test(o.customer_name)
    );
  }

  res.json({ data: result, pagination: paginatedResult.pagination });
}));

// Get order by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await WebsiteOrder.findById(req.params.id)
    .populate('customer_id', 'name email phone')
    .lean();

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const [items, history] = await Promise.all([
    WebsiteOrderItem.find({ order_id: req.params.id })
      .populate('product_id', 'name image_url')
      .lean(),
    WebsiteOrderStatusHistory.find({ order_id: req.params.id })
      .sort({ created_at: -1 })
      .lean(),
  ]);

  const o: any = order;
  res.json({
    ...o,
    id: o._id,
    customer_name: o.customer_id?.name,
    customer_email: o.customer_id?.email,
    phone: o.customer_id?.phone,
    items: items.map((i: any) => ({
      ...i,
      id: i._id,
      product_name: i.product_name || i.product_id?.name,
      image_url: i.product_id?.image_url,
    })),
    history,
  });
}));

// Create order from cart (checkout)
router.post('/checkout', asyncHandler(async (req, res) => {
  const { cart_id, customer_id, session_id, site_id, shipping_address, billing_address, payment_method, payment_reference, shipping_method } = req.body;

  const cart = await WebsiteCart.findById(cart_id);
  if (!cart) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const cartItems = await WebsiteCartItem.find({ cart_id }).lean();
  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const orderNumber = `WEB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const order = await WebsiteOrder.create({
    order_number: orderNumber,
    site_id,
    customer_id,
    session_id,
    status: 'pending',
    currency: cart.currency,
    subtotal: cart.subtotal,
    tax_amount: cart.tax_amount,
    shipping_amount: cart.shipping_amount || 0,
    discount_amount: cart.discount_amount || 0,
    total: cart.total,
    payment_status: 'pending',
    payment_method,
    payment_reference,
    shipping_address,
    billing_address,
    shipping_method,
    promotion_code: cart.promotion_code,
  });

  // Create order items
  for (const item of cartItems) {
    const product = await Product.findById(item.product_id).select('name default_code').lean();

    await WebsiteOrderItem.create({
      order_id: order._id,
      product_id: item.product_id,
      website_product_id: item.website_product_id,
      variant_id: item.variant_id,
      product_name: product?.name,
      product_sku: product?.default_code,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    });
  }

  // Create ERP sales order
  let erpOrderId = null;
  if (customer_id) {
    try {
      const erpOrder = await SaleOrder.create({
        name: `SO-${orderNumber}`,
        partner_id: customer_id,
        date_order: new Date(),
        amount_total: order.total,
        state: 'draft',
      });
      erpOrderId = erpOrder._id;

      await WebsiteOrder.findByIdAndUpdate(order._id, { erp_order_id: erpOrderId });
    } catch (erpError) {
      console.error('Error creating ERP order:', erpError);
    }
  }

  // Add status history
  await WebsiteOrderStatusHistory.create({
    order_id: order._id,
    status: 'pending',
    notes: 'Order created from checkout',
  });

  // Clear cart
  await WebsiteCartItem.deleteMany({ cart_id });
  await WebsiteCart.findByIdAndDelete(cart_id);

  res.status(201).json({ ...order.toObject(), erp_order_id: erpOrderId });
}));

// Update order status
router.put('/:id/status', asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const order = await WebsiteOrder.findById(req.params.id).lean();
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  await WebsiteOrder.findByIdAndUpdate(req.params.id, { status });

  await WebsiteOrderStatusHistory.create({
    order_id: req.params.id,
    status,
    notes: notes || '',
  });

  // Update ERP order if linked
  if (order.erp_order_id) {
    let erpState = 'draft';
    if (status === 'confirmed' || status === 'paid') erpState = 'sale';
    else if (status === 'cancelled') erpState = 'cancel';

    await SaleOrder.findByIdAndUpdate(order.erp_order_id, { state: erpState });
  }

  res.json({ message: 'Order status updated', status });
}));

// Initiate Razorpay payment for order
router.post('/:id/pay', asyncHandler(async (req, res) => {
  const order = await WebsiteOrder.findById(req.params.id).lean();
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const razorpayOrder = await createRazorpayOrder({
    amount: Math.round((order.total || 0) * 100), // convert to paise
    currency: order.currency || 'INR',
    receipt: order.order_number,
    notes: { order_id: req.params.id },
  });

  res.json({ razorpay_order_id: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency });
}));

// Update payment status
router.put('/:id/payment', asyncHandler(async (req, res) => {
  const { payment_status, payment_reference } = req.body;

  const updateData: any = { payment_status };
  if (payment_reference) updateData.payment_reference = payment_reference;

  await WebsiteOrder.findByIdAndUpdate(req.params.id, updateData);

  if (payment_status === 'paid') {
    await WebsiteOrder.findByIdAndUpdate(req.params.id, { status: 'confirmed' });
  }

  res.json({ message: 'Payment status updated' });
}));

export default router;
