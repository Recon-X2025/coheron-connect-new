import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

// ============================================
// SUB-SCHEMAS
// ============================================

const assignmentHistorySchema = new Schema({
  from_user: { type: Schema.Types.ObjectId, ref: 'User' },
  to_user: { type: Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String },
  assigned_at: { type: Date, default: Date.now },
}, { _id: false });

const embeddedActivitySchema = new Schema({
  type: {
    type: String,
    enum: ['call', 'email', 'meeting', 'note', 'whatsapp', 'sms', 'task', 'status_change', 'website_visit', 'email_open', 'email_click'],
  },
  subject: { type: String },
  content: { type: String },
  direction: { type: String, enum: ['inbound', 'outbound'] },
  call_duration_seconds: { type: Number },
  call_outcome: { type: String },
  email_opened: { type: Boolean },
  email_clicked: { type: Boolean },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
}, { _id: true });

// ============================================
// LEAD SCHEMA
// ============================================

const leadSchema = new Schema({
  // --- Existing fields (backward compatible) ---
  name: { type: String },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  email: { type: String },
  phone: { type: String },
  expected_revenue: { type: Number, default: 0 },
  probability: { type: Number, default: 0 },
  stage: { type: String, default: 'new' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  priority: { type: String, default: 'medium' },
  type: { type: String, default: 'lead' },
  score: { type: Number, default: 0, min: 0, max: 100 },
  converted_at: { type: Date },
  date_deadline: { type: Date },
  lost_reason: { type: String },

  // --- 1. Contact fields ---
  prefix: { type: String, enum: ['Mr', 'Ms', 'Mrs', 'Dr', ''], default: '' },
  first_name: { type: String },
  last_name: { type: String },
  secondary_email: { type: String },
  mobile: { type: String },
  whatsapp: { type: String },

  // --- 2. Company fields ---
  company_name: { type: String },
  job_title: { type: String },
  industry: { type: Schema.Types.ObjectId, ref: 'Industry' },
  company_size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
  },
  annual_revenue: { type: Number },
  website: { type: String },

  // --- 3. Qualification ---
  rating: { type: String, enum: ['hot', 'warm', 'cold'], default: 'cold' },
  score_breakdown: {
    demographic: { type: Number, default: 0 },
    behavioral: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    recency: { type: Number, default: 0 },
  },

  // --- 4. BANT qualification ---
  budget: {
    has_budget: { type: Boolean },
    amount: { type: Number },
    currency: { type: String, default: 'INR' },
    timeframe: { type: String },
  },
  authority: {
    is_decision_maker: { type: Boolean },
    decision_makers: [{ type: String }],
  },
  need: {
    pain_points: [{ type: String }],
    current_solution: { type: String },
  },
  timeline: {
    urgency: { type: String },
    expected_purchase_date: { type: Date },
  },

  // --- 5. Source tracking ---
  source: {
    type: String,
    enum: ['website', 'referral', 'linkedin', 'facebook', 'google_ads', 'cold_call', 'trade_show', 'webinar', 'partner', 'whatsapp', 'email_campaign', 'other'],
  },
  source_detail: { type: String },
  utm: {
    source: { type: String },
    medium: { type: String },
    campaign: { type: String },
    term: { type: String },
    content: { type: String },
  },

  // --- 6. Assignment ---
  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  team_id: { type: Schema.Types.ObjectId, ref: 'Team' },
  assignment_history: [assignmentHistorySchema],

  // --- 7. Activities (embedded) ---
  activities: [embeddedActivitySchema],

  // --- 8. Engagement metrics ---
  engagement: {
    total_activities: { type: Number, default: 0 },
    emails_sent: { type: Number, default: 0 },
    emails_opened: { type: Number, default: 0 },
    calls_made: { type: Number, default: 0 },
    calls_connected: { type: Number, default: 0 },
    meetings_held: { type: Number, default: 0 },
    last_activity_at: { type: Date },
  },

  // --- 9. Conversion ---
  conversion: {
    converted: { type: Boolean, default: false },
    converted_at: { type: Date },
    converted_to: {
      contact_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
      account_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
      deal_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
    },
  },

  // --- Multi-tenancy support ---
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

// ============================================
// VIRTUALS
// ============================================

leadSchema.virtual('full_name').get(function () {
  const parts = [this.first_name, this.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : this.name || '';
});

// ============================================
// INDEXES
// ============================================

// Existing indexes
leadSchema.index({ partner_id: 1 });
leadSchema.index({ user_id: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ type: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ user_id: 1, stage: 1 });
leadSchema.index({ type: 1, stage: 1 });

// New indexes
leadSchema.index({ owner_id: 1 });
leadSchema.index({ team_id: 1 });
leadSchema.index({ rating: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ 'conversion.converted': 1 });
leadSchema.index({ tenant_id: 1, email: 1 });
leadSchema.index({ tenant_id: 1, stage: 1, owner_id: 1 });
leadSchema.index({ tenant_id: 1, score: -1 });
leadSchema.index({ tenant_id: 1, source: 1, created_at: -1 });

// ============================================
// RELATED COLLECTION SCHEMAS
// ============================================

const leadActivitySchema = new Schema({
  lead_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  activity_type: { type: String },
  subject: { type: String },
  description: { type: String },
  activity_date: { type: Date, default: Date.now },
  duration_minutes: { type: Number },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

const leadScoringHistorySchema = new Schema({
  lead_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  score: { type: Number },
  scoring_rule_id: { type: Schema.Types.ObjectId },
  reason: { type: String },
}, schemaOptions);

const competitorTrackingSchema = new Schema({
  opportunity_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  competitor_name: { type: String },
  competitor_strength: { type: String },
  competitor_weakness: { type: String },
  our_competitive_advantage: { type: String },
}, schemaOptions);

const opportunityDocumentSchema = new Schema({
  opportunity_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  document_type: { type: String },
  name: { type: String },
  file_url: { type: String },
  file_path: { type: String },
  version: { type: Number, default: 1 },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

leadActivitySchema.index({ lead_id: 1 });
leadScoringHistorySchema.index({ lead_id: 1 });
competitorTrackingSchema.index({ opportunity_id: 1 });
opportunityDocumentSchema.index({ opportunity_id: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
export const LeadActivity = mongoose.model('LeadActivity', leadActivitySchema);
export const LeadScoringHistory = mongoose.model('LeadScoringHistory', leadScoringHistorySchema);
export const CompetitorTracking = mongoose.model('CompetitorTracking', competitorTrackingSchema);
export const OpportunityDocument = mongoose.model('OpportunityDocument', opportunityDocumentSchema);
