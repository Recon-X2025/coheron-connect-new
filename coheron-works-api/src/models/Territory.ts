import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface ITerritory extends Document {
  name: string;
  description: string;
  is_active: boolean;
}

const territorySchema = new Schema<ITerritory>({
  name: { type: String, required: true },
  description: { type: String },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

// Indexes
territorySchema.index({ is_active: 1 });

export default mongoose.model<ITerritory>('Territory', territorySchema);
