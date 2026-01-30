import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IDataSubjectRequest extends Document {
  tenant_id: mongoose.Types.ObjectId;
  requester_email: string;
  requester_name?: string;
  request_type: 'access' | 'erasure' | 'rectification' | 'portability' | 'restriction';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  assigned_to?: mongoose.Types.ObjectId;
  due_date?: Date;
  verified_at?: Date;
  completed_at?: Date;
  rejection_reason?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const dataSubjectRequestSchema = new Schema<IDataSubjectRequest>({
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  requester_email: { type: String, required: true },
  requester_name: { type: String },
  request_type: {
    type: String,
    required: true,
    index: true,
    enum: ['access', 'erasure', 'rectification', 'portability', 'restriction'],
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected'],
    default: 'pending',
    index: true,
  },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
  due_date: { type: Date },
  verified_at: { type: Date },
  completed_at: { type: Date },
  rejection_reason: { type: String },
  notes: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

dataSubjectRequestSchema.index({ tenant_id: 1, status: 1, due_date: 1 });

export const DataSubjectRequest = mongoose.model<IDataSubjectRequest>('DataSubjectRequest', dataSubjectRequestSchema);
export default DataSubjectRequest;
