import mongoose, { Schema, Document } from 'mongoose';

export interface IBatchRecord extends Document {
  tenant_id: mongoose.Types.ObjectId;
  formula_id: mongoose.Types.ObjectId;
  batch_number: string;
  planned_quantity: number;
  actual_quantity: number;
  yield_percentage: number;
  start_date: Date;
  end_date: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'failed' | 'quarantine';
  quality_results: {
    parameter: string;
    value: number;
    passed: boolean;
  }[];
  deviations: string[];
  operator_id: mongoose.Types.ObjectId;
  reviewed_by: mongoose.Types.ObjectId;
  reviewed_at: Date;
  created_at: Date;
  updated_at: Date;
}

const qualityResultSchema = new Schema({
  parameter: { type: String, required: true },
  value: { type: Number, required: true },
  passed: { type: Boolean, default: false },
}, { _id: false });

const batchRecordSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  formula_id: { type: Schema.Types.ObjectId, ref: 'Formula', required: true },
  batch_number: { type: String, required: true },
  planned_quantity: { type: Number, required: true },
  actual_quantity: { type: Number, default: 0 },
  yield_percentage: { type: Number, default: 0 },
  start_date: Date,
  end_date: Date,
  status: { type: String, enum: ['planned', 'in_progress', 'completed', 'failed', 'quarantine'], default: 'planned' },
  quality_results: [qualityResultSchema],
  deviations: [{ type: String }],
  operator_id: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewed_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

batchRecordSchema.index({ tenant_id: 1, batch_number: 1 }, { unique: true });
batchRecordSchema.index({ tenant_id: 1, formula_id: 1 });

export const BatchRecord = mongoose.model<IBatchRecord>('BatchRecord', batchRecordSchema);
