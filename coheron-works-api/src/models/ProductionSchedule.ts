import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IScheduleJob {
  manufacturing_order_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  work_center_id: mongoose.Types.ObjectId;
  operation_id: mongoose.Types.ObjectId;
  sequence: number;
  planned_start: Date;
  planned_end: Date;
  duration_hours: number;
  setup_time_hours: number;
  priority: number;
  dependencies: number[];
  status: string;
}

export interface IScheduleConflict {
  type: string;
  description: string;
  job_indices: number[];
}

export interface IProductionSchedule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  schedule_name: string;
  period_start: Date;
  period_end: Date;
  status: string;
  optimization_objective: string;
  jobs: IScheduleJob[];
  total_makespan_hours: number;
  utilization_pct: number;
  changeover_count: number;
  conflicts: IScheduleConflict[];
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}
const scheduleJobSchema = new Schema<IScheduleJob>({
  manufacturing_order_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  work_center_id: { type: Schema.Types.ObjectId, ref: 'Workcenter' },
  operation_id: { type: Schema.Types.ObjectId },
  sequence: { type: Number, default: 0 },
  planned_start: { type: Date },
  planned_end: { type: Date },
  duration_hours: { type: Number, default: 0 },
  setup_time_hours: { type: Number, default: 0 },
  priority: { type: Number, default: 0 },
  dependencies: [{ type: Number }],
  status: { type: String, enum: ['pending', 'scheduled', 'in_progress', 'completed'], default: 'pending' },
}, { _id: false });
const conflictSchema = new Schema<IScheduleConflict>({
  type: { type: String, enum: ['resource_conflict', 'timeline_overlap', 'material_shortage'] },
  description: { type: String },
  job_indices: [{ type: Number }],
}, { _id: false });

const productionScheduleSchema = new Schema<IProductionSchedule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  schedule_name: { type: String, required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'optimized', 'published', 'locked'], default: 'draft' },
  optimization_objective: {
    type: String,
    enum: ['minimize_makespan', 'minimize_changeover', 'maximize_throughput', 'balance_load'],
    default: 'minimize_makespan',
  },
  jobs: [scheduleJobSchema],
  total_makespan_hours: { type: Number, default: 0 },
  utilization_pct: { type: Number, default: 0 },
  changeover_count: { type: Number, default: 0 },
  conflicts: [conflictSchema],
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

productionScheduleSchema.index({ tenant_id: 1, status: 1, period_start: 1 });

export const ProductionSchedule = mongoose.model<IProductionSchedule>('ProductionSchedule', productionScheduleSchema);
export default ProductionSchedule;
