import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IBankAccount extends Document {
  name: string;
  bank_name: string | null;
  account_number: string | null;
  routing_number: string | null;
  iban: string | null;
  swift_code: string | null;
  account_type: string;
  currency_id: mongoose.Types.ObjectId | null;
  journal_id: mongoose.Types.ObjectId | null;
  account_id: mongoose.Types.ObjectId | null;
  balance_start: number;
  balance_end: number;
  is_active: boolean;
}

const BankAccountSchema = new Schema<IBankAccount>({
  name: { type: String, required: true },
  bank_name: { type: String, default: null },
  account_number: { type: String, default: null },
  routing_number: { type: String, default: null },
  iban: { type: String, default: null },
  swift_code: { type: String, default: null },
  account_type: { type: String, default: 'checking' },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  journal_id: { type: Schema.Types.ObjectId, ref: 'AccountJournal', default: null },
  account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  balance_start: { type: Number, default: 0 },
  balance_end: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// Indexes
BankAccountSchema.index({ journal_id: 1 });
BankAccountSchema.index({ account_id: 1 });
BankAccountSchema.index({ is_active: 1 });
BankAccountSchema.index({ account_type: 1 });

export default mongoose.models.BankAccount as mongoose.Model<IBankAccount> || mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);
