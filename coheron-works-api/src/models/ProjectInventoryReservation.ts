import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectInventoryReservation extends Document {
  project_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  batch_number?: string;
  serial_number?: string;
  status: string;
  reserved_date?: Date;
  created_at: Date;
  updated_at: Date;
}

const projectInventoryReservationSchema = new Schema<IProjectInventoryReservation>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  batch_number: { type: String },
  serial_number: { type: String },
  status: { type: String, default: 'reserved' },
  reserved_date: { type: Date, default: Date.now },
}, defaultSchemaOptions);

// Indexes
projectInventoryReservationSchema.index({ project_id: 1 });
projectInventoryReservationSchema.index({ task_id: 1 });
projectInventoryReservationSchema.index({ product_id: 1 });
projectInventoryReservationSchema.index({ status: 1 });
projectInventoryReservationSchema.index({ project_id: 1, status: 1 });
projectInventoryReservationSchema.index({ reserved_date: -1 });
projectInventoryReservationSchema.index({ created_at: -1 });

export default mongoose.model<IProjectInventoryReservation>('ProjectInventoryReservation', projectInventoryReservationSchema);
