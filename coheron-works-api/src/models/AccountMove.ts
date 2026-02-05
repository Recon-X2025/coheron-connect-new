import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAccountMoveLine {
  account_id: mongoose.Types.ObjectId;
  partner_id: mongoose.Types.ObjectId | null;
  name: string;
  debit: number;
  credit: number;
  balance: number;
  date: Date;
  date_maturity: Date | null;
  cost_center_id: mongoose.Types.ObjectId | null;
  project_id: mongoose.Types.ObjectId | null;
  product_id: mongoose.Types.ObjectId | null;
  tax_ids: string[] | null;
}

const AccountMoveLineSchema = new Schema<IAccountMoveLine>({
  account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', default: null },
  name: { type: String, default: '' },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  date: { type: Date, required: true },
  date_maturity: { type: Date, default: null },
  cost_center_id: { type: Schema.Types.ObjectId, default: null },
  project_id: { type: Schema.Types.ObjectId, default: null },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  tax_ids: { type: [String], default: null },
}, { _id: true, toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } } });

export interface IAccountMove extends Document {
  name: string;
  journal_id: mongoose.Types.ObjectId;
  date: Date;
  ref: string | null;
  move_type: string;
  partner_id: mongoose.Types.ObjectId | null;
  amount_total: number;
  currency_id: mongoose.Types.ObjectId | null;
  state: string;
  posted_at: Date | null;
  posted_by: mongoose.Types.ObjectId | null;
  lines: IAccountMoveLine[];
}

const AccountMoveSchema = new Schema<IAccountMove>({
  name: { type: String, required: true },
  journal_id: { type: Schema.Types.ObjectId, ref: 'AccountJournal', required: true },
  date: { type: Date, required: true },
  ref: { type: String, default: null },
  move_type: { type: String, default: 'entry' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', default: null },
  amount_total: { type: Number, default: 0 },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  state: { type: String, default: 'draft' },
  posted_at: { type: Date, default: null },
  posted_by: { type: Schema.Types.ObjectId, default: null },
  lines: [AccountMoveLineSchema],
}, schemaOptions);

// Indexes
AccountMoveSchema.index({ journal_id: 1 });
AccountMoveSchema.index({ partner_id: 1 });
AccountMoveSchema.index({ state: 1 });
AccountMoveSchema.index({ date: -1 });
AccountMoveSchema.index({ state: 1, date: -1 });
AccountMoveSchema.index({ move_type: 1 });

export default mongoose.models.AccountMove as mongoose.Model<IAccountMove> || mongoose.model<IAccountMove>('AccountMove', AccountMoveSchema);
