import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IAccessAttempt extends Document {
  user_id: mongoose.Types.ObjectId;
  resource_type: string;
  resource_id: string;
  action: string;
  permission_required: string;
  granted: boolean;
  ip_address: string;
  user_agent: string;
}

const accessAttemptSchema = new Schema<IAccessAttempt>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  resource_type: { type: String },
  resource_id: { type: String },
  action: { type: String },
  permission_required: { type: String },
  granted: { type: Boolean },
  ip_address: { type: String },
  user_agent: { type: String },
}, defaultSchemaOptions);

// Indexes
accessAttemptSchema.index({ user_id: 1 });
accessAttemptSchema.index({ granted: 1 });
accessAttemptSchema.index({ resource_type: 1, resource_id: 1 });
accessAttemptSchema.index({ created_at: -1 });
accessAttemptSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model<IAccessAttempt>('AccessAttempt', accessAttemptSchema);
