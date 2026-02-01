import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ISubscriptionLog extends Document {
  tenant_id: mongoose.Types.ObjectId;
  subscription_id: mongoose.Types.ObjectId;
  event_type: string;
  invoice_id?: mongoose.Types.ObjectId;
  notes?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
}

const SubscriptionLogSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  subscription_id: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
  event_type: {
    type: String,
    enum: ['created','activated','invoiced','paused','resumed','cancelled','renewed','expired','payment_failed'],
    required: true,
  },
  invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

SubscriptionLogSchema.index({ subscription_id: 1, created_at: 1 });

export const SubscriptionLog = mongoose.model<ISubscriptionLog>('SubscriptionLog', SubscriptionLogSchema);
export default SubscriptionLog;
