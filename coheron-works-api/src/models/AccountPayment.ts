import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IPaymentBillRel {
  bill_id: mongoose.Types.ObjectId;
  amount: number;
}

const PaymentBillRelSchema = new Schema<IPaymentBillRel>({
  bill_id: { type: Schema.Types.ObjectId, ref: 'AccountBill', required: true },
  amount: { type: Number, required: true },
}, { _id: false });

export interface IAccountPayment extends Document {
  name: string;
  payment_type: string;
  payment_method: string;
  partner_id: mongoose.Types.ObjectId;
  amount: number;
  currency_id: mongoose.Types.ObjectId | null;
  payment_date: Date;
  journal_id: mongoose.Types.ObjectId;
  communication: string | null;
  state: string;
  bill_ids: IPaymentBillRel[];
}

const AccountPaymentSchema = new Schema<IAccountPayment>({
  name: { type: String, required: true },
  payment_type: { type: String, required: true },
  payment_method: { type: String, required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  amount: { type: Number, required: true },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  payment_date: { type: Date, required: true },
  journal_id: { type: Schema.Types.ObjectId, ref: 'AccountJournal', required: true },
  communication: { type: String, default: null },
  state: { type: String, default: 'draft' },
  bill_ids: [PaymentBillRelSchema],
}, schemaOptions);

// Indexes
AccountPaymentSchema.index({ partner_id: 1 });
AccountPaymentSchema.index({ journal_id: 1 });
AccountPaymentSchema.index({ state: 1 });
AccountPaymentSchema.index({ payment_date: -1 });
AccountPaymentSchema.index({ state: 1, payment_date: -1 });
AccountPaymentSchema.index({ payment_type: 1 });

export default mongoose.models.AccountPayment as mongoose.Model<IAccountPayment> || mongoose.model<IAccountPayment>('AccountPayment', AccountPaymentSchema);
