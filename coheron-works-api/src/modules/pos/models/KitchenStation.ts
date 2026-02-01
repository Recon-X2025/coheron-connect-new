import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IKitchenStation extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  display_name: string;
  station_type: 'grill' | 'fryer' | 'salad' | 'dessert' | 'bar' | 'general';
  is_active: boolean;
  printer_ip: string;
  display_color: string;
}

const kitchenStationSchema = new Schema<IKitchenStation>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  display_name: { type: String },
  station_type: { type: String, enum: ['grill', 'fryer', 'salad', 'dessert', 'bar', 'general'], default: 'general' },
  is_active: { type: Boolean, default: true },
  printer_ip: { type: String },
  display_color: { type: String, default: '#00C971' },
}, defaultSchemaOptions);

kitchenStationSchema.index({ tenant_id: 1, name: 1 });

export const KitchenStation = mongoose.model<IKitchenStation>('KitchenStation', kitchenStationSchema);
