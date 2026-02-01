import mongoose from 'mongoose';
import Subscription from '../models/Subscription.js';
import SubscriptionLog from '../models/SubscriptionLog.js';
import Invoice from '../models/Invoice.js';
import documentNumberingService from './documentNumberingService.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';

export class SubscriptionService {
  computeNextBillingDate(currentDate: Date, cycle: string, billingDay: number, customDays?: number): Date {
    const d = new Date(currentDate);
    switch (cycle) {
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'semi_annual': d.setMonth(d.getMonth() + 6); break;
      case 'annual': d.setFullYear(d.getFullYear() + 1); break;
      case 'custom': d.setDate(d.getDate() + (customDays || 30)); break;
    }
    d.setDate(Math.min(billingDay, 28));
    return d;
  }

  async activateSubscription(subId: string): Promise<any> {
    const sub: any = await Subscription.findById(subId);
    if (!sub) throw new NotFoundError('Subscription');
    if (sub.status !== 'draft') throw new ValidationError('Only draft subscriptions can be activated');
    sub.status = 'active';
    sub.next_billing_date = this.computeNextBillingDate(sub.start_date, sub.billing_cycle, sub.billing_day, sub.custom_interval_days);
    await sub.save();
    await SubscriptionLog.create({ tenant_id: sub.tenant_id, subscription_id: sub._id, event_type: 'activated' });
    return sub;
  }

  async generateInvoice(subId: string): Promise<any> {
    const sub: any = await Subscription.findById(subId);
    if (!sub) throw new NotFoundError('Subscription');
    if (sub.status !== 'active') throw new ValidationError('Subscription must be active');
    const invoiceNumber = await documentNumberingService.getNextNumber(sub.tenant_id.toString(), 'invoice');
    const invoice = await Invoice.create({
      tenant_id: sub.tenant_id, name: invoiceNumber, invoice_number: invoiceNumber,
      partner_id: sub.customer_id, subscription_id: sub._id,
      invoice_date: new Date(), due_date: new Date(Date.now() + 30*24*60*60*1000),
      line_items: (sub.items || []).map((item: any) => ({
        product_id: item.product_id, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      })),
      subtotal: sub.subtotal, tax_amount: sub.tax_amount,
      amount_total: sub.total_amount, status: 'draft',
    });
    sub.last_billed_date = new Date();
    sub.next_billing_date = this.computeNextBillingDate(new Date(), sub.billing_cycle, sub.billing_day, sub.custom_interval_days);
    sub.invoices_generated = (sub.invoices_generated || 0) + 1;
    await sub.save();
    await SubscriptionLog.create({ tenant_id: sub.tenant_id, subscription_id: sub._id, event_type: 'invoiced', invoice_id: invoice._id });
    return invoice;
  }

  async pauseSubscription(subId: string): Promise<any> {
    const sub: any = await Subscription.findById(subId);
    if (!sub) throw new NotFoundError('Subscription');
    if (sub.status !== 'active') throw new ValidationError('Only active subscriptions can be paused');
    sub.status = 'paused';
    await sub.save();
    await SubscriptionLog.create({ tenant_id: sub.tenant_id, subscription_id: sub._id, event_type: 'paused' });
    return sub;
  }

  async resumeSubscription(subId: string): Promise<any> {
    const sub: any = await Subscription.findById(subId);
    if (!sub) throw new NotFoundError('Subscription');
    if (sub.status !== 'paused') throw new ValidationError('Only paused subscriptions can be resumed');
    sub.status = 'active';
    await sub.save();
    await SubscriptionLog.create({ tenant_id: sub.tenant_id, subscription_id: sub._id, event_type: 'resumed' });
    return sub;
  }

  async cancelSubscription(subId: string): Promise<any> {
    const sub: any = await Subscription.findById(subId);
    if (!sub) throw new NotFoundError('Subscription');
    if (['cancelled','expired'].includes(sub.status)) throw new ValidationError('Subscription already cancelled/expired');
    sub.status = 'cancelled';
    await sub.save();
    await SubscriptionLog.create({ tenant_id: sub.tenant_id, subscription_id: sub._id, event_type: 'cancelled' });
    return sub;
  }

  async processRenewals(tenantId: string): Promise<any[]> {
    const now = new Date();
    const subs = await Subscription.find({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      status: 'active',
      next_billing_date: { "": now },
    });
    const results: any[] = [];
    for (const sub of subs) {
      try {
        const invoice = await this.generateInvoice(sub._id.toString());
        results.push({ subscription_id: sub._id, invoice_id: invoice._id, status: 'success' });
      } catch (err: any) {
        results.push({ subscription_id: sub._id, error: err.message, status: 'failed' });
      }
    }
    return results;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
