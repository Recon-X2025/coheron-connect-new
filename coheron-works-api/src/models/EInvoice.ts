import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const eInvoiceSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  irn: { type: String },
  ack_number: { type: String },
  ack_date: { type: Date },
  signed_invoice: { type: String },
  signed_qr_code: { type: String },
  qr_code_url: { type: String },
  status: { type: String, enum: ['pending', 'generated', 'cancelled', 'failed'], default: 'pending' },
  cancel_reason: { type: String },
  cancel_remark: { type: String },
  cancelled_at: { type: Date },
  error_code: { type: String },
  error_message: { type: String },
  ewb_number: { type: String },
  ewb_date: { type: Date },
  ewb_valid_upto: { type: Date },
  api_response: { type: Schema.Types.Mixed },
  generated_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

eInvoiceSchema.index({ tenant_id: 1, status: 1 });
eInvoiceSchema.index({ invoice_id: 1 }, { unique: true });
eInvoiceSchema.index({ irn: 1 });
eInvoiceSchema.index({ tenant_id: 1, created_at: -1 });

export const EInvoice = mongoose.model('EInvoice', eInvoiceSchema);
