import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};


const smsLogSchema = new Schema({
  tenant_id: { type: String, required: true },
  campaign_id: { type: Schema.Types.ObjectId, ref: "SMSCampaign" },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["queued", "sent", "delivered", "failed"], default: "queued" },
  provider_message_id: { type: String },
  error_message: { type: String },
  cost: { type: Number, default: 0 },
  sent_at: { type: Date },
  delivered_at: { type: Date },
}, schemaOptions);

smsLogSchema.index({ tenant_id: 1, campaign_id: 1 });
smsLogSchema.index({ tenant_id: 1, phone: 1 });

export interface ISMSLog extends Document {
  tenant_id: string;
  campaign_id?: mongoose.Types.ObjectId;
  phone: string;
  message: string;
  status: string;
  provider_message_id?: string;
  error_message?: string;
  cost: number;
  sent_at?: Date;
  delivered_at?: Date;
  created_at: Date;
}

export const SMSLog = mongoose.model<ISMSLog>("SMSLog", smsLogSchema);
