import mongoose, { Schema, Document } from 'mongoose';

export interface IConsignmentItem {
  product_id: mongoose.Types.ObjectId;
  max_quantity: number;
  min_quantity: number;
  price: number;
  commission_rate: number;
}

export interface IConsignmentAgreement extends Document {
  tenant_id: mongoose.Types.ObjectId;
  agreement_number: string;
  type: 'vendor_consignment' | 'customer_consignment';
  partner_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  items: IConsignmentItem[];
  start_date: Date;
  end_date: Date;
  settlement_frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  auto_replenish: boolean;
  terms?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const consignmentItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  max_quantity: { type: Number, required: true },
  min_quantity: { type: Number, default: 0 },
  price: { type: Number, required: true },
  commission_rate: { type: Number, default: 0 },
}, { _id: false });

const consignmentAgreementSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  agreement_number: { type: String, required: true },
  type: { type: String, enum: ['vendor_consignment', 'customer_consignment'], required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  status: { type: String, enum: ['draft', 'active', 'expired', 'terminated'], default: 'draft' },
  items: [consignmentItemSchema],
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  settlement_frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly', 'quarterly'], default: 'monthly' },
  auto_replenish: { type: Boolean, default: false },
  terms: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

consignmentAgreementSchema.index({ tenant_id: 1, agreement_number: 1 }, { unique: true });

export const ConsignmentAgreement = mongoose.model<IConsignmentAgreement>('ConsignmentAgreement', consignmentAgreementSchema);
