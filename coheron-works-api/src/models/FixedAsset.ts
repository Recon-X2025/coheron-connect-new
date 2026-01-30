import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IFixedAsset extends Document {
  name: string;
  code: string | null;
  category_id: mongoose.Types.ObjectId;
  partner_id: mongoose.Types.ObjectId | null;
  purchase_date: Date;
  purchase_value: number;
  current_value: number;
  salvage_value: number;
  useful_life_years: number;
  location: string | null;
  custodian_id: mongoose.Types.ObjectId | null;
  currency_id: mongoose.Types.ObjectId | null;
  notes: string | null;
  state: string;
}

const FixedAssetSchema = new Schema<IFixedAsset>({
  name: { type: String, required: true },
  code: { type: String, default: null, unique: true, sparse: true },
  category_id: { type: Schema.Types.ObjectId, ref: 'AssetCategory', required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', default: null },
  purchase_date: { type: Date, required: true },
  purchase_value: { type: Number, required: true },
  current_value: { type: Number, required: true },
  salvage_value: { type: Number, default: 0 },
  useful_life_years: { type: Number, required: true },
  location: { type: String, default: null },
  custodian_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  notes: { type: String, default: null },
  state: { type: String, default: 'draft' },
}, schemaOptions);

// Indexes
FixedAssetSchema.index({ category_id: 1 });
FixedAssetSchema.index({ partner_id: 1 });
FixedAssetSchema.index({ custodian_id: 1 });
FixedAssetSchema.index({ state: 1 });
FixedAssetSchema.index({ purchase_date: -1 });
FixedAssetSchema.index({ category_id: 1, state: 1 });

export default mongoose.model<IFixedAsset>('FixedAsset', FixedAssetSchema);
