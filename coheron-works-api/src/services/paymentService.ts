import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from '../utils/logger.js';

let razorpayInstance: any = null;

function getRazorpay() {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }
  return razorpayInstance;
}

export interface CreateOrderOptions {
  amount: number; // in smallest currency unit (paise for INR)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export async function createOrder(options: CreateOrderOptions) {
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: options.amount,
    currency: options.currency || 'INR',
    receipt: options.receipt,
    notes: options.notes,
  });
  logger.info({ orderId: order.id, amount: options.amount }, 'Razorpay order created');
  return order;
}

export function verifySignature(params: {
  order_id: string;
  payment_id: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const body = `${params.order_id}|${params.payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === params.signature;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

export async function refundPayment(paymentId: string, amount?: number) {
  const razorpay = getRazorpay();
  const refund = await razorpay.payments.refund(paymentId, {
    ...(amount ? { amount } : {}),
  });
  logger.info({ paymentId, refundId: refund.id }, 'Razorpay refund initiated');
  return refund;
}
