import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IBacklogItem extends Document {
  project_id: mongoose.Types.ObjectId;
  sprint_id?: mongoose.Types.ObjectId;
  epic_id?: mongoose.Types.ObjectId;
  item_type: string;
  title: string;
  description?: string;
  acceptance_criteria?: string;
  story_points?: number;
  priority: number;
  status: string;
  assignee_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const backlogItemSchema = new Schema<IBacklogItem>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  sprint_id: { type: Schema.Types.ObjectId, ref: 'Sprint' },
  epic_id: { type: Schema.Types.ObjectId, ref: 'BacklogItem' },
  item_type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  acceptance_criteria: { type: String },
  story_points: { type: Number },
  priority: { type: Number, default: 0 },
  status: { type: String, default: 'backlog' },
  assignee_id: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// BacklogItem indexes
backlogItemSchema.index({ project_id: 1 });
backlogItemSchema.index({ sprint_id: 1 });
backlogItemSchema.index({ epic_id: 1 });
backlogItemSchema.index({ assignee_id: 1 });
backlogItemSchema.index({ status: 1 });
backlogItemSchema.index({ item_type: 1 });
backlogItemSchema.index({ project_id: 1, status: 1 });
backlogItemSchema.index({ project_id: 1, sprint_id: 1 });

export default mongoose.model<IBacklogItem>('BacklogItem', backlogItemSchema);
