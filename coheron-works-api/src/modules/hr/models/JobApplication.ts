import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IJobApplication extends Document {
  tenant_id: mongoose.Types.ObjectId;
  job_id: mongoose.Types.ObjectId;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  resume_url: string;
  cover_letter: string;
  source: 'career_page' | 'linkedin' | 'referral' | 'agency' | 'indeed' | 'other';
  current_stage: string;
  stage_history: {
    stage: string;
    entered_at: Date;
    exited_at?: Date;
    moved_by?: mongoose.Types.ObjectId;
  }[];
  rating: number;
  interview_scores: {
    interviewer_id: mongoose.Types.ObjectId;
    criteria: { name: string; score: number; max_score: number }[];
    overall_score: number;
    feedback: string;
    interviewed_at: Date;
  }[];
  offer: {
    salary: number;
    start_date?: Date;
    benefits: string;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
    sent_at?: Date;
    responded_at?: Date;
  };
  status: 'active' | 'hired' | 'rejected' | 'withdrawn';
  rejection_reason: string;
  referral_employee_id?: mongoose.Types.ObjectId;
  tags: string[];
}

const jobApplicationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  job_id: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
  candidate_name: { type: String, required: true },
  candidate_email: { type: String, required: true },
  candidate_phone: { type: String, default: '' },
  resume_url: { type: String, default: '' },
  cover_letter: { type: String, default: '' },
  source: { type: String, enum: ['career_page', 'linkedin', 'referral', 'agency', 'indeed', 'other'], default: 'other' },
  current_stage: { type: String, default: 'Applied' },
  stage_history: [{
    stage: String,
    entered_at: { type: Date, default: Date.now },
    exited_at: Date,
    moved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  }],
  rating: { type: Number, min: 1, max: 5, default: 0 },
  interview_scores: [{
    interviewer_id: { type: Schema.Types.ObjectId, ref: 'User' },
    criteria: [{ name: String, score: Number, max_score: Number }],
    overall_score: Number,
    feedback: String,
    interviewed_at: Date,
  }],
  offer: {
    salary: Number,
    start_date: Date,
    benefits: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'countered'] },
    sent_at: Date,
    responded_at: Date,
  },
  status: { type: String, enum: ['active', 'hired', 'rejected', 'withdrawn'], default: 'active' },
  rejection_reason: { type: String, default: '' },
  referral_employee_id: { type: Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String }],
}, defaultSchemaOptions);

jobApplicationSchema.index({ tenant_id: 1, job_id: 1, status: 1 });
jobApplicationSchema.index({ tenant_id: 1, candidate_email: 1 });

export const JobApplication = mongoose.model<IJobApplication>('JobApplication', jobApplicationSchema);
