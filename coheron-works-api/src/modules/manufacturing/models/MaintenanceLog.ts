import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenanceLog extends Document {
  tenant_id: mongoose.Types.ObjectId;
  schedule_id?: mongoose.Types.ObjectId;
  equipment_id: mongoose.Types.ObjectId;
  log_type: 'preventive' | 'corrective' | 'breakdown' | 'inspection';
  title: string;
  description: string;
  started_at: Date;
  completed_at?: Date;
  downtime_hours: number;
  performed_by: mongoose.Types.ObjectId[];
  checklist_results: { task: string; completed: boolean; notes?: string }[];
  parts_used: { part_id: mongoose.Types.ObjectId; part_name: string; quantity: number; cost: number }[];
  total_cost: number;
  root_cause?: string;
  corrective_action?: string;
  status: 'in_progress' | 'completed' | 'pending_review';
  attachments: { name: string; url: string }[];
  created_at: Date;
  updated_at: Date;
}

const maintenanceLogSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  schedule_id: { type: Schema.Types.ObjectId, ref: 'MaintenanceSchedule' },
  equipment_id: { type: Schema.Types.ObjectId, required: true },
  log_type: { type: String, enum: ['preventive', 'corrective', 'breakdown', 'inspection'], required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  started_at: { type: Date, required: true },
  completed_at: Date,
  downtime_hours: { type: Number, default: 0 },
  performed_by: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  checklist_results: [{ task: String, completed: Boolean, notes: String }],
  parts_used: [{ part_id: Schema.Types.ObjectId, part_name: String, quantity: Number, cost: Number }],
  total_cost: { type: Number, default: 0 },
  root_cause: String,
  corrective_action: String,
  status: { type: String, enum: ['in_progress', 'completed', 'pending_review'], default: 'in_progress' },
  attachments: [{ name: String, url: String }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

maintenanceLogSchema.index({ tenant_id: 1, equipment_id: 1, started_at: -1 });

export const MaintenanceLog = mongoose.model<IMaintenanceLog>('MaintenanceLog', maintenanceLogSchema);
