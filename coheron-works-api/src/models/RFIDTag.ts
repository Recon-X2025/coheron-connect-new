import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IRFIDTag extends Document {
  tenant_id: mongoose.Types.ObjectId;
  epc: string;
  tag_type: string;
  frequency: string;
  associated_type: string;
  associated_id: mongoose.Types.ObjectId;
  last_read_location: string;
  last_read_at: Date;
  last_reader_id: mongoose.Types.ObjectId;
  read_count: number;
  status: string;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

const rfidTagSchema = new Schema<IRFIDTag>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  epc: { type: String, required: true },
  tag_type: { type: String, enum: ['passive', 'active', 'semi_active'], default: 'passive' },
  frequency: { type: String, enum: ['lf', 'hf', 'uhf'], default: 'uhf' },
  associated_type: { type: String, enum: ['product', 'serial_number', 'batch', 'bin_location', 'asset', 'employee'] },
  associated_id: { type: Schema.Types.ObjectId },
  last_read_location: { type: String },
  last_read_at: { type: Date },
  last_reader_id: { type: Schema.Types.ObjectId, ref: 'RFIDReader' },
  read_count: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'deactivated', 'damaged', 'lost'], default: 'active' },
  metadata: { type: Schema.Types.Mixed },
}, defaultSchemaOptions);

rfidTagSchema.index({ tenant_id: 1, epc: 1 }, { unique: true });
rfidTagSchema.index({ tenant_id: 1, associated_type: 1, associated_id: 1 });
rfidTagSchema.index({ tenant_id: 1, last_read_at: 1 });

export const RFIDTag = mongoose.model<IRFIDTag>('RFIDTag', rfidTagSchema);
export default RFIDTag;
