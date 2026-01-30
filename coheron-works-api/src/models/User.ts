import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IUser extends Document {
  uid: number;
  name: string;
  email: string;
  password_hash: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>({
  uid: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  active: { type: Boolean, default: true },
}, defaultSchemaOptions);

// Indexes
userSchema.index({ active: 1 });
userSchema.index({ created_at: -1 });

export default mongoose.model<IUser>('User', userSchema);
