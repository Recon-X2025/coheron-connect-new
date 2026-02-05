import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectPurchaseRequest extends Document {
  project_id: mongoose.Types.ObjectId;
  request_code: string;
  task_id?: mongoose.Types.ObjectId;
  description: string;
  required_date?: Date;
  requested_by?: mongoose.Types.ObjectId;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const projectPurchaseRequestSchema = new Schema<IProjectPurchaseRequest>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  request_code: { type: String, required: true, unique: true },
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
  description: { type: String, required: true },
  required_date: { type: Date },
  requested_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  status: { type: String, default: 'draft' },
}, defaultSchemaOptions);

// Indexes (request_code already has unique: true)
projectPurchaseRequestSchema.index({ project_id: 1 });
projectPurchaseRequestSchema.index({ task_id: 1 });
projectPurchaseRequestSchema.index({ status: 1 });
projectPurchaseRequestSchema.index({ project_id: 1, status: 1 });
projectPurchaseRequestSchema.index({ requested_by: 1 });
projectPurchaseRequestSchema.index({ approved_by: 1 });
projectPurchaseRequestSchema.index({ created_at: -1 });

export default mongoose.models.ProjectPurchaseRequest as mongoose.Model<IProjectPurchaseRequest> || mongoose.model<IProjectPurchaseRequest>('ProjectPurchaseRequest', projectPurchaseRequestSchema);
