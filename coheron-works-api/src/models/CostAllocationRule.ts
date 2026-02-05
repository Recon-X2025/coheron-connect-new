import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const costAllocationRuleSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  source_cost_center_id: { type: Schema.Types.ObjectId, ref: 'CostCenter', required: true },
  allocation_type: { type: String, enum: ['percentage', 'fixed', 'activity_based'], required: true },
  targets: [{
    cost_center_id: { type: Schema.Types.ObjectId, ref: 'CostCenter', required: true },
    percentage: { type: Number },
    fixed_amount: { type: Number },
    activity_driver: { type: String },
  }],
  account_ids: [{ type: Schema.Types.ObjectId }],
  frequency: { type: String, enum: ['monthly', 'quarterly', 'annually', 'on_demand'], default: 'monthly' },
  is_active: { type: Boolean, default: true },
  last_run_at: { type: Date },
}, schemaOptions);

costAllocationRuleSchema.index({ tenant_id: 1, source_cost_center_id: 1 });

export default mongoose.models.CostAllocationRule || mongoose.model('CostAllocationRule', costAllocationRuleSchema);
