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

  // --- MEDDIC QUALIFICATION FRAMEWORK (expanded) ---
  meddic: {
    metrics: {
      defined: { type: Boolean, default: false },
      kpis: [{
        metric: { type: String },
        current_value: { type: Number },
        target_value: { type: Number },
        improvement_percentage: { type: Number },
        timeframe: { type: String },
      }],
      roi_calculated: { type: Boolean, default: false },
      roi_value: { type: Number },
      roi_timeframe_months: { type: Number },
      payback_period_months: { type: Number },
      total_cost_of_ownership: { type: Number },
      cost_of_inaction: { type: Number },
      notes: { type: String },
    },
    economic_buyer: {
      identified: { type: Boolean, default: false },
      contact_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
      name: { type: String },
      title: { type: String },
      email: { type: String },
      access_level: { type: String, enum: ['direct', 'indirect', 'none', 'pending'], default: 'pending' },
      last_interaction: { type: Date },
      relationship_strength: { type: String, enum: ['strong', 'developing', 'weak', 'none'] },
      priorities: [{ type: String }],
      concerns: [{ type: String }],
      notes: { type: String },
    },
    decision_criteria: {
      identified: { type: Boolean, default: false },
      criteria: [{
        criterion: { type: String },
        priority: { type: String, enum: ['critical', 'important', 'nice_to_have'] },
        weight: { type: Number, min: 1, max: 10 },
        our_score: { type: Number, min: 1, max: 10 },
        competitor_score: { type: Number, min: 1, max: 10 },
        notes: { type: String },
      }],
      technical_requirements: [{ type: String }],
      business_requirements: [{ type: String }],
      our_fit_assessment: { type: String, enum: ['strong', 'moderate', 'weak', 'unknown'] },
      gaps: [{ type: String }],
      differentiators: [{ type: String }],
    },
    decision_process: {
      mapped: { type: Boolean, default: false },
      steps: [{
        step_number: { type: Number },
        step_name: { type: String },
        description: { type: String },
        owner: { type: String },
        expected_date: { type: Date },
        completed: { type: Boolean, default: false },
        completed_date: { type: Date },
        outcome: { type: String },
      }],
      evaluation_method: { type: String },
      procurement_involved: { type: Boolean, default: false },
      legal_review_required: { type: Boolean, default: false },
      security_review_required: { type: Boolean, default: false },
      timeline_to_decision: { type: String },
      decision_date: { type: Date },
      go_live_date: { type: Date },
    },
    identify_pain: {
      identified: { type: Boolean, default: false },
      pains: [{
        pain: { type: String },
        severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
        business_impact: { type: String },
        quantified_cost: { type: Number },
        affected_stakeholders: [{ type: String }],
        current_workaround: { type: String },
      }],
      root_cause_identified: { type: Boolean, default: false },
      compelling_event: { type: String },
      compelling_event_date: { type: Date },
      cost_of_delay_monthly: { type: Number },
    },
    champion: {
      identified: { type: Boolean, default: false },
      contact_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
      name: { type: String },
      title: { type: String },
      email: { type: String },
      strength: { type: String, enum: ['strong', 'developing', 'weak', 'at_risk'], default: 'developing' },
      influence_level: { type: String, enum: ['high', 'medium', 'low'] },
      motivation: { type: String },
      personal_win: { type: String },
      can_access_eb: { type: Boolean, default: false },
      coaching_sessions: { type: Number, default: 0 },
      last_coached: { type: Date },
      risks: [{ type: String }],
      notes: { type: String },
    },
    scores: {
      metrics_score: { type: Number, min: 0, max: 20, default: 0 },
      economic_buyer_score: { type: Number, min: 0, max: 20, default: 0 },
      decision_criteria_score: { type: Number, min: 0, max: 15, default: 0 },
      decision_process_score: { type: Number, min: 0, max: 15, default: 0 },
      identify_pain_score: { type: Number, min: 0, max: 15, default: 0 },
      champion_score: { type: Number, min: 0, max: 15, default: 0 },
      total_score: { type: Number, min: 0, max: 100, default: 0 },
    },
    // Legacy string fields
    _legacy_metrics: { type: String },
    _legacy_economic_buyer: { type: String },
    _legacy_decision_criteria: { type: String },
    _legacy_decision_process: { type: String },
    _legacy_identify_pain: { type: String },
    _legacy_champion: { type: String },
    score: { type: Number, default: 0, min: 0, max: 100 },
  },

  // --- BUYING COMMITTEE ---
  buying_committee: [{
    contact_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
    name: { type: String },
    title: { type: String },
    email: { type: String },
    phone: { type: String },
    role: { type: String, enum: ['economic_buyer', 'technical_buyer', 'user_buyer', 'champion', 'influencer', 'blocker', 'coach', 'gatekeeper'] },
    influence_level: { type: String, enum: ['high', 'medium', 'low'] },
    stance: { type: String, enum: ['strong_advocate', 'supporter', 'neutral', 'skeptic', 'opponent'] },
    engagement_level: { type: String, enum: ['highly_engaged', 'engaged', 'passive', 'disengaged'] },
    is_primary: { type: Boolean, default: false },
    last_interaction: { type: Date },
    relationship_owner: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  }],

  // --- COMPETITOR TRACKING (expanded) ---
  competitors: [{
    name: { type: String },
    website: { type: String },
    status: { type: String, enum: ['active', 'eliminated', 'unknown', 'rumored'], default: 'active' },
    threat_level: { type: String, enum: ['high', 'medium', 'low'] },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    pricing: {
      known: { type: Boolean, default: false },
      amount: { type: Number },
      model: { type: String },
      discount_offered: { type: Number },
    },
    relationship: {
      existing_customer: { type: Boolean, default: false },
      incumbent: { type: Boolean, default: false },
      champion_inside: { type: Boolean, default: false },
    },
    our_differentiation: [{ type: String }],
    win_strategy: { type: String },
    eliminated_date: { type: Date },
    elimination_reason: { type: String },
    notes: { type: String },
  }],

  // --- DEAL HEALTH (expanded) ---
  health: {
    score: { type: Number, min: 0, max: 100, default: 50 },
    grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
    risk_factors: [{
      risk: { type: String },
      severity: { type: String, enum: ['high', 'medium', 'low'] },
      mitigation: { type: String },
      owner: { type: Schema.Types.ObjectId, ref: 'User' },
    }],
    positive_indicators: [{ type: String }],
    negative_indicators: [{ type: String }],
    days_in_stage: { type: Number, default: 0 },
    stage_age_limit: { type: Number, default: 30 },
    is_stale: { type: Boolean, default: false },
    stale_since: { type: Date },
    days_since_activity: { type: Number, default: 0 },
    days_since_customer_activity: { type: Number, default: 0 },
    last_activity_at: { type: Date },
    last_health_check: { type: Date },
    health_notes: { type: String },
  },

  // --- CLOSE / WIN-LOSS ANALYSIS (expanded) ---
  close_analysis: {
    outcome: { type: String, enum: ['won', 'lost', 'no_decision'] },
    analyzed: { type: Boolean, default: false },
    analyzed_at: { type: Date },
    analyzed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    won_reasons: [{
      reason: { type: String },
      importance: { type: String, enum: ['primary', 'secondary', 'contributing'] },
    }],
    key_differentiators: [{ type: String }],
    champion_contribution: { type: String },
    lost_reasons: [{
      reason: { type: String },
      category: { type: String, enum: ['price', 'product', 'relationship', 'timing', 'competition', 'internal', 'other'] },
      importance: { type: String, enum: ['primary', 'secondary', 'contributing'] },
    }],
    lost_to_competitor: { type: String },
    competitor_advantage: { type: String },
    what_worked: [{ type: String }],
    what_didnt_work: [{ type: String }],
    lessons_learned: { type: String },
    recommendations: { type: String },
    revisit_date: { type: Date },
    revisit_notes: { type: String },
    // Legacy
    sales_cycle_days: { type: Number },
    discount_given_percent: { type: Number },
    total_activities: { type: Number },
    key_decision_date: { type: Date },
  },

  // --- FORECAST (expanded) ---
  forecast: {
    category: { type: String, enum: ['omitted', 'pipeline', 'best_case', 'commit', 'closed_won', 'closed_lost'], default: 'pipeline' },
    confidence: { type: Number, min: 0, max: 100 },
    weighted_amount: { type: Number, default: 0 },
    expected_close_date: { type: Date },
    history: [{
      category: { type: String },
      amount: { type: Number },
      close_date: { type: Date },
      changed_at: { type: Date },
      changed_by: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
    }],
    ai_prediction: {
      win_probability: { type: Number },
      predicted_close_date: { type: Date },
      predicted_amount: { type: Number },
      confidence_level: { type: Number },
      factors: [{ type: String }],
      calculated_at: { type: Date },
    },
    // Legacy
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
dealSchema.index({ tenant_id: 1, 'forecast.category': 1 });
dealSchema.index({ tenant_id: 1, 'health.is_stale': 1 });

export const Deal = mongoose.models.Deal || mongoose.model('Deal', dealSchema);
export default Deal;
