import mongoose from 'mongoose';
import { PURCHASEORDER_APPROVED } from '../events.js';
import { sagaOrchestrator } from '../SagaOrchestrator.js';
import logger from '../../shared/utils/logger.js';
import type { SagaDefinition } from '../types.js';

const procureToPaySaga: SagaDefinition = {
  name: 'procure-to-pay',
  description: 'PO Approved -> GRN -> Invoice Match -> Payment -> GL',
  category: 'purchasing',
  triggerEvent: PURCHASEORDER_APPROVED,
  timeout_ms: 30 * 24 * 60 * 60 * 1000, // 30 days
  steps: [
    {
      name: 'create-grn-draft',
      async execute(context, event) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Procure-to-pay: creating GRN draft from PO');

        const db = mongoose.connection.db;
        const po = await db?.collection('purchaseorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!po) return { grn_created: false };

        const count = await db?.collection('stockgrns').countDocuments({ grn_number: { $regex: /^GRN-/ } }) || 0;
        const grnNumber = `GRN-${String(count + 1).padStart(6, '0')}`;

        const grnLines = (po.order_line || []).map((line: any) => ({
          product_id: line.product_id,
          ordered_qty: line.product_uom_qty || line.quantity || 0,
          received_qty: 0,
          unit_price: line.price_unit || 0,
        }));

        const result = await db?.collection('stockgrns').insertOne({
          grn_number: grnNumber,
          partner_id: po.partner_id,
          warehouse_id: po.warehouse_id || null,
          purchase_order_id: new mongoose.Types.ObjectId(order_id),
          grn_date: new Date(),
          state: 'draft',
          lines: grnLines,
          created_at: new Date(),
          updated_at: new Date(),
        });

        return {
          grn_created: true,
          grn_id: result?.insertedId?.toString(),
          grn_number: grnNumber,
        };
      },
    },
    {
      name: 'manager-approval',
      type: 'approval',
      approval_roles: ['purchase_manager', 'manager'],
      approval_timeout_action: 'escalate',
      async execute(context, event) {
        logger.info({ orderId: context.order_id, grnNumber: context.grn_number }, 'Procure-to-pay: awaiting manager approval for GRN');
        return { approval_requested: true };
      },
    },
    {
      name: 'create-vendor-bill-draft',
      async execute(context, event) {
        const { order_id, grn_id } = context;
        logger.info({ orderId: order_id }, 'Procure-to-pay: creating vendor bill draft');

        const db = mongoose.connection.db;
        const po = await db?.collection('purchaseorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!po) return { vendor_bill_created: false };

        const amount = po.amount_total || 0;
        const billNumber = `BILL-${Date.now()}`;

        await db?.collection('vendor_bills').insertOne({
          bill_number: billNumber,
          tenant_id: po.tenant_id,
          partner_id: po.partner_id,
          purchase_order_id: new mongoose.Types.ObjectId(order_id),
          grn_id: grn_id ? new mongoose.Types.ObjectId(grn_id) : null,
          amount_total: amount,
          status: 'draft',
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        return { vendor_bill_created: true, bill_number: billNumber };
      },
    },
  ],
};

export function registerProcureToPaySaga(): void {
  sagaOrchestrator.registerSaga(procureToPaySaga);
}
