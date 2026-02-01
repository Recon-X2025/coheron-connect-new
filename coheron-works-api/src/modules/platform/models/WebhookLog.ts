import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IWebhookLog extends Document {
  tenant_id: mongoose.Types.ObjectId;
  subscription_id: mongoose.Types.ObjectId;
  event: string;
  payload: any;
  response_status: number;
  response_body: string;
  duration_ms: number;
  attempt: number;
  status: string;
  sent_at: Date;
}

const WebhookLogSchema = new Schema<IWebhookLog>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  subscription_id: { type: Schema.Types.ObjectId, ref: 'WebhookSubscription', required: true, index: true },
  event: { type: String, required: true },
  payload: Schema.Types.Mixed,
  response_status: Number,
  response_body: String,
  duration_ms: Number,
  attempt: { type: Number, default: 1 },
  status: { type: String, enum: ['success', 'failed', 'retrying'], default: 'success' },
  sent_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

export default mongoose.model<IWebhookLog>('WebhookLog', WebhookLogSchema);
