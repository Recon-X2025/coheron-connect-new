import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAccountTax extends Document {
  name: string;
  code: string | null;
  type_tax_use: string;
  amount_type: string;
  amount: number;
  tax_group_id: mongoose.Types.ObjectId | null;
  account_id: mongoose.Types.ObjectId | null;
  refund_account_id: mongoose.Types.ObjectId | null;
  country_id: mongoose.Types.ObjectId | null;
  active: boolean;
  sequence: number;
  price_include: boolean;
}

const AccountTaxSchema = new Schema<IAccountTax>({
  name: { type: String, required: true },
  code: { type: String, default: null, unique: true, sparse: true },
  type_tax_use: { type: String, required: true },
  amount_type: { type: String, default: 'percent' },
  amount: { type: Number, required: true },
  tax_group_id: { type: Schema.Types.ObjectId, ref: 'TaxGroup', default: null },
  account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  refund_account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  country_id: { type: Schema.Types.ObjectId, default: null },
  active: { type: Boolean, default: true },
  sequence: { type: Number, default: 0 },
  price_include: { type: Boolean, default: false },
}, schemaOptions);

// Indexes (code already has unique/sparse index)
AccountTaxSchema.index({ tax_group_id: 1 });
AccountTaxSchema.index({ account_id: 1 });
AccountTaxSchema.index({ refund_account_id: 1 });
AccountTaxSchema.index({ type_tax_use: 1 });
AccountTaxSchema.index({ active: 1 });

export default mongoose.model<IAccountTax>('AccountTax', AccountTaxSchema);
