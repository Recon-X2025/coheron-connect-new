import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAssetDepreciation extends Document {
  asset_id: mongoose.Types.ObjectId;
  period_start: Date;
  period_end: Date;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  state: string;
}

const AssetDepreciationSchema = new Schema<IAssetDepreciation>({
  asset_id: { type: Schema.Types.ObjectId, ref: 'FixedAsset', required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  depreciation_amount: { type: Number, required: true },
  accumulated_depreciation: { type: Number, required: true },
  book_value: { type: Number, required: true },
  state: { type: String, default: 'draft' },
}, schemaOptions);

// Indexes
AssetDepreciationSchema.index({ asset_id: 1 });
AssetDepreciationSchema.index({ state: 1 });
AssetDepreciationSchema.index({ period_start: 1 });
AssetDepreciationSchema.index({ period_end: 1 });
AssetDepreciationSchema.index({ asset_id: 1, state: 1 });

export default mongoose.model<IAssetDepreciation>('AssetDepreciation', AssetDepreciationSchema);
