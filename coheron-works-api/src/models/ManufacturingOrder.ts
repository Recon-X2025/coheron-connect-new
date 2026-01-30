import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IManufacturingOrder extends Document {
  name: string;
  mo_number: string;
  product_id: mongoose.Types.ObjectId;
  product_qty: number;
  qty_produced: number;
  qty_scrapped: number;
  mo_type: string;
  priority: string;
  state: string;
  date_planned_start: Date;
  date_planned_finished: Date;
  date_start: Date;
  date_finished: Date;
  user_id: mongoose.Types.ObjectId;
  bom_id: mongoose.Types.ObjectId;
  routing_id: mongoose.Types.ObjectId;
  sale_order_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  origin: string;
  workorder_count: number;
  notes: string;
}

const manufacturingOrderSchema = new Schema<IManufacturingOrder>({
  name: { type: String },
  mo_number: { type: String, unique: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_qty: { type: Number, default: 0 },
  qty_produced: { type: Number, default: 0 },
  qty_scrapped: { type: Number, default: 0 },
  mo_type: { type: String, default: 'make_to_stock' },
  priority: { type: String, default: 'medium' },
  state: { type: String, default: 'draft' },
  date_planned_start: { type: Date },
  date_planned_finished: { type: Date },
  date_start: { type: Date },
  date_finished: { type: Date },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  bom_id: { type: Schema.Types.ObjectId, ref: 'Bom' },
  routing_id: { type: Schema.Types.ObjectId, ref: 'Routing' },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  project_id: { type: Schema.Types.ObjectId },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  origin: { type: String, default: 'manual' },
  workorder_count: { type: Number, default: 0 },
  notes: { type: String },
}, defaultSchemaOptions);

manufacturingOrderSchema.index({ mo_number: 1 }, { unique: true });
manufacturingOrderSchema.index({ state: 1 });
manufacturingOrderSchema.index({ product_id: 1 });
manufacturingOrderSchema.index({ user_id: 1 });
manufacturingOrderSchema.index({ bom_id: 1 });
manufacturingOrderSchema.index({ routing_id: 1 });
manufacturingOrderSchema.index({ sale_order_id: 1 });
manufacturingOrderSchema.index({ project_id: 1 });
manufacturingOrderSchema.index({ warehouse_id: 1 });
manufacturingOrderSchema.index({ date_planned_start: -1 });
manufacturingOrderSchema.index({ state: 1, date_planned_start: -1 });
manufacturingOrderSchema.index({ product_id: 1, state: 1 });

export default mongoose.model<IManufacturingOrder>('ManufacturingOrder', manufacturingOrderSchema);
