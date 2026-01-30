import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IPartnerDealRegistration extends Document {
  partner_id: mongoose.Types.ObjectId;
  lead_id: mongoose.Types.ObjectId;
  opportunity_id: mongoose.Types.ObjectId;
  registration_number: string;
  status: string;
}

const partnerDealRegistrationSchema = new Schema<IPartnerDealRegistration>({
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  lead_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  opportunity_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  registration_number: { type: String },
  status: { type: String, default: 'pending' },
}, defaultSchemaOptions);

// Indexes
partnerDealRegistrationSchema.index({ partner_id: 1 });
partnerDealRegistrationSchema.index({ lead_id: 1 });
partnerDealRegistrationSchema.index({ opportunity_id: 1 });
partnerDealRegistrationSchema.index({ status: 1 });
partnerDealRegistrationSchema.index({ created_at: -1 });
partnerDealRegistrationSchema.index({ partner_id: 1, status: 1 });

export default mongoose.model<IPartnerDealRegistration>('PartnerDealRegistration', partnerDealRegistrationSchema);
