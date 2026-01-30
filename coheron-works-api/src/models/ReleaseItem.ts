import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IReleaseItem extends Document {
  release_id: mongoose.Types.ObjectId;
  backlog_item_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const releaseItemSchema = new Schema<IReleaseItem>({
  release_id: { type: Schema.Types.ObjectId, ref: 'Release', required: true },
  backlog_item_id: { type: Schema.Types.ObjectId, ref: 'BacklogItem', required: true },
}, defaultSchemaOptions);

releaseItemSchema.index({ release_id: 1, backlog_item_id: 1 }, { unique: true });

// Indexes (compound unique index above already covers release_id + backlog_item_id)
releaseItemSchema.index({ backlog_item_id: 1 });

export default mongoose.model<IReleaseItem>('ReleaseItem', releaseItemSchema);
