import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProjectPurchaseRequestLine extends Document {
  request_id: mongoose.Types.ObjectId;
  product_id?: mongoose.Types.ObjectId;
  description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  vendor_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const projectPurchaseRequestLineSchema = new Schema<IProjectPurchaseRequestLine>({
  request_id: { type: Schema.Types.ObjectId, ref: 'ProjectPurchaseRequest', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  vendor_id: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

// Indexes
projectPurchaseRequestLineSchema.index({ request_id: 1 });
projectPurchaseRequestLineSchema.index({ product_id: 1 });
projectPurchaseRequestLineSchema.index({ vendor_id: 1 });
projectPurchaseRequestLineSchema.index({ created_at: -1 });

export default mongoose.model<IProjectPurchaseRequestLine>('ProjectPurchaseRequestLine', projectPurchaseRequestLineSchema);
