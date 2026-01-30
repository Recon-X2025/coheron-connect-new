import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const stageHistorySchema = new Schema({
  stage: { type: String },
  entered_at: { type: Date, default: Date.now },
  exited_at: { type: Date },
  duration_seconds: { type: Number },
  changed_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const contactRoleSchema = new Schema({
  contact_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  role: { type: String, enum: ['decision_maker', 'influencer', 'champion', 'end_user', 'gatekeeper'] },
}, { _id: false });

const lineItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  tax_percent: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: true });

export interface IDeal extends Document {
  name: string;
  pipeline_id: mongoose.Types.ObjectId;
  stage_id: mongoose.Types.ObjectId;
  value: number;
  currency: string;
  probability: number;
  owner_id: mongoose.Types.ObjectId;
  tenant_id: mongoose.Types.ObjectId;
}

const dealSchema = new Schema({
  name: { type: String, required: true },
  pipeline_id: { type: Schema.Types.ObjectId, ref: 'Pipeline', required: true },
  stage_id: { type: Schema.Types.ObjectId },
  stage_history: [stageHistorySchema],
  days_in_stage: { type: Number, default: 0 },

  value: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  probability: { type: Number, default: 0 },
  weighted_value: { type: Number, default: 0 },
  mrr: { type: Number, default: 0 },
  arr: { type: Number, default: 0 },

  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  contact_ids: [contactRoleSchema],
  line_items: [lineItemSchema],

  forecast_category: { type: String, enum: ['commit', 'best_case', 'pipeline', 'omitted'], default: 'pipeline' },
  expected_close_date: { type: Date },
  actual_close_date: { type: Date },

  is_won: { type: Boolean, default: false },
  is_lost: { type: Boolean, default: false },
  win_reason: { type: String },
  lost_reason: { type: String },
  lost_competitor: { type: String },

  // --- MEDDIC qualification ---
  meddic: {
    metrics: { type: String },
    economic_buyer: { type: String },
    decision_criteria: { type: String },
    decision_process: { type: String },
    identify_pain: { type: String },
    champion: { type: String },
    score: { type: Number, default: 0, min: 0, max: 100 },
  },

  // --- Competitors ---
  competitors: [{
    name: { type: String },
    strengths: { type: String },
    weaknesses: { type: String },
    status: { type: String, enum: ['active', 'eliminated', 'unknown'], default: 'active' },
  }],

  // --- Health scoring ---
  health: {
    score: { type: Number, default: 100 },
    last_activity_at: { type: Date },
    days_since_activity: { type: Number, default: 0 },
    risk_factors: [{ type: String }],
  },

  // --- Close analysis ---
  close_analysis: {
    sales_cycle_days: { type: Number },
    discount_given_percent: { type: Number },
    total_activities: { type: Number },
    key_decision_date: { type: Date },
  },

  // --- Forecast ---
  forecast: {
    weighted_amount: { type: Number, default: 0 },
    confidence_level: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  },

  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  team_id: { type: Schema.Types.ObjectId, ref: 'Team' },
  tenant_id: { type: Schema.Types.ObjectId, required: true },
}, schemaOptions);

dealSchema.index({ tenant_id: 1, pipeline_id: 1, stage_id: 1 });
dealSchema.index({ tenant_id: 1, owner_id: 1 });
dealSchema.index({ tenant_id: 1, expected_close_date: 1 });
dealSchema.index({ tenant_id: 1, is_won: 1 });
dealSchema.index({ tenant_id: 1, is_lost: 1 });
dealSchema.index({ partner_id: 1 });

export const Deal = mongoose.model('Deal', dealSchema);
export default Deal;
