import mongoose, { Schema, Document } from 'mongoose';

export interface IBankFeed extends Document {
  tenant_id: mongoose.Types.ObjectId;
  bank_name: string;
  account_name: string;
  account_number_masked: string;
  provider: 'plaid' | 'yodlee' | 'open_banking' | 'manual';
  provider_account_id: string;
  access_token: string;
  currency: string;
  current_balance: number;
  available_balance: number;
  last_synced_at: Date | null;
  sync_frequency: 'manual' | 'daily' | 'hourly';
  is_active: boolean;
  linked_bank_account_id: mongoose.Types.ObjectId | null;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const BankFeedSchema = new Schema<IBankFeed>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  bank_name: { type: String, required: true },
  account_name: { type: String, required: true },
  account_number_masked: { type: String, required: true },
  provider: { type: String, enum: ['plaid','yodlee','open_banking','manual'], required: true },
  provider_account_id: { type: String, default: '' },
  access_token: { type: String, default: '' },
  currency: { type: String, default: 'INR' },
  current_balance: { type: Number, default: 0 },
  available_balance: { type: Number, default: 0 },
  last_synced_at: { type: Date, default: null },
  sync_frequency: { type: String, enum: ['manual','daily','hourly'], default: 'manual' },
  is_active: { type: Boolean, default: true },
  linked_bank_account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
});

BankFeedSchema.index({ tenant_id: 1, provider: 1, provider_account_id: 1 }, { unique: true });

export default mongoose.model<IBankFeed>('BankFeed', BankFeedSchema);
