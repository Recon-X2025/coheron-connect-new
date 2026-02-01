import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};


const recipientSchema = new Schema({
  phone: { type: String, required: true },
  name: { type: String },
  variables: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

const smsCampaignSchema = new Schema({
  tenant_id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  sms_provider: { type: String, enum: ["twilio", "msg91", "textlocal", "custom"], default: "twilio" },
  api_key: { type: String },
  api_secret: { type: String },
  sender_id: { type: String },
  template_id: { type: String },
  message_template: { type: String },
  recipients: [recipientSchema],
  total_recipients: { type: Number, default: 0 },
  sent_count: { type: Number, default: 0 },
  delivered_count: { type: Number, default: 0 },
  failed_count: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "scheduled", "sending", "completed", "cancelled"], default: "draft" },
  scheduled_at: { type: Date },
  started_at: { type: Date },
  completed_at: { type: Date },
  cost_per_sms: { type: Number, default: 0 },
  total_cost: { type: Number, default: 0 },
  created_by: { type: Schema.Types.ObjectId, ref: "User" },
}, schemaOptions);

smsCampaignSchema.index({ tenant_id: 1, status: 1 });
smsCampaignSchema.index({ tenant_id: 1, created_at: -1 });

export interface ISMSCampaign extends Document {
  tenant_id: string;
  name: string;
  description?: string;
  sms_provider: string;
  api_key?: string;
  api_secret?: string;
  sender_id?: string;
  template_id?: string;
  message_template?: string;
  recipients: { phone: string; name?: string; variables?: Record<string, any> }[];
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  status: string;
  scheduled_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  cost_per_sms: number;
  total_cost: number;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export const SMSCampaign = mongoose.model<ISMSCampaign>("SMSCampaign", smsCampaignSchema);
