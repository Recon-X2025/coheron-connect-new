import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const landingPageSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId },
  campaign_id: { type: Schema.Types.ObjectId },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  title: { type: String },
  description: { type: String },
  template: { type: String },
  css: { type: String },
  form_fields: [{
    name: { type: String },
    label: { type: String },
    type: { type: String, enum: ['text', 'email', 'phone', 'select', 'checkbox'] },
    options: [{ type: String }],
    required: { type: Boolean, default: false }
  }],
  thank_you_message: { type: String },
  redirect_url: { type: String },
  is_published: { type: Boolean, default: false },
  visits: { type: Number, default: 0 },
  submissions: { type: Number, default: 0 },
  conversion_rate: { type: Number, default: 0 },
  seo_title: { type: String },
  seo_description: { type: String },
  created_by: { type: Schema.Types.ObjectId },
}, schemaOptions);

landingPageSchema.index({ tenant_id: 1, slug: 1 }, { unique: true });
landingPageSchema.index({ tenant_id: 1, is_published: 1 });

export const LandingPage = mongoose.models.LandingPage || mongoose.model('LandingPage', landingPageSchema);
