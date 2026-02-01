import mongoose, { Schema, Document } from 'mongoose';

export interface IKanbanCard extends Document {
  tenant_id: mongoose.Types.ObjectId;
  board_id: mongoose.Types.ObjectId;
  column_name: string;
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source_location: string;
  destination_location: string;
  status: 'active' | 'completed' | 'cancelled';
  signal_type: 'production' | 'withdrawal' | 'supplier';
  triggered_by: mongoose.Types.ObjectId;
  completed_at: Date;
  cycle_time_hours: number;
  created_at: Date;
  updated_at: Date;
}

const kanbanCardSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  board_id: { type: Schema.Types.ObjectId, ref: 'KanbanBoard', required: true },
  column_name: { type: String, required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  source_location: String,
  destination_location: String,
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  signal_type: { type: String, enum: ['production', 'withdrawal', 'supplier'], default: 'production' },
  triggered_by: { type: Schema.Types.ObjectId, ref: 'User' },
  completed_at: Date,
  cycle_time_hours: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

kanbanCardSchema.index({ tenant_id: 1, board_id: 1, status: 1 });
kanbanCardSchema.index({ tenant_id: 1, product_id: 1 });

export const KanbanCard = mongoose.model<IKanbanCard>('KanbanCard', kanbanCardSchema);
