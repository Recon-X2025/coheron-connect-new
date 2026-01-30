import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ISupportSurvey extends Document {
  name: string;
  survey_type: string;
  description: string;
  questions: any;
  trigger_event: string;
  is_active: boolean;
}

const supportSurveySchema = new Schema({
  name: { type: String, required: true },
  survey_type: { type: String, required: true },
  description: { type: String },
  questions: { type: Schema.Types.Mixed, required: true },
  trigger_event: { type: String },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

export interface ISurveyResponse extends Document {
  survey_id: mongoose.Types.ObjectId;
  ticket_id: mongoose.Types.ObjectId;
  partner_id: mongoose.Types.ObjectId;
  responses: any;
  score: number;
  feedback: string;
  submitted_at: Date;
}

const surveyResponseSchema = new Schema({
  survey_id: { type: Schema.Types.ObjectId, ref: 'SupportSurvey', required: true },
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  responses: { type: Schema.Types.Mixed, required: true },
  score: { type: Number },
  feedback: { type: String },
  submitted_at: { type: Date, default: Date.now },
}, schemaOptions);

// SupportSurvey indexes
supportSurveySchema.index({ survey_type: 1 });
supportSurveySchema.index({ is_active: 1 });
supportSurveySchema.index({ trigger_event: 1 });

// SurveyResponse indexes
surveyResponseSchema.index({ survey_id: 1 });
surveyResponseSchema.index({ ticket_id: 1 });
surveyResponseSchema.index({ partner_id: 1 });
surveyResponseSchema.index({ submitted_at: -1 });
surveyResponseSchema.index({ survey_id: 1, submitted_at: -1 });

export const SupportSurvey = mongoose.model<ISupportSurvey>('SupportSurvey', supportSurveySchema);
export const SurveyResponse = mongoose.model<ISurveyResponse>('SurveyResponse', surveyResponseSchema);

export default SupportSurvey;
