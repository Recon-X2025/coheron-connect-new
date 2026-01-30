import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IExportApproval extends Document {
  requested_by: mongoose.Types.ObjectId;
  resource_type: string;
  record_count: number;
  filters: any;
  justification: string;
  status: string;
}

const exportApprovalSchema = new Schema<IExportApproval>({
  requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  resource_type: { type: String, required: true },
  record_count: { type: Number },
  filters: { type: Schema.Types.Mixed },
  justification: { type: String },
  status: { type: String, default: 'pending' },
}, defaultSchemaOptions);

// Indexes
exportApprovalSchema.index({ requested_by: 1 });
exportApprovalSchema.index({ status: 1 });
exportApprovalSchema.index({ resource_type: 1 });
exportApprovalSchema.index({ created_at: -1 });
exportApprovalSchema.index({ requested_by: 1, status: 1 });

export default mongoose.model<IExportApproval>('ExportApproval', exportApprovalSchema);
