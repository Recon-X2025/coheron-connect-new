import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IKnowledgeSpace extends Document {
  project_id?: mongoose.Types.ObjectId;
  space_key: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const knowledgeSpaceSchema = new Schema<IKnowledgeSpace>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
  space_key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  is_public: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// KnowledgeSpace indexes (space_key already has unique: true)
knowledgeSpaceSchema.index({ project_id: 1 });
knowledgeSpaceSchema.index({ created_by: 1 });
knowledgeSpaceSchema.index({ is_public: 1 });

export default mongoose.model<IKnowledgeSpace>('KnowledgeSpace', knowledgeSpaceSchema);
