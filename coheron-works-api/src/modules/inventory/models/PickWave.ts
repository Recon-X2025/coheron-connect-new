import mongoose, { Schema, Document } from 'mongoose';

export interface IPickWave extends Document {
  tenant_id: mongoose.Types.ObjectId;
  wave_number: string;
  warehouse_id: mongoose.Types.ObjectId;
  status: 'draft' | 'released' | 'in_progress' | 'completed' | 'cancelled';
  pick_type: 'wave' | 'batch' | 'zone' | 'cluster';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  orders: mongoose.Types.ObjectId[];
  pick_lists: mongoose.Types.ObjectId[];
  assigned_to: mongoose.Types.ObjectId[];
  total_items: number;
  picked_items: number;
  started_at?: Date;
  completed_at?: Date;
  notes?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const pickWaveSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  wave_number: { type: String, required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  status: { type: String, enum: ['draft', 'released', 'in_progress', 'completed', 'cancelled'], default: 'draft' },
  pick_type: { type: String, enum: ['wave', 'batch', 'zone', 'cluster'], default: 'wave' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  orders: [{ type: Schema.Types.ObjectId, ref: 'SaleOrder' }],
  pick_lists: [{ type: Schema.Types.ObjectId, ref: 'PickList' }],
  assigned_to: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  total_items: { type: Number, default: 0 },
  picked_items: { type: Number, default: 0 },
  started_at: Date,
  completed_at: Date,
  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

pickWaveSchema.index({ tenant_id: 1, wave_number: 1 }, { unique: true });

export const PickWave = mongoose.model<IPickWave>('PickWave', pickWaveSchema);
