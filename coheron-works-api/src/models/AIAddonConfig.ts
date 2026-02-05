import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret.api_key; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret.api_key; return ret; } }
};

export interface IAIFeaturesEnabled {
  copilot_chat: boolean;
  sales_qualification: boolean;
  deal_risk_detection: boolean;
  predictive_scoring: boolean;
  document_parsing: boolean;
  bookkeeping_agent: boolean;
  cashflow_forecast: boolean;
  cv_parsing: boolean;
  chatbot: boolean;
  status_reports: boolean;
  marketing_agents: boolean;
  negative_scoring: boolean;
  lookalike_lists: boolean;
}
export interface IAIAddonConfig extends Document {
  tenant_id: mongoose.Types.ObjectId;
  is_enabled: boolean;
  provider: 'openai' | 'anthropic' | 'ollama' | 'azure_openai';
  api_key: string;
  model_name: string;
  base_url: string;
  max_tokens_per_request: number;
  monthly_token_limit: number;
  tokens_used_this_month: number;
  billing_cycle_start: Date;
  features_enabled: IAIFeaturesEnabled;
  created_at: Date;
  updated_at: Date;
}

const featuresEnabledSchema = new Schema({
  copilot_chat: { type: Boolean, default: false },
  sales_qualification: { type: Boolean, default: false },
  deal_risk_detection: { type: Boolean, default: false },
  predictive_scoring: { type: Boolean, default: false },
  document_parsing: { type: Boolean, default: false },
  bookkeeping_agent: { type: Boolean, default: false },
  cashflow_forecast: { type: Boolean, default: false },
  cv_parsing: { type: Boolean, default: false },
  chatbot: { type: Boolean, default: false },
  status_reports: { type: Boolean, default: false },
  marketing_agents: { type: Boolean, default: false },
  negative_scoring: { type: Boolean, default: false },
  lookalike_lists: { type: Boolean, default: false },
}, { _id: false });
const aiAddonConfigSchema = new Schema<IAIAddonConfig>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  is_enabled: { type: Boolean, default: false },
  provider: { type: String, enum: ['openai', 'anthropic', 'ollama', 'azure_openai'], default: 'openai' },
  api_key: { type: String, default: '' },
  model_name: { type: String, default: 'gpt-4o' },
  base_url: { type: String, default: '' },
  max_tokens_per_request: { type: Number, default: 4096 },
  monthly_token_limit: { type: Number, default: 1000000 },
  tokens_used_this_month: { type: Number, default: 0 },
  billing_cycle_start: { type: Date, default: () => new Date() },
  features_enabled: { type: featuresEnabledSchema, default: () => ({}) },
}, schemaOptions);

aiAddonConfigSchema.index({ tenant_id: 1 }, { unique: true });

export default mongoose.models.AIAddonConfig as mongoose.Model<IAIAddonConfig> || mongoose.model<IAIAddonConfig>('AIAddonConfig', aiAddonConfigSchema);
