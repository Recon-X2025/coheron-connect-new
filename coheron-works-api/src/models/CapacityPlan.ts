import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ICapacityPlanMO {
  mo_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  hours_required: number;
  priority: string;
}

export interface ICapacityPlan extends Document {
  tenant_id: mongoose.Types.ObjectId;
  work_center_id: mongoose.Types.ObjectId;
  period_start: Date;
  period_end: Date;
  planned_hours: number;
  available_hours: number;
  utilization_pct: number;
  manufacturing_orders: ICapacityPlanMO[];
  overload: boolean;
  status: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const capacityPlanSchema = new Schema<ICapacityPlan>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  work_center_id: { type: Schema.Types.ObjectId, ref: 'Workcenter', required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  planned_hours: { type: Number, default: 0 },
  available_hours: { type: Number, default: 0 },
  utilization_pct: { type: Number, default: 0 },
  manufacturing_orders: [{
    mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder' },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    hours_required: { type: Number, default: 0 },
    priority: { type: String, default: 'medium' },
  }],
  overload: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['draft', 'confirmed'],
    default: 'draft',
  },
  notes: { type: String },
}, defaultSchemaOptions);

capacityPlanSchema.index({ tenant_id: 1, work_center_id: 1, period_start: 1 });

export default mongoose.models.CapacityPlan as mongoose.Model<ICapacityPlan> || mongoose.model<ICapacityPlan>('CapacityPlan', capacityPlanSchema);
