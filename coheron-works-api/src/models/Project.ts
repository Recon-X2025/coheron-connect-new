import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProject extends Document {
  key: string;
  code: string;
  name: string;
  description?: string;
  project_type?: string;
  industry_sector?: string;
  contract_type?: string;
  billing_type?: string;
  start_date?: Date;
  end_date?: Date;
  project_manager_id?: mongoose.Types.ObjectId;
  partner_id?: mongoose.Types.ObjectId;
  parent_program_id?: mongoose.Types.ObjectId;
  state?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

const projectSchema = new Schema<IProject>({
  key: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  project_type: { type: String, default: 'client' },
  industry_sector: { type: String },
  contract_type: { type: String, default: 'fixed_bid' },
  billing_type: { type: String, default: 'milestone' },
  start_date: { type: Date },
  end_date: { type: Date },
  project_manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  parent_program_id: { type: Schema.Types.ObjectId },
  state: { type: String, default: 'draft' },
  avatar_url: { type: String },
}, defaultSchemaOptions);

projectSchema.index({ project_manager_id: 1 });
projectSchema.index({ partner_id: 1 });
projectSchema.index({ state: 1 });
projectSchema.index({ state: 1, created_at: -1 });

export default mongoose.models.Project as mongoose.Model<IProject> || mongoose.model<IProject>('Project', projectSchema);
