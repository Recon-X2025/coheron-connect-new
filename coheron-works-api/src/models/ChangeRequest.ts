import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IChangeRequest extends Document {
  project_id: mongoose.Types.ObjectId;
  change_code: string;
  change_type: string;
  title: string;
  description?: string;
  reason?: string;
  scope_impact?: string;
  cost_impact: number;
  timeline_impact_days: number;
  original_contract_value?: number;
  revised_contract_value?: number;
  requested_by?: mongoose.Types.ObjectId;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  status: string;
  approval_workflow?: any;
  implementation_date?: Date;
  created_at: Date;
  updated_at: Date;
}

const changeRequestSchema = new Schema<IChangeRequest>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  change_code: { type: String, required: true, unique: true },
  change_type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  reason: { type: String },
  scope_impact: { type: String },
  cost_impact: { type: Number, default: 0 },
  timeline_impact_days: { type: Number, default: 0 },
  original_contract_value: { type: Number },
  revised_contract_value: { type: Number },
  requested_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  status: { type: String, default: 'draft' },
  approval_workflow: { type: Schema.Types.Mixed },
  implementation_date: { type: Date },
}, defaultSchemaOptions);

// Indexes (change_code already has unique: true)
changeRequestSchema.index({ project_id: 1 });
changeRequestSchema.index({ status: 1 });
changeRequestSchema.index({ project_id: 1, status: 1 });
changeRequestSchema.index({ change_type: 1 });
changeRequestSchema.index({ requested_by: 1 });
changeRequestSchema.index({ approved_by: 1 });
changeRequestSchema.index({ created_at: -1 });

export default mongoose.models.ChangeRequest as mongoose.Model<IChangeRequest> || mongoose.model<IChangeRequest>('ChangeRequest', changeRequestSchema);
