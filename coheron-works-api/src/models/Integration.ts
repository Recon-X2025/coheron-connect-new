import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IIntegration extends Document {
  name: string;
  type: string;
  is_active: boolean;
  tenant_id: mongoose.Types.ObjectId;
}

const integrationSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['gmail', 'slack', 'whatsapp', 'razorpay', 's3', 'webhook', 'custom'], required: true },
  auth: {
    method: { type: String, enum: ['oauth2', 'api_key', 'basic', 'token'] },
    credentials: { type: Schema.Types.Mixed },
    token: { type: String },
    refresh_token: { type: String },
    expires_at: { type: Date },
  },
  config: { type: Schema.Types.Mixed },
  sync_settings: {
    direction: { type: String, enum: ['inbound', 'outbound', 'bidirectional'] },
    frequency: { type: String },
    last_synced_at: { type: Date },
    entities: [{ type: String }],
  },
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId, required: true },
}, schemaOptions);

integrationSchema.index({ tenant_id: 1 });
integrationSchema.index({ tenant_id: 1, type: 1 });
integrationSchema.index({ tenant_id: 1, is_active: 1 });

export const Integration = mongoose.model('Integration', integrationSchema);
export default Integration;
