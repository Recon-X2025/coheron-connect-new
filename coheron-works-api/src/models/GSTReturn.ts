import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const gstReturnSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  return_type: { type: String, enum: ['GSTR1', 'GSTR3B', 'GSTR9', 'GSTR9C'], required: true },
  period: { type: String, required: true },
  financial_year: { type: String, required: true },
  gstin: { type: String, required: true },
  status: { type: String, enum: ['draft', 'pending_review', 'ready_to_file', 'filed', 'revised'], default: 'draft' },

  // GSTR-1 fields
  outward_supplies: {
    b2b: [{ type: Schema.Types.Mixed }],
    b2c_large: [{ type: Schema.Types.Mixed }],
    b2c_small: { type: Schema.Types.Mixed },
    exports: [{ type: Schema.Types.Mixed }],
    credit_debit_notes: [{ type: Schema.Types.Mixed }],
    nil_rated: { type: Schema.Types.Mixed },
    advances_received: [{ type: Schema.Types.Mixed }],
    hsn_summary: [{ type: Schema.Types.Mixed }],
  },

  // GSTR-3B fields
  summary_3b: {
    taxable_outward_supplies: { type: Number, default: 0 },
    zero_rated_supplies: { type: Number, default: 0 },
    nil_rated_supplies: { type: Number, default: 0 },
    inward_reverse_charge: { type: Number, default: 0 },
    itc_available: {
      igst: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      cess: { type: Number, default: 0 },
    },
    itc_reversed: { type: Number, default: 0 },
    tax_payable: {
      igst: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      cess: { type: Number, default: 0 },
    },
    tax_paid: {
      igst: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      cess: { type: Number, default: 0 },
    },
    interest: { type: Number, default: 0 },
    late_fee: { type: Number, default: 0 },
  },

  filed_at: { type: Date },
  filed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  arn: { type: String },
  acknowledgement_number: { type: String },
  notes: { type: String },
}, schemaOptions);

gstReturnSchema.index({ tenant_id: 1, return_type: 1, period: 1 });
gstReturnSchema.index({ tenant_id: 1, status: 1 });
gstReturnSchema.index({ tenant_id: 1, financial_year: 1 });

export const GSTReturn = mongoose.model('GSTReturn', gstReturnSchema);
