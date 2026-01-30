import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IIssueType extends Document {
  name: string;
  icon: string;
  description: string;
  is_active: boolean;
}

const issueTypeSchema = new Schema<IIssueType>({
  name: { type: String, required: true, unique: true },
  icon: { type: String },
  description: { type: String },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

// Indexes
issueTypeSchema.index({ is_active: 1 });

export default mongoose.model<IIssueType>('IssueType', issueTypeSchema);
