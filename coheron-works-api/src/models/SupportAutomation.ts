import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ISupportAutomation extends Document {
  name: string;
  description: string;
  trigger_event: string;
  trigger_conditions: any;
  actions: any;
  is_active: boolean;
  execution_order: number;
}

const supportAutomationSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  trigger_event: { type: String, required: true },
  trigger_conditions: { type: Schema.Types.Mixed, required: true },
  actions: { type: Schema.Types.Mixed, required: true },
  is_active: { type: Boolean, default: true },
  execution_order: { type: Number, default: 0 },
}, schemaOptions);

// SupportAutomation indexes
supportAutomationSchema.index({ is_active: 1 });
supportAutomationSchema.index({ trigger_event: 1 });
supportAutomationSchema.index({ is_active: 1, execution_order: 1 });

export const SupportAutomation = mongoose.model<ISupportAutomation>('SupportAutomation', supportAutomationSchema);
export default SupportAutomation;
