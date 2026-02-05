import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IWorkOrder extends Document {
  name: string;
  mo_id: mongoose.Types.ObjectId;
  operation_id: mongoose.Types.ObjectId;
  workcenter_id: mongoose.Types.ObjectId;
  sequence: number;
  state: string;
  date_planned_start: Date;
  date_planned_finished: Date;
  date_start: Date;
  date_finished: Date;
  duration_expected: number;
  duration: number;
  qty_produced: number;
  qty_producing: number;
  qty_scrapped: number;
  is_user_working: boolean;
  user_id: mongoose.Types.ObjectId;
  note: string;
  // --- Enhanced fields ---
  operations: {
    name: string;
    workcenter_id: mongoose.Types.ObjectId;
    duration_expected: number;
    duration_actual: number;
    state: string;
    started_at: Date;
    finished_at: Date;
  }[];
  material_consumption: {
    product_id: mongoose.Types.ObjectId;
    planned_qty: number;
    actual_qty: number;
    uom: string;
    warehouse_id: mongoose.Types.ObjectId;
  }[];
  tenant_id: mongoose.Types.ObjectId;
}

const workOrderSchema = new Schema<IWorkOrder>({
  name: { type: String },
  mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  operation_id: { type: Schema.Types.ObjectId, ref: 'RoutingOperation' },
  workcenter_id: { type: Schema.Types.ObjectId, ref: 'Workcenter' },
  sequence: { type: Number, default: 0 },
  state: { type: String, default: 'pending' },
  date_planned_start: { type: Date },
  date_planned_finished: { type: Date },
  date_start: { type: Date },
  date_finished: { type: Date },
  duration_expected: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  qty_produced: { type: Number, default: 0 },
  qty_producing: { type: Number, default: 0 },
  qty_scrapped: { type: Number, default: 0 },
  is_user_working: { type: Boolean, default: false },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  note: { type: String },

  // --- Operations (embedded) ---
  operations: [{
    name: { type: String },
    workcenter_id: { type: Schema.Types.ObjectId, ref: 'Workcenter' },
    duration_expected: { type: Number, default: 0 },
    duration_actual: { type: Number, default: 0 },
    state: { type: String, default: 'pending' },
    started_at: { type: Date },
    finished_at: { type: Date },
  }],

  // --- Material consumption ---
  material_consumption: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    planned_qty: { type: Number },
    actual_qty: { type: Number },
    uom: { type: String },
    warehouse_id: { type: Schema.Types.ObjectId },
  }],

  tenant_id: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

workOrderSchema.index({ mo_id: 1, sequence: 1 });
workOrderSchema.index({ state: 1 });
workOrderSchema.index({ workcenter_id: 1 });
workOrderSchema.index({ operation_id: 1 });
workOrderSchema.index({ user_id: 1 });
workOrderSchema.index({ date_planned_start: -1 });
workOrderSchema.index({ workcenter_id: 1, state: 1 });
workOrderSchema.index({ mo_id: 1, state: 1 });

export default mongoose.models.WorkOrder as mongoose.Model<IWorkOrder> || mongoose.model<IWorkOrder>('WorkOrder', workOrderSchema);
