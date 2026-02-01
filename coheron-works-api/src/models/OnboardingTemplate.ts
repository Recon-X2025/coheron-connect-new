import mongoose, { Schema, Document } from 'mongoose';

export interface IOnboardingTemplate extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  department_id: mongoose.Types.ObjectId;
  designation: string;
  checklist: Array<{ item: string; description: string; assigned_role: string; due_days_from_joining: number; category: string }>;
  documents_required: Array<{ name: string; description: string; is_mandatory: boolean }>;
  training_course_ids: mongoose.Types.ObjectId[];
  welcome_email_template: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};


const checklistItemSchema = new Schema({
  item: { type: String, required: true },
  description: { type: String },
  assigned_role: { type: String },
  due_days_from_joining: { type: Number, default: 0 },
  category: { type: String, enum: ['documentation', 'it_setup', 'access', 'training', 'orientation', 'equipment'] },
}, { _id: false });

const documentRequiredSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  is_mandatory: { type: Boolean, default: true },
}, { _id: false });

const onboardingTemplateSchema = new Schema<IOnboardingTemplate>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, ref: 'Tenant' },
  name: { type: String, required: true },
  department_id: { type: Schema.Types.ObjectId, ref: 'Department' },
  designation: { type: String },
  checklist: [checklistItemSchema],
  documents_required: [documentRequiredSchema],
  training_course_ids: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  welcome_email_template: { type: String },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

onboardingTemplateSchema.index({ tenant_id: 1, department_id: 1 });

export const OnboardingTemplate = mongoose.model<IOnboardingTemplate>('OnboardingTemplate', onboardingTemplateSchema);
