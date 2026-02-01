import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMasterProductionSchedule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  period_type: string;
  period_start: Date;
  period_end: Date;
  forecast_demand: number;
  actual_demand: number;
  planned_production: number;
  actual_production: number;
  opening_stock: number;
  closing_stock: number;
  available_to_promise: number;
  safety_stock: number;
  status: string;
  notes?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const masterProductionScheduleSchema = new Schema<IMasterProductionSchedule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  period_type: {
    type: String,
    enum: ['weekly', 'monthly'],
    default: 'weekly',
  },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  forecast_demand: { type: Number, default: 0 },
  actual_demand: { type: Number, default: 0 },
  planned_production: { type: Number, default: 0 },
  actual_production: { type: Number, default: 0 },
  opening_stock: { type: Number, default: 0 },
  closing_stock: { type: Number, default: 0 },
  available_to_promise: { type: Number, default: 0 },
  safety_stock: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['planned', 'confirmed', 'frozen'],
    default: 'planned',
  },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

masterProductionScheduleSchema.index({ tenant_id: 1, product_id: 1, period_start: 1 });
masterProductionScheduleSchema.index({ tenant_id: 1, status: 1 });

export default mongoose.model<IMasterProductionSchedule>('MasterProductionSchedule', masterProductionScheduleSchema);
