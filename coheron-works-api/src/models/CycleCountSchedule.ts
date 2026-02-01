import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ICycleCountSchedule extends Document {
  tenant_id: string;
  name: string;
  warehouse_id: mongoose.Types.ObjectId;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  count_type: 'full' | 'zone' | 'abc_class' | 'random_sample';
  abc_class?: 'A' | 'B' | 'C';
  zone_id?: mongoose.Types.ObjectId;
  sample_size_pct: number;
  next_scheduled_date: Date;
  last_count_date?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const cycleCountScheduleSchema = new Schema<ICycleCountSchedule>({
  tenant_id: { type: String, required: true },
  name: { type: String, required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'], required: true },
  count_type: { type: String, enum: ['full', 'zone', 'abc_class', 'random_sample'], required: true },
  abc_class: { type: String, enum: ['A', 'B', 'C'] },
  zone_id: { type: Schema.Types.ObjectId, ref: 'WarehouseZone' },
  sample_size_pct: { type: Number, default: 100 },
  next_scheduled_date: { type: Date, required: true },
  last_count_date: { type: Date },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

cycleCountScheduleSchema.index({ tenant_id: 1, warehouse_id: 1 });
cycleCountScheduleSchema.index({ next_scheduled_date: 1 });

export const CycleCountSchedule = mongoose.model<ICycleCountSchedule>('CycleCountSchedule', cycleCountScheduleSchema);
export default CycleCountSchedule;
