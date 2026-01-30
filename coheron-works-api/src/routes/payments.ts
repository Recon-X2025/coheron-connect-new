import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { Payment } from '../models/Payment.js';
import { createOrder, verifySignature, verifyWebhookSignature, refundPayment } from '../services/paymentService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-order', asyncHandler(async (req, res) => {
  const { amount, currency, receipt, notes, entity_type, entity_id, tenant_id } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  const order = await createOrder({ amount, currency, receipt, notes });

  await Payment.create({
    order_id: order.id,
    amount: amount / 100, // store in main currency unit
    currency: currency || 'INR',
    status: 'created',
    receipt,
    notes,
    entity_type,
    entity_id,
    tenant_id,
  });

  res.status(201).json({ order_id: order.id, amount: order.amount, currency: order.currency });
}));

// Verify payment
router.post('/verify', asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const isValid = verifySignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    await Payment.findOneAndUpdate(
      { order_id: razorpay_order_id },
      { status: 'failed', error_description: 'Signature verification failed' }
    );
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  const payment = await Payment.findOneAndUpdate(
    { order_id: razorpay_order_id },
    { payment_id: razorpay_payment_id, signature: razorpay_signature, status: 'captured' },
    { new: true }
  );

  res.json({ verified: true, payment });
}));

// Webhook
router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  if (!verifyWebhookSignature(body, signature || '')) {
    logger.warn('Razorpay webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const paymentEntity = event.payload?.payment?.entity;

  if (event.event === 'payment.captured' && paymentEntity) {
    await Payment.findOneAndUpdate(
      { order_id: paymentEntity.order_id },
      { payment_id: paymentEntity.id, status: 'captured', method: paymentEntity.method, webhook_payload: event }
    );
  } else if (event.event === 'payment.failed' && paymentEntity) {
    await Payment.findOneAndUpdate(
      { order_id: paymentEntity.order_id },
      { status: 'failed', error_code: paymentEntity.error_code, error_description: paymentEntity.error_description, webhook_payload: event }
    );
  }

  res.json({ status: 'ok' });
}));

// Refund
router.post('/refund', asyncHandler(async (req, res) => {
  const { payment_id, amount } = req.body;

  if (!payment_id) {
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  const payment = await Payment.findOne({ payment_id });
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  const refund = await refundPayment(payment_id, amount);

  await Payment.findOneAndUpdate(
    { payment_id },
    { refund_id: refund.id, refund_amount: (amount || payment.amount) / 100, refund_status: refund.status, status: 'refunded' }
  );

  res.json({ refund_id: refund.id, status: refund.status });
}));

export default router;
