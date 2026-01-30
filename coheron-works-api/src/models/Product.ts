import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProduct extends Document {
  name: string;
  default_code: string;
  list_price: number;
  standard_price: number;
  qty_available: number;
  type: string;
  categ_id: mongoose.Types.ObjectId;
  image_url: string;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  default_code: { type: String },
  list_price: { type: Number, default: 0 },
  standard_price: { type: Number, default: 0 },
  qty_available: { type: Number, default: 0 },
  type: { type: String, default: 'product' },
  categ_id: { type: Schema.Types.ObjectId },
  image_url: { type: String },
}, defaultSchemaOptions);

productSchema.index({ name: 1 });
productSchema.index({ type: 1 });
productSchema.index({ categ_id: 1 });
productSchema.index({ default_code: 1 });

const ProductModel = mongoose.model<IProduct>('Product', productSchema);
export { ProductModel as Product };
export default ProductModel;
