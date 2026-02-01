import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenanceSchedule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  schedule_name: string;
  equipment_id: mongoose.Types.ObjectId;
  equipment_name: string;
  maintenance_type: 'preventive' | 'predictive' | 'condition_based';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'usage_based';
  frequency_value?: number;
  frequency_unit?: 'hours' | 'cycles' | 'km' | 'units_produced';
  last_maintenance_date?: Date;
  next_maintenance_date: Date;
  assigned_team: mongoose.Types.ObjectId[];
  checklist: { task: string; is_critical: boolean }[];
  estimated_duration_hours: number;
  status: 'active' | 'paused' | 'completed';
  mtbf_hours?: number;
  mttr_hours?: number;
  total_breakdowns: number;
  total_downtime_hours: number;
  total_operational_hours: number;
  cost_per_maintenance: number;
  spare_parts: { part_id: mongoose.Types.ObjectId; part_name: string; quantity: number }[];
  created_at: Date;
  updated_at: Date;
}

const maintenanceScheduleSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  schedule_name: { type: String, required: true },
  equipment_id: { type: Schema.Types.ObjectId, required: true },
  equipment_name: { type: String, required: true },
  maintenance_type: { type: String, enum: ['preventive', 'predictive', 'condition_based'], default: 'preventive' },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'usage_based'], required: true },
  frequency_value: Number,
  frequency_unit: { type: String, enum: ['hours', 'cycles', 'km', 'units_produced'] },
  last_maintenance_date: Date,
  next_maintenance_date: { type: Date, required: true },
  assigned_team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  checklist: [{ task: String, is_critical: { type: Boolean, default: false } }],
  estimated_duration_hours: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  mtbf_hours: Number,
  mttr_hours: Number,
  total_breakdowns: { type: Number, default: 0 },
  total_downtime_hours: { type: Number, default: 0 },
  total_operational_hours: { type: Number, default: 0 },
  cost_per_maintenance: { type: Number, default: 0 },
  spare_parts: [{ part_id: Schema.Types.ObjectId, part_name: String, quantity: Number }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

maintenanceScheduleSchema.index({ tenant_id: 1, next_maintenance_date: 1 });

export const MaintenanceSchedule = mongoose.model<IMaintenanceSchedule>('MaintenanceSchedule', maintenanceScheduleSchema);
