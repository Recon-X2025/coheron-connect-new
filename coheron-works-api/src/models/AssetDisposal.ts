import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAssetDisposal extends Document {
  asset_id: mongoose.Types.ObjectId;
  disposal_date: Date;
  disposal_type: string;
  disposal_value: number;
  gain_loss: number;
  notes: string | null;
}

const AssetDisposalSchema = new Schema<IAssetDisposal>({
  asset_id: { type: Schema.Types.ObjectId, ref: 'FixedAsset', required: true },
  disposal_date: { type: Date, required: true },
  disposal_type: { type: String, required: true },
  disposal_value: { type: Number, default: 0 },
  gain_loss: { type: Number, default: 0 },
  notes: { type: String, default: null },
}, schemaOptions);

// Indexes
AssetDisposalSchema.index({ asset_id: 1 });
AssetDisposalSchema.index({ disposal_date: -1 });
AssetDisposalSchema.index({ disposal_type: 1 });

export default mongoose.models.AssetDisposal as mongoose.Model<IAssetDisposal> || mongoose.model<IAssetDisposal>('AssetDisposal', AssetDisposalSchema);
