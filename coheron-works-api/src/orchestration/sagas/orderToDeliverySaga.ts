import mongoose from 'mongoose';
import { SALEORDER_CONFIRMED } from '../events.js';
import { sagaOrchestrator } from '../SagaOrchestrator.js';
import logger from '../../shared/utils/logger.js';
import type { SagaDefinition } from '../types.js';

const orderToDeliverySaga: SagaDefinition = {
  name: 'order-to-delivery',
  description: 'Confirmed order -> Reserve stock -> Create picking task',
  category: 'sales',
  triggerEvent: SALEORDER_CONFIRMED,
  timeout_ms: 24 * 60 * 60 * 1000, // 24 hours
  steps: [
    {
      name: 'reserve-stock',
      async execute(context, event) {
        const { order_id, partner_id } = context;
        logger.info({ orderId: order_id }, 'Reserving stock for confirmed order');

        // Load the order's line items and reserve stock via StockQuant
        const db = mongoose.connection.db;
        const order = await db?.collection('saleorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!order?.order_line?.length) {
          return { stock_reserved: true, reserved_products: [] };
        }

        const reservedProducts: string[] = [];
        for (const line of order.order_line) {
          if (!line.product_id) continue;
          // Increment reserved_quantity on the first matching quant
          const result = await db?.collection('stockquants').updateOne(
            {
              product_id: new mongoose.Types.ObjectId(line.product_id),
              quantity: { $gte: line.product_uom_qty || 0 },
            },
            {
              $inc: { reserved_quantity: line.product_uom_qty || 0 },
            },
          );
          if (result?.modifiedCount) {
            reservedProducts.push(line.product_id.toString());
          }
        }

        return { stock_reserved: true, reserved_products: reservedProducts };
      },
      async compensate(context) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Releasing stock reservation for order');

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
            {
              $inc: { reserved_quantity: -(line.product_uom_qty || 0) },
            },
          );
        }
      },
    },
    {
      name: 'create-picking-task',
      async execute(context, event) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Creating picking task for order');

        const db = mongoose.connection.db;
        const order = await db?.collection('saleorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!order?.order_line?.length) {
          return { picking_created: false };
        }

        // Create picking tasks for each line item
        const pickingTasks = order.order_line
          .filter((l: any) => l.product_id)
          .map((line: any) => ({
            product_id: new mongoose.Types.ObjectId(line.product_id),
            quantity: line.product_uom_qty || 0,
            sale_order_id: new mongoose.Types.ObjectId(order_id),
            state: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
          }));

        if (pickingTasks.length > 0) {
          await db?.collection('pickingtasks').insertMany(pickingTasks);
        }

        return { picking_created: true, picking_count: pickingTasks.length };
      },
    },
  ],
};

export function registerOrderToDeliverySaga(): void {
  sagaOrchestrator.registerSaga(orderToDeliverySaga);
}
