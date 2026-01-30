import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IFieldAccessLog extends Document {
  user_id: mongoose.Types.ObjectId;
  resource_type: string;
  resource_id: string;
  field_name: string;
  action: string;
  old_value: string;
  new_value: string;
  ip_address: string;
  user_agent: string;
}

const fieldAccessLogSchema = new Schema<IFieldAccessLog>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  resource_type: { type: String },
  resource_id: { type: String },
  field_name: { type: String },
  action: { type: String },
  old_value: { type: String },
  new_value: { type: String },
  ip_address: { type: String },
  user_agent: { type: String },
}, defaultSchemaOptions);

// Indexes
fieldAccessLogSchema.index({ user_id: 1 });
fieldAccessLogSchema.index({ resource_type: 1, resource_id: 1 });
fieldAccessLogSchema.index({ action: 1 });
fieldAccessLogSchema.index({ created_at: -1 });
fieldAccessLogSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model<IFieldAccessLog>('FieldAccessLog', fieldAccessLogSchema);
