import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IObjective extends Document {
  tenant_id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  owner_id: mongoose.Types.ObjectId;
  period: string;
  year: number;
  status: string;
  progress: number;
  parent_objective_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
}

const objectiveSchema = new Schema<IObjective>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  period: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
  year: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  parent_objective_id: { type: Schema.Types.ObjectId, ref: 'Objective' },
  project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
}, defaultSchemaOptions);

objectiveSchema.index({ tenant_id: 1, year: 1, period: 1 });
objectiveSchema.index({ tenant_id: 1, owner_id: 1 });

export const Objective = mongoose.model<IObjective>('Objective', objectiveSchema);
