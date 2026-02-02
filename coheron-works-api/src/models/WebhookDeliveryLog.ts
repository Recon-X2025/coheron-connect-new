import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookDeliveryLog extends Document {
  webhook_id: string;
  event_id: string;
  event_type: string;
  tenant_id: string;
  url: string;
  request_body: any;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  duration_ms: number;
  attempt: number;
  error: string | null;
  created_at: Date;
}

const WebhookDeliveryLogSchema = new Schema<IWebhookDeliveryLog>(
  {
    webhook_id: { type: String, required: true, index: true },
    event_id: { type: String, required: true },
    event_type: { type: String, required: true },
    tenant_id: { type: String, required: true, index: true },
    url: { type: String, required: true },
    request_body: { type: Schema.Types.Mixed },
    response_status: { type: Number, default: null },
    response_body: { type: String, default: null },
    success: { type: Boolean, default: false },
    duration_ms: { type: Number, default: 0 },
    attempt: { type: Number, default: 1 },
    error: { type: String, default: null },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

// TTL: auto-delete after 30 days
WebhookDeliveryLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IWebhookDeliveryLog>('WebhookDeliveryLog', WebhookDeliveryLogSchema);
