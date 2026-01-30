import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const contractLineSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number },
  total_price: { type: Number },
  billing_frequency: { type: String },
});

const contractSchema = new Schema({
  contract_number: { type: String, unique: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  contract_type: { type: String },
  start_date: { type: Date },
  end_date: { type: Date },
  renewal_date: { type: Date },
  auto_renew: { type: Boolean, default: false },
  billing_cycle: { type: String, default: 'monthly' },
  contract_value: { type: Number },
  currency: { type: String, default: 'INR' },
  terms_and_conditions: { type: String },
  status: { type: String, default: 'draft' },
  signed_at: { type: Date },
  signed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  esign_document_id: { type: String },
  contract_lines: [contractLineSchema],
}, schemaOptions);

contractSchema.index({ partner_id: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ contract_type: 1 });
contractSchema.index({ end_date: 1 });
contractSchema.index({ partner_id: 1, status: 1 });

const slaSchema = new Schema({
  name: { type: String },
  contract_id: { type: Schema.Types.ObjectId, ref: 'Contract' },
  sla_type: { type: String },
  target_value: { type: Number },
  unit: { type: String },
  penalty_per_violation: { type: Number, default: 0 },
  credit_per_violation: { type: Number, default: 0 },
  measurement_period: { type: String, default: 'monthly' },
}, schemaOptions);

slaSchema.index({ contract_id: 1 });

const slaPerformanceSchema = new Schema({
  sla_id: { type: Schema.Types.ObjectId, ref: 'Sla' },
  contract_id: { type: Schema.Types.ObjectId, ref: 'Contract' },
  measurement_date: { type: Date },
  actual_value: { type: Number },
  target_value: { type: Number },
  is_violated: { type: Boolean, default: false },
  violation_count: { type: Number, default: 0 },
  penalty_applied: { type: Number, default: 0 },
  credit_applied: { type: Number, default: 0 },
}, schemaOptions);

slaPerformanceSchema.index({ sla_id: 1 });
slaPerformanceSchema.index({ contract_id: 1 });
slaPerformanceSchema.index({ measurement_date: -1 });

const subscriptionSchema = new Schema({
  subscription_number: { type: String, unique: true },
  contract_id: { type: Schema.Types.ObjectId, ref: 'Contract' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  subscription_plan: { type: String },
  billing_cycle: { type: String },
  unit_price: { type: Number },
  quantity: { type: Number, default: 1 },
  total_price: { type: Number },
  start_date: { type: Date },
  end_date: { type: Date },
  next_billing_date: { type: Date },
  auto_renew: { type: Boolean, default: true },
  status: { type: String, default: 'active' },
  cancellation_reason: { type: String },
  cancelled_at: { type: Date },
}, schemaOptions);

subscriptionSchema.index({ contract_id: 1 });
subscriptionSchema.index({ partner_id: 1 });
subscriptionSchema.index({ product_id: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ partner_id: 1, status: 1 });

const usageBillingRuleSchema = new Schema({
  subscription_id: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  metric_name: { type: String },
  unit_price: { type: Number },
  included_units: { type: Number, default: 0 },
  overage_price: { type: Number },
  billing_frequency: { type: String, default: 'monthly' },
}, schemaOptions);

usageBillingRuleSchema.index({ subscription_id: 1 });

export const Contract = mongoose.model('Contract', contractSchema);
export const Sla = mongoose.model('Sla', slaSchema);
export const SlaPerformance = mongoose.model('SlaPerformance', slaPerformanceSchema);
export const Subscription = mongoose.model('Subscription', subscriptionSchema);
export const UsageBillingRule = mongoose.model('UsageBillingRule', usageBillingRuleSchema);
