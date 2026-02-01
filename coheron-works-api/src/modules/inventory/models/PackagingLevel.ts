import mongoose, { Schema, Document } from 'mongoose';

export interface IPackagingLevel extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  level: number;
  parent_level_id?: mongoose.Types.ObjectId;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in' | 'mm';
  };
  max_weight: number;
  barcode_prefix: string;
  is_shippable: boolean;
  items_per_pack: number;
  created_at: Date;
  updated_at: Date;
}

const packagingLevelSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  level: { type: Number, required: true },
  parent_level_id: { type: Schema.Types.ObjectId, ref: 'PackagingLevel' },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    unit: { type: String, enum: ['cm', 'in', 'mm'], default: 'cm' },
  },
  max_weight: { type: Number, default: 0 },
  barcode_prefix: { type: String, default: '' },
  is_shippable: { type: Boolean, default: false },
  items_per_pack: { type: Number, default: 1 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

packagingLevelSchema.index({ tenant_id: 1, name: 1 }, { unique: true });

export const PackagingLevel = mongoose.model<IPackagingLevel>('PackagingLevel', packagingLevelSchema);
