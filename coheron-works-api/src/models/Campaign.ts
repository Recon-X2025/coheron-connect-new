import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const campaignSchema = new Schema({
  name: { type: String },
  campaign_type: { type: String, default: 'email' },
  objective: { type: String },
  state: { type: String, default: 'draft' },
  start_date: { type: Date },
  end_date: { type: Date },
  budget: { type: Number, default: 0 },
  budget_limit: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  expected_revenue: { type: Number, default: 0 },
  total_cost: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  leads_count: { type: Number, default: 0 },
  target_kpis: { type: Schema.Types.Mixed },
  audience_segment_id: { type: Schema.Types.ObjectId },
  description: { type: String },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

const campaignPerformanceSchema = new Schema({
  campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  date: { type: Date },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
}, schemaOptions);

const campaignFinancialSchema = new Schema({
  campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  transaction_date: { type: Date },
  amount: { type: Number, default: 0 },
  transaction_type: { type: String },
  description: { type: String },
}, schemaOptions);

// Campaign indexes
campaignSchema.index({ state: 1 });
campaignSchema.index({ campaign_type: 1 });
campaignSchema.index({ user_id: 1 });
campaignSchema.index({ audience_segment_id: 1 });
campaignSchema.index({ start_date: -1 });
campaignSchema.index({ state: 1, campaign_type: 1 });

// CampaignPerformance indexes
campaignPerformanceSchema.index({ campaign_id: 1 });
campaignPerformanceSchema.index({ date: -1 });
campaignPerformanceSchema.index({ campaign_id: 1, date: -1 });

// CampaignFinancial indexes
campaignFinancialSchema.index({ campaign_id: 1 });
campaignFinancialSchema.index({ transaction_date: -1 });
campaignFinancialSchema.index({ transaction_type: 1 });
campaignFinancialSchema.index({ campaign_id: 1, transaction_date: -1 });

export const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
export const CampaignPerformance = mongoose.models.CampaignPerformance || mongoose.model('CampaignPerformance', campaignPerformanceSchema);
export const CampaignFinancial = mongoose.models.CampaignFinancial || mongoose.model('CampaignFinancial', campaignFinancialSchema);
