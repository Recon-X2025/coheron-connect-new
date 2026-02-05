import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const tdsEntrySchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  section: { type: String, required: true },
  deductee_name: { type: String, required: true },
  deductee_pan: { type: String, required: true },
  deductee_type: { type: String, enum: ['individual', 'company', 'firm', 'huf', 'other'], default: 'individual' },
  payment_date: { type: Date, required: true },
  payment_amount: { type: Number, required: true },
  tds_rate: { type: Number, required: true },
  tds_amount: { type: Number, required: true },
  surcharge: { type: Number, default: 0 },
  cess: { type: Number, default: 0 },
  total_deduction: { type: Number, required: true },
  challan_number: { type: String },
  challan_date: { type: Date },
  bsr_code: { type: String },
  certificate_number: { type: String },
  status: { type: String, enum: ['pending', 'deposited', 'filed', 'revised'], default: 'pending' },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
  financial_year: { type: String },
  invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
}, schemaOptions);

tdsEntrySchema.index({ tenant_id: 1, financial_year: 1, quarter: 1 });
tdsEntrySchema.index({ tenant_id: 1, deductee_pan: 1 });
tdsEntrySchema.index({ tenant_id: 1, status: 1 });
tdsEntrySchema.index({ tenant_id: 1, section: 1 });

export const TDSEntry = mongoose.models.TDSEntry || mongoose.model('TDSEntry', tdsEntrySchema);
