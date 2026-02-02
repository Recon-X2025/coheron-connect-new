import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IInvoice extends Document {
  name: string;
  partner_id: mongoose.Types.ObjectId;
  invoice_date: Date;
  due_date: Date | null;
  move_type: string;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
  state: string;
}

const InvoiceSchema = new Schema({
  name: { type: String, required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  invoice_date: { type: Date, default: Date.now },
  due_date: { type: Date, default: null },
  move_type: { type: String, default: 'out_invoice' },
  amount_total: { type: Number, default: 0 },
  amount_residual: { type: Number, default: 0 },
  payment_state: { type: String, default: 'not_paid' },
  state: { type: String, default: 'draft' },

  // --- Invoice number ---
  invoice_number: { type: String },

  // --- GST fields ---
  partner_gstin: { type: String },
  place_of_supply: { type: String },
  supply_type: { type: String, enum: ['inter_state', 'intra_state'], default: 'intra_state' },

  // --- Line items ---
  line_items: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    description: { type: String },
    hsn_code: { type: String },
    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, default: 0 },
    discount_percent: { type: Number, default: 0 },
    taxable_amount: { type: Number, default: 0 },
    cgst_rate: { type: Number, default: 0 },
    cgst_amount: { type: Number, default: 0 },
    sgst_rate: { type: Number, default: 0 },
    sgst_amount: { type: Number, default: 0 },
    igst_rate: { type: Number, default: 0 },
    igst_amount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  }],

  // --- Tax totals ---
  total_cgst: { type: Number, default: 0 },
  total_sgst: { type: Number, default: 0 },
  total_igst: { type: Number, default: 0 },
  total_tax: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },

  // --- Payments ---
  amount_paid: { type: Number, default: 0 },
  payments: [{
    payment_number: { type: String },
    date: { type: Date },
    amount: { type: Number },
    method: { type: String },
    reference: { type: String },
    notes: { type: String },
  }],

  // --- Terms ---
  payment_terms: { type: String },
  notes: { type: String },
  terms_conditions: { type: String },

  // --- Tenant ---
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

InvoiceSchema.index({ partner_id: 1 });
InvoiceSchema.index({ state: 1 });
InvoiceSchema.index({ payment_state: 1 });
InvoiceSchema.index({ due_date: -1 });
InvoiceSchema.index({ partner_id: 1, created_at: -1 });
InvoiceSchema.index({ invoice_number: 1 });
InvoiceSchema.index({ tenant_id: 1 });
InvoiceSchema.index({ tenant_id: 1, state: 1 });

const InvoiceModel = mongoose.model('Invoice', InvoiceSchema);
export { InvoiceModel as Invoice };
export default InvoiceModel;
