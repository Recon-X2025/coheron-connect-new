import mongoose, { Schema, Document } from 'mongoose';

export interface IProductRevision extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  revision: string;
  eco_id?: mongoose.Types.ObjectId;
  status: 'draft' | 'active' | 'obsolete';
  bom_snapshot: any;
  routing_snapshot: any;
  change_summary: string;
  effective_from: Date;
  effective_to?: Date;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const productRevisionSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  revision: { type: String, required: true },
  eco_id: { type: Schema.Types.ObjectId, ref: 'EngineeringChangeOrder' },
  status: { type: String, enum: ['draft', 'active', 'obsolete'], default: 'draft' },
  bom_snapshot: Schema.Types.Mixed,
  routing_snapshot: Schema.Types.Mixed,
  change_summary: { type: String, default: '' },
  effective_from: { type: Date, required: true },
  effective_to: Date,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

productRevisionSchema.index({ tenant_id: 1, product_id: 1, revision: 1 }, { unique: true });

export const ProductRevision = mongoose.model<IProductRevision>('ProductRevision', productRevisionSchema);
