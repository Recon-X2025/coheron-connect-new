import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import documentNumberingService from './documentNumberingService.js';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';
import { withTransaction } from '../shared/utils/transaction.js';

export class PurchaseLifecycleService {
  async confirmPO(tenantId: string, poId: string): Promise<any> {
    const po: any = await PurchaseOrder.findOne({ _id: poId, tenant_id: new mongoose.Types.ObjectId(tenantId) });
    if (!po) throw new NotFoundError('PO');
    if (po.state !== 'draft') throw new ValidationError('Only draft POs can be confirmed');
    po.state = 'confirmed'; po.confirmation_date = new Date(); await po.save();
    return po;
  }

  async createGRNFromPO(tenantId: string, poId: string, receivedLines: Array<{ line_index: number; received_qty: number }>): Promise<any> {
    return withTransaction(async (session) => {
      const po: any = await PurchaseOrder.findOne({ _id: poId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!po) throw new NotFoundError('PO');
      if (!['confirmed','partially_received'].includes(po.state)) throw new ValidationError('PO must be confirmed');
      const grnNumber = await documentNumberingService.getNextNumber(tenantId, 'goods_receipt', session);
      const lines = po.lines || [];
      for (const recv of receivedLines) {
        if (lines[recv.line_index]) lines[recv.line_index].received_qty = (lines[recv.line_index].received_qty || 0) + recv.received_qty;
      }
      const allReceived = lines.every((l: any) => (l.received_qty || 0) >= l.quantity);
      po.lines = lines; po.state = allReceived ? 'received' : 'partially_received'; await po.save({ session });
      const db = mongoose.connection.db;
      await db?.collection('goods_receipts').insertOne({ tenant_id: new mongoose.Types.ObjectId(tenantId), grn_number: grnNumber, purchase_order_id: po._id, vendor_id: po.vendor_id, date: new Date(), lines: receivedLines, created_at: new Date(), updated_at: new Date() }, { session });
      return { grn_number: grnNumber, po_state: po.state };
    });
  }

  async createBillFromPO(tenantId: string, poId: string, userId: string): Promise<any> {
    return withTransaction(async (session) => {
      const po: any = await PurchaseOrder.findOne({ _id: poId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!po) throw new NotFoundError('PO');
      const billNumber = await documentNumberingService.getNextNumber(tenantId, 'invoice', session);
      const db = mongoose.connection.db;
      const total = (po.lines || []).reduce((s: number, l: any) => s + (l.received_qty || l.quantity) * l.unit_price, 0);
      await db?.collection('vendor_bills').insertOne({ tenant_id: new mongoose.Types.ObjectId(tenantId), bill_number: billNumber, type: 'vendor_bill', vendor_id: po.vendor_id, purchase_order_id: po._id, date: new Date(), due_date: new Date(Date.now()+30*24*60*60*1000), lines: (po.lines||[]).map((l:any)=>({product_id:l.product_id,description:l.description||l.product_name,quantity:l.received_qty||l.quantity,unit_price:l.unit_price,subtotal:(l.received_qty||l.quantity)*l.unit_price})), amount_total: total, status: 'draft', user_id: new mongoose.Types.ObjectId(userId), created_at: new Date(), updated_at: new Date() }, { session });
      return { bill_number: billNumber };
    });
  }
}
export const purchaseLifecycleService = new PurchaseLifecycleService();
export default purchaseLifecycleService;
