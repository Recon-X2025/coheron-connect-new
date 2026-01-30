import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ISlaPolicy extends Document {
  name: string;
  description: string;
  priority: string;
  first_response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours_only: boolean;
  working_hours: any;
  timezone: string;
  is_active: boolean;
}

const slaPolicySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  priority: { type: String, required: true },
  first_response_time_minutes: { type: Number, required: true },
  resolution_time_minutes: { type: Number, required: true },
  business_hours_only: { type: Boolean, default: false },
  working_hours: { type: Schema.Types.Mixed },
  timezone: { type: String, default: 'UTC' },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// SlaPolicy indexes
slaPolicySchema.index({ priority: 1 });
slaPolicySchema.index({ is_active: 1 });

export const SlaPolicy = mongoose.model<ISlaPolicy>('SlaPolicy', slaPolicySchema);
export default SlaPolicy;
