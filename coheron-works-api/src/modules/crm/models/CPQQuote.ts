import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICPQQuote extends Document {
  tenant_id: mongoose.Types.ObjectId;
  template_id: mongoose.Types.ObjectId;
  lead_id: mongoose.Types.ObjectId;
  quote_number: string;
  lines: Array<{
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    unit_price: number;
    discount_pct: number;
    total: number;
  }>;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  status: string;
  valid_until: Date;
  created_by: mongoose.Types.ObjectId;
}

const cpqQuoteSchema = new Schema<ICPQQuote>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  template_id: { type: Schema.Types.ObjectId, ref: 'CPQTemplate' },
  lead_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  quote_number: { type: String, required: true, unique: true },
  lines: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, default: 0 },
    discount_pct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  }],
  subtotal: { type: Number, default: 0 },
  discount_total: { type: Number, default: 0 },
  tax_total: { type: Number, default: 0 },
  grand_total: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
  valid_until: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

cpqQuoteSchema.index({ tenant_id: 1, status: 1 });
cpqQuoteSchema.index({ tenant_id: 1, lead_id: 1 });

export const CPQQuote = mongoose.model<ICPQQuote>('CPQQuote', cpqQuoteSchema);
