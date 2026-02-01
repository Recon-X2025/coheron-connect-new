import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IInterviewSchedule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  application_id: mongoose.Types.ObjectId;
  job_id: mongoose.Types.ObjectId;
  interview_type: 'phone_screen' | 'technical' | 'behavioral' | 'panel' | 'final';
  scheduled_at: Date;
  duration_minutes: number;
  location: string;
  meeting_link: string;
  interviewers: {
    user_id: mongoose.Types.ObjectId;
    role: 'lead' | 'participant';
    confirmed: boolean;
  }[];
  candidate_confirmed: boolean;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  feedback_submitted: boolean;
  notes: string;
}

const interviewScheduleSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  application_id: { type: Schema.Types.ObjectId, ref: 'JobApplication', required: true, index: true },
  job_id: { type: Schema.Types.ObjectId, ref: 'JobPosting' },
  interview_type: { type: String, enum: ['phone_screen', 'technical', 'behavioral', 'panel', 'final'], required: true },
  scheduled_at: { type: Date, required: true },
  duration_minutes: { type: Number, default: 60 },
  location: { type: String, default: '' },
  meeting_link: { type: String, default: '' },
  interviewers: [{
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['lead', 'participant'], default: 'participant' },
    confirmed: { type: Boolean, default: false },
  }],
  candidate_confirmed: { type: Boolean, default: false },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
  feedback_submitted: { type: Boolean, default: false },
  notes: { type: String, default: '' },
}, defaultSchemaOptions);

interviewScheduleSchema.index({ tenant_id: 1, scheduled_at: 1 });

export const InterviewSchedule = mongoose.model<IInterviewSchedule>('InterviewSchedule', interviewScheduleSchema);
