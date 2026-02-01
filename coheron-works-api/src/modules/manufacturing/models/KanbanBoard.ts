import mongoose, { Schema, Document } from 'mongoose';

export interface IKanbanBoard extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  work_center_id: mongoose.Types.ObjectId;
  columns: {
    name: string;
    wip_limit: number;
    color: string;
    order: number;
  }[];
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const columnSchema = new Schema({
  name: { type: String, required: true },
  wip_limit: { type: Number, default: 0 },
  color: { type: String, default: '#00C971' },
  order: { type: Number, default: 0 },
}, { _id: false });

const kanbanBoardSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  work_center_id: { type: Schema.Types.ObjectId, ref: 'WorkCenter' },
  columns: [columnSchema],
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

kanbanBoardSchema.index({ tenant_id: 1, is_active: 1 });

export const KanbanBoard = mongoose.model<IKanbanBoard>('KanbanBoard', kanbanBoardSchema);
