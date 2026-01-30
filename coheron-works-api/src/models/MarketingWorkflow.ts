import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const marketingWorkflowSchema = new Schema({
  name: { type: String },
  campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  trigger_type: { type: String },
  trigger_conditions: { type: Schema.Types.Mixed, default: {} },
  steps: { type: Schema.Types.Mixed, default: [] },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// MarketingWorkflow indexes
marketingWorkflowSchema.index({ campaign_id: 1 });
marketingWorkflowSchema.index({ is_active: 1 });
marketingWorkflowSchema.index({ trigger_type: 1 });

export const MarketingWorkflow = mongoose.model('MarketingWorkflow', marketingWorkflowSchema);
