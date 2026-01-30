import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IWebsiteSite extends Document {
  name: string;
  domain: string;
  subdomain: string;
  locale: string;
  theme: string;
  settings: any;
  is_active: boolean;
  is_default: boolean;
}

const websiteSiteSchema = new Schema({
  name: { type: String, required: true },
  domain: { type: String, unique: true },
  subdomain: { type: String },
  locale: { type: String, default: 'en_US' },
  theme: { type: String, default: 'default' },
  settings: { type: Schema.Types.Mixed, default: {} },
  is_active: { type: Boolean, default: true },
  is_default: { type: Boolean, default: false },
}, schemaOptions);

// Indexes
websiteSiteSchema.index({ is_active: 1 });

export const WebsiteSite = mongoose.model<IWebsiteSite>('WebsiteSite', websiteSiteSchema);
export default WebsiteSite;
