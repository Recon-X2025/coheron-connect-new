import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectRevenueRecognition extends Document {
  project_id: mongoose.Types.ObjectId;
  recognition_method: string;
  completion_percentage?: number;
  recognized_amount: number;
  deferred_amount: number;
  recognition_date: Date;
  accounting_period?: string;
  created_at: Date;
  updated_at: Date;
}

const projectRevenueRecognitionSchema = new Schema<IProjectRevenueRecognition>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  recognition_method: { type: String, required: true },
  completion_percentage: { type: Number },
  recognized_amount: { type: Number, required: true },
  deferred_amount: { type: Number, default: 0 },
  recognition_date: { type: Date, required: true },
  accounting_period: { type: String },
}, defaultSchemaOptions);

// Indexes
projectRevenueRecognitionSchema.index({ project_id: 1 });
projectRevenueRecognitionSchema.index({ recognition_date: -1 });
projectRevenueRecognitionSchema.index({ project_id: 1, recognition_date: -1 });
projectRevenueRecognitionSchema.index({ accounting_period: 1 });
projectRevenueRecognitionSchema.index({ created_at: -1 });

export default mongoose.models.ProjectRevenueRecognition as mongoose.Model<IProjectRevenueRecognition> || mongoose.model<IProjectRevenueRecognition>('ProjectRevenueRecognition', projectRevenueRecognitionSchema);
