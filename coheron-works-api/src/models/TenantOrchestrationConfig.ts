import mongoose, { Schema, Document } from 'mongoose';

export interface ITenantOrchestrationConfig extends Document {
  tenant_id: string;
  enabled_modules: string[];
  event_overrides: Record<string, {
    skip_handlers?: string[];
    require_approval?: boolean;
    custom_webhook_url?: string;
  }>;
  enabled_sagas: string[];
  escalation_chain: Record<string, { levels: { role: string; timeout_ms: number }[] }>;
  created_at: Date;
  updated_at: Date;
}

const TenantOrchestrationConfigSchema = new Schema<ITenantOrchestrationConfig>(
  {
    tenant_id: { type: String, required: true, unique: true, index: true },
    enabled_modules: [{ type: String }],
    event_overrides: { type: Schema.Types.Mixed, default: {} },
    enabled_sagas: [{ type: String }],
    escalation_chain: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export default mongoose.model<ITenantOrchestrationConfig>('TenantOrchestrationConfig', TenantOrchestrationConfigSchema);
