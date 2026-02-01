import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const discountApprovalSchema = new Schema({
  quote_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  requested_by: { type: Schema.Types.ObjectId, ref: 'User' },
  discount_percentage: { type: Number },
  original_amount: { type: Number },
  discounted_amount: { type: Number },
  justification: { type: String },
  status: { type: String, default: 'pending' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String },
}, schemaOptions);

const territorySchema = new Schema({
  name: { type: String },
  is_active: { type: Boolean, default: true },
  zip_codes: [{ type: String }],
  states: [{ type: String }],
  countries: [{ type: String }],
  industries: [{ type: String }],
  company_sizes: [{ type: String }],
}, schemaOptions);

const userTerritorySchema = new Schema({
  territory_id: { type: Schema.Types.ObjectId, ref: 'Territory' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  is_primary: { type: Boolean, default: false },
  assigned_by: { type: Schema.Types.ObjectId, ref: 'User' },
  assigned_at: { type: Date, default: Date.now },
}, schemaOptions);

const exportApprovalSchema = new Schema({
  requested_by: { type: Schema.Types.ObjectId, ref: 'User' },
  resource_type: { type: String },
  record_count: { type: Number },
  filters: { type: Schema.Types.Mixed },
  justification: { type: String },
  status: { type: String, default: 'pending' },
}, schemaOptions);

const discountThresholdSchema = new Schema({
  discount_min: { type: Number },
  discount_max: { type: Number },
  approval_role: { type: String },
}, schemaOptions);

// DiscountApproval indexes
discountApprovalSchema.index({ quote_id: 1 });
discountApprovalSchema.index({ requested_by: 1 });
discountApprovalSchema.index({ approved_by: 1 });
discountApprovalSchema.index({ status: 1 });

// UserTerritory indexes
userTerritorySchema.index({ territory_id: 1 });
userTerritorySchema.index({ user_id: 1 });
userTerritorySchema.index({ territory_id: 1, user_id: 1 });

// ExportApproval indexes
exportApprovalSchema.index({ requested_by: 1 });
exportApprovalSchema.index({ status: 1 });
exportApprovalSchema.index({ resource_type: 1 });

export const DiscountApproval = mongoose.models.DiscountApproval || mongoose.model('DiscountApproval', discountApprovalSchema);
export const Territory = mongoose.models.Territory || mongoose.model('Territory', territorySchema);
export const UserTerritory = mongoose.models.UserTerritory || mongoose.model('UserTerritory', userTerritorySchema);
export const ExportApproval = mongoose.models.ExportApproval || mongoose.model('ExportApproval', exportApprovalSchema);
export const DiscountThreshold = mongoose.models.DiscountThreshold || mongoose.model('DiscountThreshold', discountThresholdSchema);
