import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoQualityInspection extends Document {
  mo_id: mongoose.Types.ObjectId;
  workorder_id: mongoose.Types.ObjectId;
  inspection_type: string;
  product_id: mongoose.Types.ObjectId;
  qty_to_inspect: number;
  qty_inspected: number;
  qty_passed: number;
  qty_failed: number;
  inspector_id: mongoose.Types.ObjectId;
  inspection_date: Date;
  state: string;
  notes: string;
}

const schema = new Schema<IMoQualityInspection>({
  mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder' },
  workorder_id: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  inspection_type: { type: String, default: 'in_process' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  qty_to_inspect: { type: Number, default: 0 },
  qty_inspected: { type: Number, default: 0 },
  qty_passed: { type: Number, default: 0 },
  qty_failed: { type: Number, default: 0 },
  inspector_id: { type: Schema.Types.ObjectId, ref: 'User' },
  inspection_date: { type: Date },
  state: { type: String, default: 'draft' },
  notes: { type: String },
}, defaultSchemaOptions);

schema.index({ mo_id: 1 });
schema.index({ state: 1 });
schema.index({ workorder_id: 1 });
schema.index({ product_id: 1 });
schema.index({ inspector_id: 1 });
schema.index({ inspection_date: -1 });
schema.index({ mo_id: 1, state: 1 });

export default mongoose.models.MoQualityInspection as mongoose.Model<IMoQualityInspection> || mongoose.model<IMoQualityInspection>('MoQualityInspection', schema);
