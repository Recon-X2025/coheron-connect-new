import mongoose, { Schema, Document } from 'mongoose';

export interface IDemandPlanningRun extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'failed';
  method: string;
  parameters: any;
  products_count: number;
  started_at: Date;
  completed_at: Date;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const demandPlanningRunSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['draft', 'running', 'completed', 'failed'], default: 'draft' },
  method: { type: String, required: true },
  parameters: { type: Schema.Types.Mixed, default: {} },
  products_count: { type: Number, default: 0 },
  started_at: Date,
  completed_at: Date,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

demandPlanningRunSchema.index({ tenant_id: 1, status: 1 });

export const DemandPlanningRun = mongoose.model<IDemandPlanningRun>('DemandPlanningRun', demandPlanningRunSchema);
