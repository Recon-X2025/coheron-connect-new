import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAccountAccount extends Document {
  code: string;
  name: string;
  account_type: string;
  parent_id: mongoose.Types.ObjectId | null;
  level: number;
  internal_type: string | null;
  reconcile: boolean;
  deprecated: boolean;
  currency_id: mongoose.Types.ObjectId | null;
  tag_ids: string[] | null;
  notes: string | null;
}

const AccountAccountSchema = new Schema<IAccountAccount>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  account_type: { type: String, required: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  level: { type: Number, default: 0 },
  internal_type: { type: String, default: null },
  reconcile: { type: Boolean, default: false },
  deprecated: { type: Boolean, default: false },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  tag_ids: { type: [String], default: null },
  notes: { type: String, default: null },
}, schemaOptions);

// Indexes
AccountAccountSchema.index({ parent_id: 1 });
AccountAccountSchema.index({ account_type: 1 });
AccountAccountSchema.index({ created_at: -1 });

export default mongoose.model<IAccountAccount>('AccountAccount', AccountAccountSchema);
