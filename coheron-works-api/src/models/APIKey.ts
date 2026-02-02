import mongoose, { Schema, Document } from 'mongoose';

export interface IAPIKey extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  key_hash: string;
  prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  usage_count: number;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_by: mongoose.Types.ObjectId;
}

const schema = new Schema<IAPIKey>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  key_hash: { type: String, required: true, unique: true },
  prefix: { type: String, required: true },
  scopes: [{ type: String }],
  rate_limit_per_minute: { type: Number, default: 60 },
  is_active: { type: Boolean, default: true },
  usage_count: { type: Number, default: 0 },
  last_used_at: { type: Date, default: null },
  expires_at: { type: Date, default: null },
  created_by: { type: Schema.Types.ObjectId },
}, { timestamps: true });

schema.index({ key_hash: 1 });
schema.index({ tenant_id: 1, is_active: 1 });

export default mongoose.model<IAPIKey>('APIKey', schema);
