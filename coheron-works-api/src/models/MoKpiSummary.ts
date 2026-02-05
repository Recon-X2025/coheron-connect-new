import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoKpiSummary extends Document {
  mo_id: mongoose.Types.ObjectId;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  target_value: number;
}

const schema = new Schema<IMoKpiSummary>({
  mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  metric_name: { type: String, required: true },
  metric_value: { type: Number, default: 0 },
  metric_unit: { type: String },
  target_value: { type: Number },
}, defaultSchemaOptions);

schema.index({ mo_id: 1, metric_name: 1 });
schema.index({ metric_name: 1 });

export default mongoose.models.MoKpiSummary as mongoose.Model<IMoKpiSummary> || mongoose.model<IMoKpiSummary>('MoKpiSummary', schema);
