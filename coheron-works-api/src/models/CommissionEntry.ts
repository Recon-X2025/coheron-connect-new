import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const commissionEntrySchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId },
  sales_person_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  commission_plan_id: { type: Schema.Types.ObjectId, ref: 'CommissionPlan' },
  sale_order_id: { type: Schema.Types.ObjectId },
  invoice_id: { type: Schema.Types.ObjectId },
  order_amount: { type: Number, required: true },
  commission_amount: { type: Number, required: true },
  commission_rate: { type: Number },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'cancelled'], default: 'pending' },
  period_start: { type: Date },
  period_end: { type: Date },
  approved_by: { type: Schema.Types.ObjectId },
  approved_at: { type: Date },
  paid_at: { type: Date },
  payment_reference: { type: String },
  notes: { type: String },
}, schemaOptions);

commissionEntrySchema.index({ tenant_id: 1, sales_person_id: 1, status: 1 });
commissionEntrySchema.index({ tenant_id: 1, period_start: 1, period_end: 1 });

export const CommissionEntry = mongoose.model('CommissionEntry', commissionEntrySchema);
