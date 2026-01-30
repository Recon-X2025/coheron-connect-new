import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProjectCost extends Document {
  project_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  cost_type: string;
  description?: string;
  amount: number;
  currency: string;
  cost_date: Date;
  invoice_id?: mongoose.Types.ObjectId;
  purchase_order_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const projectCostSchema = new Schema<IProjectCost>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
  cost_type: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  cost_date: { type: Date, required: true },
  invoice_id: { type: Schema.Types.ObjectId },
  purchase_order_id: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

// Indexes
projectCostSchema.index({ project_id: 1 });
projectCostSchema.index({ task_id: 1 });
projectCostSchema.index({ cost_type: 1 });
projectCostSchema.index({ project_id: 1, cost_type: 1 });
projectCostSchema.index({ cost_date: -1 });
projectCostSchema.index({ invoice_id: 1 });
projectCostSchema.index({ purchase_order_id: 1 });
projectCostSchema.index({ created_at: -1 });

export default mongoose.model<IProjectCost>('ProjectCost', projectCostSchema);
