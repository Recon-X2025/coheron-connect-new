import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAccountVendor extends Document {
  partner_id: mongoose.Types.ObjectId;
  vendor_code: string;
  payment_term_id: mongoose.Types.ObjectId | null;
  credit_limit: number | null;
  tax_id: string | null;
  vendor_type: string | null;
  currency_id: mongoose.Types.ObjectId | null;
  is_active: boolean;
}

const AccountVendorSchema = new Schema<IAccountVendor>({
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true, unique: true },
  vendor_code: { type: String, required: true, unique: true },
  payment_term_id: { type: Schema.Types.ObjectId, default: null },
  credit_limit: { type: Number, default: null },
  tax_id: { type: String, default: null },
  vendor_type: { type: String, default: null },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// Indexes (partner_id and vendor_code already have unique indexes)
AccountVendorSchema.index({ payment_term_id: 1 });
AccountVendorSchema.index({ vendor_type: 1 });
AccountVendorSchema.index({ is_active: 1 });

export default mongoose.model<IAccountVendor>('AccountVendor', AccountVendorSchema);
