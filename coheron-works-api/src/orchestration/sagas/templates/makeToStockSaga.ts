import mongoose from 'mongoose';
import { MANUFACTURINGORDER_STARTED } from '../../events.js';
import { sagaOrchestrator } from '../../SagaOrchestrator.js';
import logger from '../../../shared/utils/logger.js';
import type { SagaDefinition } from '../../types.js';

const makeToStockSaga: SagaDefinition = {
  name: 'make-to-stock',
  description: 'Demand -> MRP -> Work Order -> Production -> QC -> Stock',
  category: 'manufacturing',
  triggerEvent: MANUFACTURINGORDER_STARTED,
  timeout_ms: 14 * 24 * 60 * 60 * 1000, // 14 days
  steps: [
    {
      name: 'validate-bom',
      async execute(context, event) {
        const { order_id } = context;
        logger.info({ orderId: order_id }, 'Make-to-stock: validating BOM');

        const db = mongoose.connection.db;
        const mo = await db?.collection('manufacturingorders').findOne({
          _id: new mongoose.Types.ObjectId(order_id),
        });

        if (!mo) return { bom_valid: false };

        if (!mo.bom_id) {
          return { bom_valid: false, error: 'No BOM linked to manufacturing order' };
        }

        const bom = await db?.collection('boms').findOne({
          _id: new mongoose.Types.ObjectId(mo.bom_id),
          active: true,
        });

        if (!bom) return { bom_valid: false, error: 'BOM not found or inactive' };

        const bomLines = await db?.collection('bomlines').find({
          bom_id: new mongoose.Types.ObjectId(bom._id),
        }).toArray() || [];

        if (bomLines.length === 0) {
          return { bom_valid: false, error: 'BOM has no component lines' };
        }

        return {
          bom_valid: true,
          bom_id: bom._id.toString(),
          product_id: mo.product_id?.toString(),
          product_qty: mo.product_qty || 0,
          component_count: bomLines.length,
          components: bomLines.map((l: any) => ({
            product_id: l.product_id?.toString(),
            qty_per_unit: l.product_qty || 0,
            qty_needed: (l.product_qty || 0) * (mo.product_qty || 1),
          })),
        };
      },
    },
    {
      name: 'reserve-raw-materials',
      async execute(context, event) {
        const { order_id, components, product_qty } = context;
        logger.info({ orderId: order_id }, 'Make-to-stock: reserving raw materials');

        if (!components?.length) return { materials_reserved: true, reserved: [] };

        const db = mongoose.connection.db;
        const reserved: string[] = [];
        const shortages: any[] = [];

        for (const comp of components) {
          const qtyNeeded = comp.qty_needed || (comp.qty_per_unit * (product_qty || 1));
          const result = await db?.collection('stockquants').updateOne(
            {
              product_id: new mongoose.Types.ObjectId(comp.product_id),
              quantity: { $gte: qtyNeeded },
            },
            { $inc: { reserved_quantity: qtyNeeded } },
          );

          if (result?.modifiedCount) {
            reserved.push(comp.product_id);
          } else {
            shortages.push({ product_id: comp.product_id, qty_needed: qtyNeeded });
          }
        }

        if (shortages.length > 0) {
          logger.warn({ orderId: order_id, shortages }, 'Make-to-stock: material shortages detected');
        }

        return { materials_reserved: true, reserved, shortages };
      },
      async compensate(context) {
        const { order_id, components, product_qty } = context;
        logger.info({ orderId: order_id }, 'Make-to-stock: releasing raw material reservation');

        if (!components?.length) return;
        const db = mongoose.connection.db;

        for (const comp of components) {
          const qtyNeeded = comp.qty_needed || (comp.qty_per_unit * (product_qty || 1));
          await db?.collection('stockquants').updateOne(
            {
              product_id: new mongoose.Types.ObjectId(comp.product_id),
              reserved_quantity: { $gte: qtyNeeded },
            },
            { $inc: { reserved_quantity: -qtyNeeded } },
          );
        }
      },
    },
    {
      name: 'issue-materials',
      async execute(context, event) {
        const { order_id, components, product_qty } = context;
        logger.info({ orderId: order_id }, 'Make-to-stock: issuing materials to production');

        if (!components?.length) return { materials_issued: true };

        const db = mongoose.connection.db;

        for (const comp of components) {
          const qtyNeeded = comp.qty_needed || (comp.qty_per_unit * (product_qty || 1));
          // Deduct from on-hand and reserved
          await db?.collection('stockquants').updateOne(
            { product_id: new mongoose.Types.ObjectId(comp.product_id) },
            {
              $inc: {
                quantity: -qtyNeeded,
                reserved_quantity: -qtyNeeded,
              },
            },
          );
        }

        // Update MO state to in_progress
        await db?.collection('manufacturingorders').updateOne(
          { _id: new mongoose.Types.ObjectId(order_id) },
          { $set: { state: 'progress', date_start: new Date(), updated_at: new Date() } },
        );

        return { materials_issued: true };
      },
    },
    {
      name: 'quality-check',
      type: 'approval',
      approval_roles: ['qc_inspector', 'quality_manager'],
      approval_timeout_action: 'escalate',
      async execute(context, event) {
        const { order_id, product_id, product_qty } = context;
        logger.info({ orderId: order_id }, 'Make-to-stock: awaiting QC approval');

        const db = mongoose.connection.db;
        // Mark MO as awaiting QC
        await db?.collection('manufacturingorders').updateOne(
          { _id: new mongoose.Types.ObjectId(order_id) },
          { $set: { state: 'to_close', updated_at: new Date() } },
        );

        return { qc_pending: true, product_id, product_qty };
      },
    },
    {
      name: 'receive-finished-goods',
      async execute(context, event) {
        const { order_id, product_id, product_qty } = context;
        logger.info({ orderId: order_id }, 'Make-to-stock: receiving finished goods into stock');

        const db = mongoose.connection.db;

        // Add finished goods to stock
        const existing = await db?.collection('stockquants').findOne({
          product_id: new mongoose.Types.ObjectId(product_id),
        });

        if (existing) {
          await db?.collection('stockquants').updateOne(
            { _id: existing._id },
            { $inc: { quantity: product_qty || 0 } },
          );
        } else {
          await db?.collection('stockquants').insertOne({
            product_id: new mongoose.Types.ObjectId(product_id),
            quantity: product_qty || 0,
            reserved_quantity: 0,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }

        // Mark MO as done
        await db?.collection('manufacturingorders').updateOne(
          { _id: new mongoose.Types.ObjectId(order_id) },
          {
            $set: {
              state: 'done',
              qty_produced: product_qty || 0,
              date_finished: new Date(),
              updated_at: new Date(),
            },
          },
        );

        return { goods_received: true, quantity: product_qty };
      },
    },
  ],
};

export function registerMakeToStockSaga(): void {
  sagaOrchestrator.registerSaga(makeToStockSaga);
}
