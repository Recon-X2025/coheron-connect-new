import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const costAllocationEntrySchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  rule_id: { type: Schema.Types.ObjectId, ref: 'CostAllocationRule', required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  source_cost_center_id: { type: Schema.Types.ObjectId, ref: 'CostCenter', required: true },
  entries: [{
    target_cost_center_id: { type: Schema.Types.ObjectId, ref: 'CostCenter', required: true },
    account_id: { type: Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    percentage: { type: Number },
  }],
  total_amount: { type: Number, required: true },
  journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  status: { type: String, enum: ['draft', 'posted'], default: 'draft' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

costAllocationEntrySchema.index({ tenant_id: 1, rule_id: 1, period_start: 1 });

export default mongoose.models.CostAllocationEntry || mongoose.model('CostAllocationEntry', costAllocationEntrySchema);
