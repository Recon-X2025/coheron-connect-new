import mongoose, { Schema, Document } from 'mongoose';

export interface IBankFeedTransaction extends Document {
  tenant_id: mongoose.Types.ObjectId;
  bank_feed_id: mongoose.Types.ObjectId;
  provider_transaction_id: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  transaction_type: 'debit' | 'credit';
  category: string;
  merchant_name: string;
  is_pending: boolean;
  matched_journal_entry_id: mongoose.Types.ObjectId | null;
  match_confidence: number;
  match_status: 'unmatched' | 'auto_matched' | 'manually_matched' | 'excluded';
  matched_at: Date | null;
  matched_by: mongoose.Types.ObjectId | null;
  raw_data: any;
  created_at: Date;
}

const BankFeedTransactionSchema = new Schema<IBankFeedTransaction>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  bank_feed_id: { type: Schema.Types.ObjectId, ref: 'BankFeed', required: true },
  provider_transaction_id: { type: String, default: '' },
  date: { type: Date, required: true },
  description: { type: String, default: '' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  transaction_type: { type: String, enum: ['debit', 'credit'], required: true },
  category: { type: String, default: '' },
  merchant_name: { type: String, default: '' },
  is_pending: { type: Boolean, default: false },
  matched_journal_entry_id: { type: Schema.Types.ObjectId, ref: 'AccountMove', default: null },
  match_confidence: { type: Number, default: 0, min: 0, max: 100 },
  match_status: { type: String, enum: ['unmatched', 'auto_matched', 'manually_matched', 'excluded'], default: 'unmatched' },
  matched_at: { type: Date, default: null },
  matched_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  raw_data: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
});

BankFeedTransactionSchema.index({ tenant_id: 1, bank_feed_id: 1, date: 1 });
BankFeedTransactionSchema.index({ tenant_id: 1, match_status: 1 });
BankFeedTransactionSchema.index({ provider_transaction_id: 1 });

export default mongoose.model<IBankFeedTransaction>('BankFeedTransaction', BankFeedTransactionSchema);
