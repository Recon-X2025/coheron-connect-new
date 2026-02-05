import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectRisk extends Document {
  project_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  probability: number;
  impact: number;
  risk_score?: number;
  status: string;
  mitigation_plan?: string;
  mitigation_owner?: mongoose.Types.ObjectId;
  owner_id?: mongoose.Types.ObjectId;
  residual_risk_score?: number;
  created_at: Date;
  updated_at: Date;
}

const projectRiskSchema = new Schema<IProjectRisk>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  probability: { type: Number, default: 3 },
  impact: { type: Number, default: 3 },
  risk_score: { type: Number },
  status: { type: String, default: 'identified' },
  mitigation_plan: { type: String },
  mitigation_owner: { type: Schema.Types.ObjectId, ref: 'User' },
  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  residual_risk_score: { type: Number },
}, defaultSchemaOptions);

// Indexes
projectRiskSchema.index({ project_id: 1 });
projectRiskSchema.index({ status: 1 });
projectRiskSchema.index({ project_id: 1, status: 1 });
projectRiskSchema.index({ owner_id: 1 });
projectRiskSchema.index({ mitigation_owner: 1 });
projectRiskSchema.index({ created_at: -1 });

projectRiskSchema.pre('save', function () {
  this.risk_score = this.probability * this.impact;
});

export default mongoose.models.ProjectRisk as mongoose.Model<IProjectRisk> || mongoose.model<IProjectRisk>('ProjectRisk', projectRiskSchema);
