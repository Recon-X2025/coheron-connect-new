import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IRouting extends Document {
  name: string;
  code: string;
  active: boolean;
  company_id: mongoose.Types.ObjectId;
  location_id: mongoose.Types.ObjectId;
  note: string;
}

const routingSchema = new Schema<IRouting>({
  name: { type: String, required: true },
  code: { type: String },
  active: { type: Boolean, default: true },
  company_id: { type: Schema.Types.ObjectId },
  location_id: { type: Schema.Types.ObjectId },
  note: { type: String },
}, defaultSchemaOptions);

routingSchema.index({ name: 1 });
routingSchema.index({ active: 1 });
routingSchema.index({ company_id: 1 });

export default mongoose.model<IRouting>('Routing', routingSchema);
