import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IJobPosting extends Document {
  tenant_id: mongoose.Types.ObjectId;
  title: string;
  department: string;
  location: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
  description: string;
  requirements: string[];
  skills_required: string[];
  salary_range: {
    min: number;
    max: number;
    currency: string;
    show_on_posting: boolean;
  };
  hiring_manager_id: mongoose.Types.ObjectId;
  recruiter_id: mongoose.Types.ObjectId;
  pipeline_stages: { name: string; order: number }[];
  status: 'draft' | 'published' | 'closed' | 'on_hold';
  published_channels: string[];
  application_count: number;
  views_count: number;
  published_at?: Date;
  closes_at?: Date;
  created_by: mongoose.Types.ObjectId;
}

const jobPostingSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true },
  department: { type: String, default: '' },
  location: { type: String, default: '' },
  employment_type: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern'], default: 'full_time' },
  description: { type: String, default: '' },
  requirements: [{ type: String }],
  skills_required: [{ type: String }],
  salary_range: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    show_on_posting: { type: Boolean, default: false },
  },
  hiring_manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
  recruiter_id: { type: Schema.Types.ObjectId, ref: 'User' },
  pipeline_stages: [{
    name: { type: String, required: true },
    order: { type: Number, required: true },
  }],
  status: { type: String, enum: ['draft', 'published', 'closed', 'on_hold'], default: 'draft' },
  published_channels: [{ type: String }],
  application_count: { type: Number, default: 0 },
  views_count: { type: Number, default: 0 },
  published_at: Date,
  closes_at: Date,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

jobPostingSchema.index({ tenant_id: 1, status: 1 });
jobPostingSchema.index({ tenant_id: 1, department: 1 });

export const JobPosting = mongoose.model<IJobPosting>('JobPosting', jobPostingSchema);
