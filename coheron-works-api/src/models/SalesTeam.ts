import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const salesTeamMemberSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, default: 'rep' },
  is_active: { type: Boolean, default: true },
  joined_date: { type: Date, default: Date.now },
});

const salesTeamSchema = new Schema({
  name: { type: String },
  code: { type: String },
  manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
  description: { type: String },
  is_active: { type: Boolean, default: true },
  team_members: [salesTeamMemberSchema],
}, schemaOptions);

const salesIncentiveSchema = new Schema({
  name: { type: String },
  incentive_type: { type: String },
  calculation_method: { type: String },
  calculation_formula: { type: String },
  conditions: { type: Schema.Types.Mixed },
  amount_percentage: { type: Number },
  fixed_amount: { type: Number },
  tier_rules: { type: Schema.Types.Mixed },
  valid_from: { type: Date },
  valid_until: { type: Date },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

const salesIncentivePaymentSchema = new Schema({
  incentive_id: { type: Schema.Types.ObjectId, ref: 'SalesIncentive' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  period_start: { type: Date },
  period_end: { type: Date },
  base_amount: { type: Number },
  incentive_amount: { type: Number },
  payment_status: { type: String, default: 'pending' },
}, schemaOptions);

const salesActivityKpiSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  period_start: { type: Date },
  period_end: { type: Date },
  calls_made: { type: Number, default: 0 },
  emails_sent: { type: Number, default: 0 },
  meetings_held: { type: Number, default: 0 },
  leads_created: { type: Number, default: 0 },
  opportunities_created: { type: Number, default: 0 },
  quotes_sent: { type: Number, default: 0 },
  orders_won: { type: Number, default: 0 },
  orders_lost: { type: Number, default: 0 },
}, schemaOptions);

// SalesTeam indexes
salesTeamSchema.index({ manager_id: 1 });
salesTeamSchema.index({ is_active: 1 });

// SalesIncentive indexes
salesIncentiveSchema.index({ is_active: 1 });
salesIncentiveSchema.index({ incentive_type: 1 });

// SalesIncentivePayment indexes
salesIncentivePaymentSchema.index({ incentive_id: 1 });
salesIncentivePaymentSchema.index({ user_id: 1 });
salesIncentivePaymentSchema.index({ sale_order_id: 1 });
salesIncentivePaymentSchema.index({ payment_status: 1 });
salesIncentivePaymentSchema.index({ user_id: 1, payment_status: 1 });

// SalesActivityKpi indexes
salesActivityKpiSchema.index({ user_id: 1 });
salesActivityKpiSchema.index({ period_start: 1, period_end: 1 });

export const SalesTeam = mongoose.models.SalesTeam || mongoose.model('SalesTeam', salesTeamSchema);
export const SalesIncentive = mongoose.models.SalesIncentive || mongoose.model('SalesIncentive', salesIncentiveSchema);
export const SalesIncentivePayment = mongoose.models.SalesIncentivePayment || mongoose.model('SalesIncentivePayment', salesIncentivePaymentSchema);
export const SalesActivityKpi = mongoose.models.SalesActivityKpi || mongoose.model('SalesActivityKpi', salesActivityKpiSchema);
