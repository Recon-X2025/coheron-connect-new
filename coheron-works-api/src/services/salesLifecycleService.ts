import mongoose from 'mongoose';
import Quotation from '../models/Quotation.js';
import { SaleOrder } from '../models/SaleOrder.js';
import Invoice from '../models/Invoice.js';
import documentNumberingService from './documentNumberingService.js';
import creditLimitService from './creditLimitService.js';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';
import { withTransaction } from '../shared/utils/transaction.js';
import { eventBus } from '../orchestration/EventBus.js';
import { SALEORDER_CONFIRMED, SALEORDER_CANCELLED, INVOICE_CREATED, QUOTATION_CONVERTED } from '../orchestration/events.js';

export class SalesLifecycleService {
  async convertQuotationToOrder(tenantId: string, quotationId: string, userId: string): Promise<any> {
    return withTransaction(async (session) => {
      const quotation = await Quotation.findOne({ _id: quotationId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!quotation) throw new NotFoundError('Quotation');
      const q: any = quotation.toObject();
      if (!['draft','sent','accepted'].includes(q.state)) throw new ValidationError('Quotation cannot be converted in current state');
      const soNumber = await documentNumberingService.getNextNumber(tenantId, 'sale_order', session);
      const [saleOrder] = await SaleOrder.create([{
        tenant_id: new mongoose.Types.ObjectId(tenantId),
        name: soNumber, partner_id: q.partner_id, quotation_id: quotation._id, date_order: new Date(),
        order_line: (q.lines || []).map((l: any) => ({ product_id: l.product_id, product_uom_qty: l.quantity, price_unit: l.unit_price, price_subtotal: l.subtotal, description: l.description, hsn_code: l.hsn_code })),
        amount_total: q.grand_total || q.amount_total || 0, currency: q.currency || 'INR', state: 'draft',
        user_id: new mongoose.Types.ObjectId(userId), delivery_status: 'pending', invoice_status: 'not_invoiced', payment_status: 'unpaid',
      }], { session });
      await Quotation.updateOne({ _id: quotationId }, { $set: { state: 'converted', sale_order_id: saleOrder._id } }, { session });

      eventBus.publish(QUOTATION_CONVERTED, tenantId, {
        order_id: saleOrder._id.toString(),
        quotation_id: quotationId,
        partner_id: q.partner_id?.toString(),
        amount_total: q.grand_total || q.amount_total,
      }, { user_id: userId, source: 'salesLifecycleService' });

      return saleOrder;
    });
  }

  async confirmSaleOrder(tenantId: string, orderId: string): Promise<any> {
    return withTransaction(async (session) => {
      const order: any = await SaleOrder.findOne({ _id: orderId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!order) throw new NotFoundError('Sale order');
      if (order.state !== 'draft') throw new ValidationError('Only draft orders can be confirmed');
      if (order.partner_id) {
        const check = await creditLimitService.checkCreditLimit(tenantId, order.partner_id.toString(), order.amount_total || 0, session);
        if (!check.allowed) throw new ConflictError('Credit limit exceeded. Available: ' + check.available);
        await creditLimitService.updateCreditUsed(tenantId, order.partner_id.toString(), order.amount_total || 0, session);
      }
      order.state = 'sale'; order.confirmation_date = new Date();
      await order.save({ session });

      eventBus.publish(SALEORDER_CONFIRMED, tenantId, {
        order_id: orderId,
        partner_id: order.partner_id?.toString(),
        amount_total: order.amount_total,
        order_name: order.name,
      }, { source: 'salesLifecycleService' });

      return order;
    });
  }

  async createInvoiceFromOrder(tenantId: string, orderId: string, userId: string): Promise<any> {
    return withTransaction(async (session) => {
      const order: any = await SaleOrder.findOne({ _id: orderId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!order) throw new NotFoundError('Sale order');
      if (order.state !== 'sale') throw new ValidationError('Order must be confirmed before invoicing');
      const invoiceNumber = await documentNumberingService.getNextNumber(tenantId, 'invoice', session);
      const [invoice] = await Invoice.create([{
        tenant_id: new mongoose.Types.ObjectId(tenantId), name: invoiceNumber, invoice_number: invoiceNumber,
        partner_id: order.partner_id, sale_order_id: order._id, date: new Date(),
        due_date: new Date(Date.now() + 30*24*60*60*1000),
        line_items: (order.order_line || []).map((l: any) => ({ product_id: l.product_id, description: l.description, quantity: l.product_uom_qty, unit_price: l.price_unit, total: l.price_subtotal })),
        subtotal: order.amount_total || 0, amount_total: order.amount_total || 0, status: 'draft',
        user_id: new mongoose.Types.ObjectId(userId),
      }], { session });
      order.invoice_status = 'invoiced'; await order.save({ session });

      eventBus.publish(INVOICE_CREATED, tenantId, {
        invoice_id: invoice._id.toString(),
        partner_id: order.partner_id?.toString(),
        amount_total: order.amount_total,
        tax_amount: 0,
        invoice_name: invoice.name,
        sale_order_id: orderId,
      }, { user_id: userId, source: 'salesLifecycleService' });

      return invoice;
    });
  }

  async cancelSaleOrder(tenantId: string, orderId: string): Promise<any> {
    return withTransaction(async (session) => {
      const order: any = await SaleOrder.findOne({ _id: orderId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!order) throw new NotFoundError('Sale order');
      if (order.state === 'sale' && order.partner_id) {
        await creditLimitService.releaseCreditUsed(tenantId, order.partner_id.toString(), order.amount_total || 0, session);
      }
      order.state = 'cancel'; await order.save({ session });

      eventBus.publish(SALEORDER_CANCELLED, tenantId, {
        order_id: orderId,
        partner_id: order.partner_id?.toString(),
        amount_total: order.amount_total,
        order_name: order.name,
      }, { source: 'salesLifecycleService' });

      return order;
    });
  }
}
export const salesLifecycleService = new SalesLifecycleService();
export default salesLifecycleService;
