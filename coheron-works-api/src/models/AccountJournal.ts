import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAccountJournal extends Document {
  name: string;
  code: string;
  type: string;
  default_account_id: mongoose.Types.ObjectId | null;
  currency_id: mongoose.Types.ObjectId | null;
  active: boolean;
}

const AccountJournalSchema = new Schema<IAccountJournal>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  default_account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  active: { type: Boolean, default: true },
}, schemaOptions);

// Indexes
AccountJournalSchema.index({ default_account_id: 1 });
AccountJournalSchema.index({ type: 1 });

export default mongoose.models.AccountJournal as mongoose.Model<IAccountJournal> || mongoose.model<IAccountJournal>('AccountJournal', AccountJournalSchema);
