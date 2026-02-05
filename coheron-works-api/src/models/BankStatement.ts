import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IBankStatementLine {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  name: string;
  amount: number;
  partner_id: mongoose.Types.ObjectId | null;
  ref: string | null;
  note: string | null;
  reconciled: boolean;
  move_id: mongoose.Types.ObjectId | null;
  payment_id: mongoose.Types.ObjectId | null;
  receipt_id: mongoose.Types.ObjectId | null;
}

const BankStatementLineSchema = new Schema<IBankStatementLine>({
  date: { type: Date, required: true },
  name: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', default: null },
  ref: { type: String, default: null },
  note: { type: String, default: null },
  reconciled: { type: Boolean, default: false },
  move_id: { type: Schema.Types.ObjectId, ref: 'AccountMove', default: null },
  payment_id: { type: Schema.Types.ObjectId, ref: 'AccountPayment', default: null },
  receipt_id: { type: Schema.Types.ObjectId, ref: 'AccountReceipt', default: null },
}, { _id: true, toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } } });

export interface IBankStatement extends Document {
  name: string;
  bank_account_id: mongoose.Types.ObjectId;
  date_start: Date;
  date_end: Date;
  balance_start: number;
  balance_end: number;
  balance_end_real: number | null;
  imported_file_path: string | null;
  state: string;
  lines: IBankStatementLine[];
}

const BankStatementSchema = new Schema<IBankStatement>({
  name: { type: String, required: true },
  bank_account_id: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  date_start: { type: Date, required: true },
  date_end: { type: Date, required: true },
  balance_start: { type: Number, default: 0 },
  balance_end: { type: Number, default: 0 },
  balance_end_real: { type: Number, default: null },
  imported_file_path: { type: String, default: null },
  state: { type: String, default: 'draft' },
  lines: [BankStatementLineSchema],
}, schemaOptions);

// Indexes
BankStatementSchema.index({ bank_account_id: 1 });
BankStatementSchema.index({ state: 1 });
BankStatementSchema.index({ date_start: -1 });
BankStatementSchema.index({ bank_account_id: 1, state: 1 });

export default mongoose.models.BankStatement as mongoose.Model<IBankStatement> || mongoose.model<IBankStatement>('BankStatement', BankStatementSchema);
