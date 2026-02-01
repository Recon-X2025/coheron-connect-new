import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ICostLayer extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  quantity: number;
  original_quantity: number;
  unit_cost: number;
  total_cost: number;
  source_type: string;
  source_id: mongoose.Types.ObjectId;
  date: Date;
}

const costLayerSchema = new Schema<ICostLayer>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true },
  original_quantity: { type: Number, required: true },
  unit_cost: { type: Number, required: true },
  total_cost: { type: Number, default: 0 },
  source_type: { type: String, enum: ['grn', 'manufacturing', 'opening', 'adjustment', 'transfer'], required: true },
  source_id: { type: Schema.Types.ObjectId },
  date: { type: Date, default: Date.now },
}, defaultSchemaOptions);

costLayerSchema.index({ tenant_id: 1, product_id: 1, warehouse_id: 1, date: 1 });
costLayerSchema.index({ product_id: 1, quantity: 1 });

const CostLayerModel = mongoose.model<ICostLayer>('CostLayer', costLayerSchema);
export { CostLayerModel as CostLayer };
export default CostLayerModel;
