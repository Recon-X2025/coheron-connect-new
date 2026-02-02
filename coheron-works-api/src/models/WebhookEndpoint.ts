import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEndpoint extends Document {
  tenant_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  headers: Record<string, string>;
  last_triggered_at: Date | null;
  failure_count: number;
  created_at: Date;
  updated_at: Date;
}

const WebhookEndpointSchema = new Schema<IWebhookEndpoint>(
  {
    tenant_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    secret: { type: String, required: true },
    events: [{ type: String }],
    active: { type: Boolean, default: true },
    headers: { type: Schema.Types.Mixed, default: {} },
    last_triggered_at: { type: Date, default: null },
    failure_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

WebhookEndpointSchema.index({ tenant_id: 1, active: 1 });
WebhookEndpointSchema.index({ events: 1 });

export default mongoose.model<IWebhookEndpoint>('WebhookEndpoint', WebhookEndpointSchema);
