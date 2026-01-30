import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProjectBilling extends Document {
  project_id: mongoose.Types.ObjectId;
  milestone_id?: mongoose.Types.ObjectId;
  invoice_id?: mongoose.Types.ObjectId;
  billing_type: string;
  billing_percentage?: number;
  amount: number;
  retention_amount: number;
  billing_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const projectBillingSchema = new Schema<IProjectBilling>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  milestone_id: { type: Schema.Types.ObjectId, ref: 'ProjectMilestone' },
  invoice_id: { type: Schema.Types.ObjectId },
  billing_type: { type: String, required: true },
  billing_percentage: { type: Number },
  amount: { type: Number, required: true },
  retention_amount: { type: Number, default: 0 },
  billing_date: { type: Date, required: true },
  status: { type: String, default: 'draft' },
}, defaultSchemaOptions);

// Indexes
projectBillingSchema.index({ project_id: 1 });
projectBillingSchema.index({ milestone_id: 1 });
projectBillingSchema.index({ invoice_id: 1 });
projectBillingSchema.index({ status: 1 });
projectBillingSchema.index({ project_id: 1, status: 1 });
projectBillingSchema.index({ billing_date: -1 });
projectBillingSchema.index({ created_at: -1 });

export default mongoose.model<IProjectBilling>('ProjectBilling', projectBillingSchema);
