import mongoose from 'mongoose';
import { QUOTATION_CONVERTED } from '../../events.js';
import { sagaOrchestrator } from '../../SagaOrchestrator.js';
import logger from '../../../shared/utils/logger.js';
import type { SagaDefinition } from '../../types.js';

const orderToCashSaga: SagaDefinition = {
  name: 'order-to-cash',
  description: 'Quote -> Order -> Pick/Pack -> Ship -> Invoice -> Payment -> GL',
  category: 'sales',
  triggerEvent: QUOTATION_CONVERTED,
  timeout_ms: 7 * 24 * 60 * 60 * 1000, // 7 days
  steps: [
    {
      name: 'confirm-order',
      async execute(context, event) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Order-to-cash: confirming order');

        const db = mongoose.connection.db;
        const order = await db?.collection('saleorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!order) return { order_confirmed: false };

        await db?.collection('saleorders').updateOne(
          { _id: order._id },
          { $set: { state: 'sale', updated_at: new Date() } },
        );

        return {
          order_confirmed: true,
          partner_id: order.partner_id?.toString(),
          amount_total: order.amount_total || 0,
        };
      },
      async compensate(context) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Order-to-cash: reverting order to draft');
        const db = mongoose.connection.db;
        await db?.collection('saleorders').updateOne(
          { _id: new mongoose.Types.ObjectId(order_id) },
          { $set: { state: 'draft', updated_at: new Date() } },
        );
      },
    },
    {
      name: 'reserve-inventory',
      async execute(context, event) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Order-to-cash: reserving inventory');

        const db = mongoose.connection.db;
        const order = await db?.collection('saleorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!order?.order_line?.length) {
          return { inventory_reserved: true, reserved_products: [] };
        }

        const reservedProducts: string[] = [];
        for (const line of order.order_line) {
          if (!line.product_id) continue;
          const result = await db?.collection('stockquants').updateOne(
            {
              product_id: new mongoose.Types.ObjectId(line.product_id),
              quantity: { $gte: line.product_uom_qty || 0 },
            },
            { $inc: { reserved_quantity: line.product_uom_qty || 0 } },
          );
          if (result?.modifiedCount) {
            reservedProducts.push(line.product_id.toString());
          }
        }

        return { inventory_reserved: true, reserved_products: reservedProducts };
      },
      async compensate(context) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Order-to-cash: releasing inventory reservation');
        const db = mongoose.connection.db;
        const order = await db?.collection('saleorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });
        if (!order?.order_line?.length) return;

        for (const line of order.order_line) {
          if (!line.product_id) continue;
          await db?.collection('stockquants').updateOne(
            {
              product_id: new mongoose.Types.ObjectId(line.product_id),
              reserved_quantity: { $gte: line.product_uom_qty || 0 },
            },
            { $inc: { reserved_quantity: -(line.product_uom_qty || 0) } },
          );
        }
      },
    },
    {
      name: 'create-picking-task',
      async execute(context, event) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Order-to-cash: creating picking tasks');

        const db = mongoose.connection.db;
        const order = await db?.collection('saleorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!order?.order_line?.length) return { picking_created: false };

        const tasks = order.order_line
          .filter((l: any) => l.product_id)
          .map((line: any) => ({
            product_id: new mongoose.Types.ObjectId(line.product_id),
            quantity_requested: line.product_uom_qty || 0,
            quantity_picked: 0,
            sale_order_id: new mongoose.Types.ObjectId(order_id),
            state: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
          }));

        if (tasks.length > 0) {
          await db?.collection('pickingtasks').insertMany(tasks);
        }

        return { picking_created: true, picking_count: tasks.length };
      },
    },
    {
      name: 'create-delivery-order',
      async execute(context, event) {
        const { order_id, partner_id } = context;
        logger.info({ orderId: order_id }, 'Order-to-cash: creating delivery order');

        const db = mongoose.connection.db;
        const order = await db?.collection('saleorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!order?.order_line?.length) return { delivery_created: false };

        const count = await db?.collection('deliveryorders').countDocuments({ delivery_number: { $regex: /^DEL-/ } }) || 0;
        const deliveryNumber = `DEL-${String(count + 1).padStart(6, '0')}`;

        const deliveryLines = order.order_line
          .filter((l: any) => l.product_id)
          .map((line: any, idx: number) => ({
            product_id: new mongoose.Types.ObjectId(line.product_id),
            quantity_ordered: line.product_uom_qty || 0,
            quantity_delivered: 0,
            quantity_pending: line.product_uom_qty || 0,
          }));

        const result = await db?.collection('deliveryorders').insertOne({
          delivery_number: deliveryNumber,
          sale_order_id: new mongoose.Types.ObjectId(order_id),
          partner_id: order.partner_id,
          delivery_date: new Date(),
          status: 'pending',
          delivery_lines: deliveryLines,
          created_at: new Date(),
          updated_at: new Date(),
        });

        return {
          delivery_created: true,
          delivery_id: result?.insertedId?.toString(),
          delivery_number: deliveryNumber,
        };
      },
    },
    {
      name: 'generate-invoice',
      async execute(context, event) {
        const { order_id, amount_total, partner_id } = context;
        logger.info({ orderId: order_id }, 'Order-to-cash: generating invoice');

        const db = mongoose.connection.db;
        const order = await db?.collection('saleorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!order) return { invoice_generated: false };

        const count = await db?.collection('invoices').countDocuments({ invoice_number: { $regex: /^INV-/ } }) || 0;
        const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

        const lineItems = (order.order_line || [])
          .filter((l: any) => l.product_id)
          .map((line: any) => ({
            product_id: line.product_id,
            quantity: line.product_uom_qty || 0,
            unit_price: line.price_unit || 0,
            total: line.price_subtotal || 0,
          }));

        const result = await db?.collection('invoices').insertOne({
          name: invoiceNumber,
          invoice_number: invoiceNumber,
          partner_id: order.partner_id,
          invoice_date: new Date(),
          move_type: 'out_invoice',
          amount_total: order.amount_total || 0,
          amount_residual: order.amount_total || 0,
          payment_state: 'not_paid',
          state: 'draft',
          line_items: lineItems,
          sale_order_id: new mongoose.Types.ObjectId(order_id),
          tenant_id: order.tenant_id,
          created_at: new Date(),
          updated_at: new Date(),
        });

        return {
          invoice_generated: true,
          invoice_id: result?.insertedId?.toString(),
          invoice_number: invoiceNumber,
        };
      },
      async compensate(context) {
        const { invoice_id } = context;
        if (!invoice_id) return;
        logger.info({ invoiceId: invoice_id }, 'Order-to-cash: cancelling invoice');
        const db = mongoose.connection.db;
        await db?.collection('invoices').updateOne(
          { _id: new mongoose.Types.ObjectId(invoice_id) },
          { $set: { state: 'cancel', updated_at: new Date() } },
        );
      },
    },
  ],
};

export function registerOrderToCashSaga(): void {
  sagaOrchestrator.registerSaga(orderToCashSaga);
}
