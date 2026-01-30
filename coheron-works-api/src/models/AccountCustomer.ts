import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAccountCustomer extends Document {
  partner_id: mongoose.Types.ObjectId;
  customer_code: string;
  payment_term_id: mongoose.Types.ObjectId | null;
  credit_limit: number | null;
  credit_hold: boolean;
  is_active: boolean;
}

const AccountCustomerSchema = new Schema<IAccountCustomer>({
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true, unique: true },
  customer_code: { type: String, required: true, unique: true },
  payment_term_id: { type: Schema.Types.ObjectId, default: null },
  credit_limit: { type: Number, default: null },
  credit_hold: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// Indexes (partner_id and customer_code already have unique indexes)
AccountCustomerSchema.index({ payment_term_id: 1 });
AccountCustomerSchema.index({ is_active: 1 });

export default mongoose.model<IAccountCustomer>('AccountCustomer', AccountCustomerSchema);
