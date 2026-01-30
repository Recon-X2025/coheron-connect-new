import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IPartner extends Document {
  name: string;
  email: string;
  phone: string;
  company: string;
  type: string;
  image_url: string;
}

const partnerSchema = new Schema<IPartner>({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  company: { type: String },
  type: { type: String, default: 'contact' },
  image_url: { type: String },
}, defaultSchemaOptions);

partnerSchema.index({ name: 1 });
partnerSchema.index({ email: 1 });
partnerSchema.index({ type: 1 });
partnerSchema.index({ company: 1 });

const PartnerModel = mongoose.model<IPartner>('Partner', partnerSchema);
export { PartnerModel as Partner };
export default PartnerModel;
