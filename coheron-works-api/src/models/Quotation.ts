import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

const quotationLineSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },
  hsn_code: { type: String },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  tax_id: { type: Schema.Types.ObjectId, ref: 'TaxRule' },
  taxable_amount: { type: Number, default: 0 },
  cgst_rate: { type: Number, default: 0 },
  cgst_amount: { type: Number, default: 0 },
  sgst_rate: { type: Number, default: 0 },
  sgst_amount: { type: Number, default: 0 },
  igst_rate: { type: Number, default: 0 },
  igst_amount: { type: Number, default: 0 },
  cess_rate: { type: Number, default: 0 },
  cess_amount: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

export interface IQuotation extends Document {
  tenant_id: mongoose.Types.ObjectId;
  quotation_number: string;
  partner_id: mongoose.Types.ObjectId;
  contact_person: string;
  date: Date;
  validity_date: Date;
  currency: string;
  exchange_rate: number;
  lines: any[];
  subtotal: number;
  total_discount: number;
  total_tax: number;
  grand_total: number;
  tax_breakdown: Record<string, number>;
  state: string;
  sale_order_id: mongoose.Types.ObjectId | null;
  notes: string;
  terms_conditions: string;
  assigned_to: mongoose.Types.ObjectId | null;
  price_list_id: mongoose.Types.ObjectId | null;
}

const quotationSchema = new Schema<IQuotation>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  quotation_number: { type: String, unique: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  contact_person: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  validity_date: { type: Date },
  currency: { type: String, default: 'INR' },
  exchange_rate: { type: Number, default: 1 },
  lines: [quotationLineSchema],
  subtotal: { type: Number, default: 0 },
  total_discount: { type: Number, default: 0 },
  total_tax: { type: Number, default: 0 },
  grand_total: { type: Number, default: 0 },
  tax_breakdown: { type: Schema.Types.Mixed, default: {} },
  state: { type: String, default: 'draft', enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'] },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder', default: null },
  notes: { type: String, default: '' },
  terms_conditions: { type: String, default: '' },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  price_list_id: { type: Schema.Types.ObjectId, ref: 'PriceList', default: null },
}, defaultSchemaOptions);

quotationSchema.index({ tenant_id: 1, state: 1 });
quotationSchema.index({ partner_id: 1 });
quotationSchema.index({ assigned_to: 1 });
quotationSchema.index({ date: -1 });

const QuotationModel = mongoose.model<IQuotation>('Quotation', quotationSchema);
export { QuotationModel as Quotation };
export default QuotationModel;
