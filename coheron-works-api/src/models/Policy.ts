import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const policySchema = new Schema({
  name: { type: String, required: true },
  category: { type: String },
  body: { type: String },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

policySchema.index({ category: 1 });
policySchema.index({ is_active: 1 });

export const Policy = mongoose.models.Policy || mongoose.model('Policy', policySchema);
