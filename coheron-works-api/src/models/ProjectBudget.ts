import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectBudget extends Document {
  project_id: mongoose.Types.ObjectId;
  budget_type: string;
  category?: string;
  planned_amount: number;
  committed_amount: number;
  actual_amount: number;
  revision_number?: number;
  status: string;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const projectBudgetSchema = new Schema<IProjectBudget>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  budget_type: { type: String, required: true },
  category: { type: String },
  planned_amount: { type: Number, default: 0 },
  committed_amount: { type: Number, default: 0 },
  actual_amount: { type: Number, default: 0 },
  revision_number: { type: Number },
  status: { type: String, default: 'draft' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
}, defaultSchemaOptions);

// Indexes
projectBudgetSchema.index({ project_id: 1 });
projectBudgetSchema.index({ status: 1 });
projectBudgetSchema.index({ project_id: 1, status: 1 });
projectBudgetSchema.index({ approved_by: 1 });
projectBudgetSchema.index({ budget_type: 1 });
projectBudgetSchema.index({ created_at: -1 });

export default mongoose.model<IProjectBudget>('ProjectBudget', projectBudgetSchema);
