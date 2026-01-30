import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoQualityChecklist extends Document {
  inspection_id: mongoose.Types.ObjectId;
  checklist_item: string;
  specification: string;
  actual_value: string;
  tolerance_min: number;
  tolerance_max: number;
  result: string;
  notes: string;
}

const schema = new Schema<IMoQualityChecklist>({
  inspection_id: { type: Schema.Types.ObjectId, ref: 'MoQualityInspection', required: true },
  checklist_item: { type: String, required: true },
  specification: { type: String },
  actual_value: { type: String },
  tolerance_min: { type: Number },
  tolerance_max: { type: Number },
  result: { type: String },
  notes: { type: String },
}, defaultSchemaOptions);

schema.index({ inspection_id: 1 });
schema.index({ result: 1 });

export default mongoose.model<IMoQualityChecklist>('MoQualityChecklist', schema);
