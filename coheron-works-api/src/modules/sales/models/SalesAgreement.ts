import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ISalesAgreement extends Document {
  tenant_id: mongoose.Types.ObjectId;
  agreement_number: string;
  agreement_type: 'price' | 'volume' | 'rebate';
  partner_id: mongoose.Types.ObjectId;
  start_date: Date;
  end_date: Date;
  terms: Array<{
    product_id: mongoose.Types.ObjectId;
    committed_quantity: number;
    committed_value: number;
    agreed_price: number;
    min_quantity: number;
    rebate_pct: number;
  }>;
  fulfillment: Array<{
    product_id: mongoose.Types.ObjectId;
    fulfilled_quantity: number;
    fulfilled_value: number;
  }>;
  status: 'draft' | 'active' | 'expired' | 'cancelled';
  renewal_type: 'auto' | 'manual' | 'none';
  penalty_clause: string;
  created_by: mongoose.Types.ObjectId;
}

const salesAgreementSchema = new Schema<ISalesAgreement>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  agreement_number: { type: String, required: true },
  agreement_type: { type: String, enum: ['price', 'volume', 'rebate'], required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  terms: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    committed_quantity: { type: Number, default: 0 },
    committed_value: { type: Number, default: 0 },
    agreed_price: { type: Number, default: 0 },
    min_quantity: { type: Number, default: 0 },
    rebate_pct: { type: Number, default: 0 },
  }],
  fulfillment: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    fulfilled_quantity: { type: Number, default: 0 },
    fulfilled_value: { type: Number, default: 0 },
  }],
  status: { type: String, enum: ['draft', 'active', 'expired', 'cancelled'], default: 'draft' },
  renewal_type: { type: String, enum: ['auto', 'manual', 'none'], default: 'none' },
  penalty_clause: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

salesAgreementSchema.index({ tenant_id: 1, agreement_number: 1 }, { unique: true });
salesAgreementSchema.index({ tenant_id: 1, partner_id: 1 });
salesAgreementSchema.index({ tenant_id: 1, status: 1 });
salesAgreementSchema.index({ tenant_id: 1, end_date: 1 });

export const SalesAgreement = mongoose.model<ISalesAgreement>('SalesAgreement', salesAgreementSchema);
