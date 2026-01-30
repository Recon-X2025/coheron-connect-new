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
  score_grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
  last_scored_at: { type: Date },

  // --- 4. BANT QUALIFICATION FRAMEWORK ---
  bant: {
    budget: {
      has_budget: { type: Boolean, default: false },
      amount: { type: Number },
      currency: { type: String, default: 'INR' },
      timeframe: { type: String, enum: ['immediate', 'this_quarter', 'this_year', 'next_year', 'unknown'], default: 'unknown' },
      approved: { type: Boolean, default: false },
      notes: { type: String },
    },
    authority: {
      is_decision_maker: { type: Boolean, default: false },
      role_in_decision: { type: String, enum: ['decision_maker', 'influencer', 'champion', 'blocker', 'end_user', 'evaluator'] },
      decision_makers: [{
        name: { type: String },
        title: { type: String },
        email: { type: String },
        phone: { type: String },
        linkedin: { type: String },
        influence_level: { type: String, enum: ['high', 'medium', 'low'] },
      }],
      buying_committee_size: { type: Number },
      approval_process: { type: String },
      procurement_involved: { type: Boolean, default: false },
    },
    need: {
      identified: { type: Boolean, default: false },
      pain_points: [{ type: String }],
      business_impact: { type: String },
      current_solution: { type: String },
      current_solution_cost: { type: Number },
      why_change: { type: String },
      requirements: [{
        requirement: { type: String },
        priority: { type: String, enum: ['must_have', 'nice_to_have', 'future'] },
        met: { type: Boolean, default: false },
      }],
      use_cases: [{ type: String }],
      success_criteria: [{ type: String }],
    },
    timeline: {
      urgency: { type: String, enum: ['immediate', 'this_month', 'this_quarter', 'this_half', 'this_year', 'exploring'], default: 'exploring' },
      expected_decision_date: { type: Date },
      expected_go_live_date: { type: Date },
      compelling_event: { type: String },
      blockers: [{ type: String }],
      next_steps: { type: String },
      next_meeting: { type: Date },
    },
    scores: {
      budget_score: { type: Number, min: 0, max: 25, default: 0 },
      authority_score: { type: Number, min: 0, max: 25, default: 0 },
      need_score: { type: Number, min: 0, max: 25, default: 0 },
      timeline_score: { type: Number, min: 0, max: 25, default: 0 },
      total_score: { type: Number, min: 0, max: 100, default: 0 },
    },
    qualified: { type: Boolean, default: false },
    qualification_status: { type: String, enum: ['unqualified', 'mql', 'sql', 'sal', 'opportunity', 'disqualified'], default: 'unqualified' },
    qualified_at: { type: Date },
    qualified_by: { type: Schema.Types.ObjectId, ref: 'User' },
    disqualification_reason: { type: String },
  },

  // --- Legacy BANT (kept for backward compat) ---
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
    landing_page: { type: String },
    referrer: { type: String },
    gclid: { type: String },
    fbclid: { type: String },
    li_fat_id: { type: String },
    msclkid: { type: String },
    captured_at: { type: Date, default: Date.now },
  },

  // --- 6. Assignment ---
  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  team_id: { type: Schema.Types.ObjectId, ref: 'Team' },
  assignment_history: [assignmentHistorySchema],

  // --- 7. Activities (embedded) ---
  activities: [embeddedActivitySchema],

  // --- 8. Engagement metrics (expanded) ---
  engagement: {
    total_activities: { type: Number, default: 0 },
    emails: {
      sent: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      replied: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      unsubscribed: { type: Boolean, default: false },
      last_opened_at: { type: Date },
      last_clicked_at: { type: Date },
      last_replied_at: { type: Date },
    },
    calls: {
      outbound: { type: Number, default: 0 },
      inbound: { type: Number, default: 0 },
      connected: { type: Number, default: 0 },
      duration_total_seconds: { type: Number, default: 0 },
      voicemails_left: { type: Number, default: 0 },
      last_call_at: { type: Date },
      last_connected_at: { type: Date },
    },
    meetings: {
      scheduled: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      no_shows: { type: Number, default: 0 },
      rescheduled: { type: Number, default: 0 },
      last_meeting_at: { type: Date },
      next_meeting_at: { type: Date },
    },
    whatsapp: {
      messages_sent: { type: Number, default: 0 },
      messages_received: { type: Number, default: 0 },
      last_message_at: { type: Date },
    },
    website: {
      sessions: { type: Number, default: 0 },
      page_views: { type: Number, default: 0 },
      time_on_site_seconds: { type: Number, default: 0 },
      pages_per_session: { type: Number, default: 0 },
      last_visit_at: { type: Date },
      last_pages_viewed: [{ type: String }],
    },
    content: {
      downloads: { type: Number, default: 0 },
      webinars_attended: { type: Number, default: 0 },
      videos_watched: { type: Number, default: 0 },
      blog_posts_read: { type: Number, default: 0 },
    },
    // Legacy flat fields
    emails_sent: { type: Number, default: 0 },
    emails_opened: { type: Number, default: 0 },
    emails_clicked: { type: Number, default: 0 },
    calls_made: { type: Number, default: 0 },
    calls_connected: { type: Number, default: 0 },
    meetings_held: { type: Number, default: 0 },
    meetings_scheduled: { type: Number, default: 0 },
    website_visits: { type: Number, default: 0 },
    last_activity_at: { type: Date },
    last_engagement_at: { type: Date },
    last_inbound_at: { type: Date },
    last_outbound_at: { type: Date },
    days_since_last_activity: { type: Number, default: 0 },
    engagement_score: { type: Number, min: 0, max: 100, default: 0 },
    engagement_level: { type: String, enum: ['hot', 'warm', 'cold', 'inactive'], default: 'cold' },
  },

  // --- Multi-touch Attribution (expanded) ---
  attribution: {
    first_touch: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      landing_page: { type: String },
      referrer: { type: String },
      timestamp: { type: Date },
      // Legacy
      date: { type: Date },
    },
    last_touch: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      landing_page: { type: String },
      referrer: { type: String },
      timestamp: { type: Date },
      date: { type: Date },
    },
    lead_creation_touch: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      landing_page: { type: String },
      timestamp: { type: Date },
    },
    touchpoints: [{
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      page_url: { type: String },
      event_type: { type: String },
      event_value: { type: Number },
      timestamp: { type: Date },
      date: { type: Date },
    }],
    total_touchpoints: { type: Number, default: 0 },
    days_to_conversion: { type: Number },
    conversion_path_summary: { type: String },
  },

  // --- Lead Enrichment ---
  enrichment: {
    status: { type: String, enum: ['pending', 'enriched', 'failed', 'not_found'], default: 'pending' },
    enriched_at: { type: Date },
    source: { type: String },
    confidence_score: { type: Number },
    company: {
      legal_name: { type: String },
      domain: { type: String },
      industry: { type: String },
      sub_industry: { type: String },
      sector: { type: String },
      sic_code: { type: String },
      naics_code: { type: String },
      employee_count: { type: Number },
      employee_range: { type: String },
      annual_revenue: { type: Number },
      revenue_range: { type: String },
      funding_total: { type: Number },
      funding_stage: { type: String },
      founded_year: { type: Number },
      company_type: { type: String },
      location: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postal_code: { type: String },
        country: { type: String },
        timezone: { type: String },
      },
      technologies: [{ type: String }],
      tech_categories: [{ type: String }],
      social: {
        linkedin_url: { type: String },
        linkedin_id: { type: String },
        twitter_url: { type: String },
        twitter_handle: { type: String },
        facebook_url: { type: String },
        crunchbase_url: { type: String },
      },
      description: { type: String },
      logo_url: { type: String },
      website_title: { type: String },
    },
    person: {
      full_name: { type: String },
      first_name: { type: String },
      last_name: { type: String },
      job_title: { type: String },
      job_function: { type: String },
      seniority: { type: String, enum: ['c_level', 'vp', 'director', 'manager', 'senior', 'entry'] },
      department: { type: String },
      linkedin_url: { type: String },
      linkedin_id: { type: String },
      twitter_url: { type: String },
      github_url: { type: String },
      bio: { type: String },
      avatar_url: { type: String },
      work_email_valid: { type: Boolean },
      personal_email: { type: String },
      phone_direct: { type: String },
      phone_mobile: { type: String },
    },
  },

  // --- Qualification status ---
  qualification_status: { type: String, enum: ['unqualified', 'in_progress', 'qualified', 'disqualified'], default: 'unqualified' },
  disqualification_reason: { type: String },

  // --- Duplicate detection (expanded) ---
  potential_duplicates: [{ type: Schema.Types.ObjectId, ref: 'Lead' }],
  duplicates: {
    checked_at: { type: Date },
    has_duplicates: { type: Boolean, default: false },
    potential_matches: [{
      entity_type: { type: String, enum: ['lead', 'contact', 'deal'] },
      entity_id: { type: Schema.Types.ObjectId },
      match_score: { type: Number, min: 0, max: 100 },
      match_fields: [{ type: String }],
      reviewed: { type: Boolean, default: false },
      reviewed_at: { type: Date },
      reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
      action_taken: { type: String, enum: ['merged', 'not_duplicate', 'pending'] },
    }],
    merged_from: [{ type: Schema.Types.ObjectId, ref: 'Lead' }],
    merged_into: { type: Schema.Types.ObjectId, ref: 'Lead' },
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
leadSchema.index({ tenant_id: 1, 'bant.qualification_status': 1 });
leadSchema.index({ tenant_id: 1, 'utm.source': 1, 'utm.campaign': 1 });
leadSchema.index({ tenant_id: 1, 'engagement.last_activity_at': 1 });
leadSchema.index({ tenant_id: 1, 'engagement.engagement_level': 1 });

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
