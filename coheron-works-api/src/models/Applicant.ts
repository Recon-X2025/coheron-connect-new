import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const applicantSchema = new Schema({
  partner_name: { type: String },
  name: { type: String, required: true },
  email_from: { type: String },
  stage_id: { type: Number, default: 1 },
  priority: { type: Number, default: 0 },
}, schemaOptions);

applicantSchema.index({ stage_id: 1 });
applicantSchema.index({ priority: -1 });
applicantSchema.index({ created_at: -1 });

export const Applicant = mongoose.models.Applicant || mongoose.model('Applicant', applicantSchema);
