import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IProductCategory extends Document {
  name: string;
  code: string;
  parent_id: mongoose.Types.ObjectId;
  description: string;
  is_active: boolean;
  tenant_id: mongoose.Types.ObjectId;
}

const productCategorySchema = new Schema<IProductCategory>({
  name: { type: String, required: true },
  code: { type: String },
  parent_id: { type: Schema.Types.ObjectId, ref: 'ProductCategory' },
  description: { type: String },
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

productCategorySchema.index({ tenant_id: 1 });
productCategorySchema.index({ parent_id: 1 });
productCategorySchema.index({ tenant_id: 1, is_active: 1 });

export const ProductCategory = mongoose.model<IProductCategory>('ProductCategory', productCategorySchema);
export default ProductCategory;
