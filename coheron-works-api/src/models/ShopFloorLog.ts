import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IShopFloorLog extends Document {
  tenant_id: mongoose.Types.ObjectId;
  manufacturing_order_id: mongoose.Types.ObjectId;
  work_center_id: mongoose.Types.ObjectId;
  operation_name: string;
  operator_id: mongoose.Types.ObjectId;
  action: string;
  started_at?: Date;
  ended_at?: Date;
  duration_minutes: number;
  quantity_produced: number;
  quantity_rejected: number;
  rejection_reason?: string;
  notes?: string;
  created_at: Date;
}

const shopFloorLogSchema = new Schema<IShopFloorLog>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  manufacturing_order_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  work_center_id: { type: Schema.Types.ObjectId, ref: 'Workcenter', required: true },
  operation_name: { type: String, required: true },
  operator_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  action: {
    type: String,
    enum: ['start', 'pause', 'resume', 'complete', 'reject'],
    required: true,
  },
  started_at: { type: Date },
  ended_at: { type: Date },
  duration_minutes: { type: Number, default: 0 },
  quantity_produced: { type: Number, default: 0 },
  quantity_rejected: { type: Number, default: 0 },
  rejection_reason: { type: String },
  notes: { type: String },
}, defaultSchemaOptions);

shopFloorLogSchema.index({ tenant_id: 1, manufacturing_order_id: 1 });
shopFloorLogSchema.index({ tenant_id: 1, operator_id: 1, started_at: 1 });
shopFloorLogSchema.index({ tenant_id: 1, work_center_id: 1 });

export default mongoose.model<IShopFloorLog>('ShopFloorLog', shopFloorLogSchema);
