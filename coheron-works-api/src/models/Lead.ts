import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

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

const leadSchema = new Schema({
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
  score: { type: Number, default: 0 },
  converted_at: { type: Date },
  date_deadline: { type: Date },
  lost_reason: { type: String },
}, schemaOptions);

leadSchema.index({ partner_id: 1 });
leadSchema.index({ user_id: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ type: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ user_id: 1, stage: 1 });
leadSchema.index({ type: 1, stage: 1 });

leadActivitySchema.index({ lead_id: 1 });
leadScoringHistorySchema.index({ lead_id: 1 });
competitorTrackingSchema.index({ opportunity_id: 1 });
opportunityDocumentSchema.index({ opportunity_id: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
export const LeadActivity = mongoose.model('LeadActivity', leadActivitySchema);
export const LeadScoringHistory = mongoose.model('LeadScoringHistory', leadScoringHistorySchema);
export const CompetitorTracking = mongoose.model('CompetitorTracking', competitorTrackingSchema);
export const OpportunityDocument = mongoose.model('OpportunityDocument', opportunityDocumentSchema);
