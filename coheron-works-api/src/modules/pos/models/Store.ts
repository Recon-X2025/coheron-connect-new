import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IStore extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  phone: string;
  email: string;
  manager_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  is_active: boolean;
  operating_hours: { day: string; open: string; close: string }[];
  timezone: string;
}

const storeSchema = new Schema<IStore>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },
  },
  phone: { type: String },
  email: { type: String },
  manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
  warehouse_id: { type: Schema.Types.ObjectId },
  is_active: { type: Boolean, default: true },
  operating_hours: [{ day: String, open: String, close: String }],
  timezone: { type: String, default: 'UTC' },
}, defaultSchemaOptions);

storeSchema.index({ tenant_id: 1, code: 1 }, { unique: true });

export const Store = mongoose.model<IStore>('Store', storeSchema);
