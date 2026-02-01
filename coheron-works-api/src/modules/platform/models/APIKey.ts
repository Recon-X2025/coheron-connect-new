import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IAPIKey extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  key_hash: string;
  prefix: string;
  permissions: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at: Date;
  expires_at: Date;
  created_by: mongoose.Types.ObjectId;
}

const APIKeySchema = new Schema<IAPIKey>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  key_hash: { type: String, required: true },
  prefix: { type: String, required: true },
  permissions: [{ type: String }],
  rate_limit_per_minute: { type: Number, default: 60 },
  is_active: { type: Boolean, default: true },
  last_used_at: Date,
  expires_at: Date,
  created_by: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

export default mongoose.model<IAPIKey>('APIKey', APIKeySchema);
