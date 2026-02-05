import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoNonConformance extends Document {
  mo_id: mongoose.Types.ObjectId;
  workorder_id: mongoose.Types.ObjectId;
  inspection_id: mongoose.Types.ObjectId;
  ncr_number: string;
  product_id: mongoose.Types.ObjectId;
  qty_non_conforming: number;
  severity: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  state: string;
  assigned_to: mongoose.Types.ObjectId;
  resolution_date: Date;
}

const schema = new Schema<IMoNonConformance>({
  mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder' },
  workorder_id: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  inspection_id: { type: Schema.Types.ObjectId, ref: 'MoQualityInspection' },
  ncr_number: { type: String, unique: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  qty_non_conforming: { type: Number, default: 0 },
  severity: { type: String, default: 'major' },
  root_cause: { type: String },
  corrective_action: { type: String },
  preventive_action: { type: String },
  state: { type: String, default: 'open' },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
  resolution_date: { type: Date },
}, defaultSchemaOptions);

schema.index({ mo_id: 1 });
schema.index({ state: 1 });
schema.index({ workorder_id: 1 });
schema.index({ inspection_id: 1 });
schema.index({ product_id: 1 });
schema.index({ assigned_to: 1 });
schema.index({ severity: 1 });
schema.index({ mo_id: 1, state: 1 });

export default mongoose.models.MoNonConformance as mongoose.Model<IMoNonConformance> || mongoose.model<IMoNonConformance>('MoNonConformance', schema);
