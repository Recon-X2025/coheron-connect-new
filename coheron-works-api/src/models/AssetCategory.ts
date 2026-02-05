import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAssetCategory extends Document {
  name: string;
  depreciation_method: string;
  useful_life_years: number;
  account_asset_id: mongoose.Types.ObjectId | null;
  account_depreciation_id: mongoose.Types.ObjectId | null;
  account_expense_id: mongoose.Types.ObjectId | null;
}

const AssetCategorySchema = new Schema<IAssetCategory>({
  name: { type: String, required: true },
  depreciation_method: { type: String, default: 'straight_line' },
  useful_life_years: { type: Number, default: 5 },
  account_asset_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  account_depreciation_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  account_expense_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
}, schemaOptions);

// Indexes
AssetCategorySchema.index({ depreciation_method: 1 });
AssetCategorySchema.index({ account_asset_id: 1 });
AssetCategorySchema.index({ account_depreciation_id: 1 });
AssetCategorySchema.index({ account_expense_id: 1 });

export default mongoose.models.AssetCategory as mongoose.Model<IAssetCategory> || mongoose.model<IAssetCategory>('AssetCategory', AssetCategorySchema);
