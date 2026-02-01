import mongoose, { Schema, Document } from 'mongoose';

export interface ISuccessionCandidate extends Document {
  tenant_id: mongoose.Types.ObjectId;
  plan_id: mongoose.Types.ObjectId;
  candidate_id: mongoose.Types.ObjectId;
  readiness: 'ready_now' | 'ready_1_year' | 'ready_2_years' | 'development_needed';
  strengths: string[];
  development_areas: string[];
  development_actions: Array<{
    action: string;
    target_date: Date;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  overall_rating: number;
  mentor_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const successionCandidateSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  plan_id: { type: Schema.Types.ObjectId, ref: 'SuccessionPlan', required: true },
  candidate_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  readiness: { type: String, enum: ['ready_now', 'ready_1_year', 'ready_2_years', 'development_needed'], default: 'development_needed' },
  strengths: [String],
  development_areas: [String],
  development_actions: [{
    action: String,
    target_date: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  }],
  overall_rating: { type: Number, min: 1, max: 5 },
  mentor_id: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

successionCandidateSchema.index({ tenant_id: 1, plan_id: 1 });

export const SuccessionCandidate = mongoose.model<ISuccessionCandidate>('SuccessionCandidate', successionCandidateSchema);
