import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IWebhookSubscription extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  url: string;
  events: string[];
  secret: string;
  headers: any;
  is_active: boolean;
  retry_policy: {
    max_retries: number;
    backoff_seconds: number;
  };
  last_triggered_at: Date;
  success_count: number;
  failure_count: number;
  created_by: mongoose.Types.ObjectId;
}

const WebhookSubscriptionSchema = new Schema<IWebhookSubscription>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  events: [{ type: String }],
  secret: String,
  headers: Schema.Types.Mixed,
  is_active: { type: Boolean, default: true },
  retry_policy: {
    max_retries: { type: Number, default: 3 },
    backoff_seconds: { type: Number, default: 30 },
  },
  last_triggered_at: Date,
  success_count: { type: Number, default: 0 },
  failure_count: { type: Number, default: 0 },
  created_by: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

export default mongoose.model<IWebhookSubscription>('WebhookSubscription', WebhookSubscriptionSchema);
