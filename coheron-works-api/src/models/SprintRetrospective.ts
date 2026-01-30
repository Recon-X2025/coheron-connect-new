import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ISprintRetrospectiveItem {
  category: string;
  content: string;
  assignee_id: mongoose.Types.ObjectId;
  due_date: Date;
  status: string;
}

export interface ISprintRetrospective extends Document {
  sprint_id: mongoose.Types.ObjectId;
  facilitator_id: mongoose.Types.ObjectId;
  notes: string;
  status: string;
  items: ISprintRetrospectiveItem[];
}

const retrospectiveItemSchema = new Schema({
  category: { type: String, required: true },
  content: { type: String, required: true },
  assignee_id: { type: Schema.Types.ObjectId, ref: 'User' },
  due_date: { type: Date },
  status: { type: String, default: 'open' },
}, { _id: true, timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const sprintRetrospectiveSchema = new Schema<ISprintRetrospective>({
  sprint_id: { type: Schema.Types.ObjectId, ref: 'Sprint', required: true, unique: true },
  facilitator_id: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  status: { type: String, default: 'draft' },
  items: [retrospectiveItemSchema],
}, defaultSchemaOptions);

// SprintRetrospective indexes (sprint_id already has unique: true)
sprintRetrospectiveSchema.index({ facilitator_id: 1 });
sprintRetrospectiveSchema.index({ status: 1 });

export default mongoose.model<ISprintRetrospective>('SprintRetrospective', sprintRetrospectiveSchema);
