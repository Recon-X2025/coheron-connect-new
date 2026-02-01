import mongoose, { Schema, Document } from 'mongoose';

export interface IShift extends Document {
  tenant_id: string;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  grace_period_minutes: number;
  is_night_shift: boolean;
  working_hours: number;
  color: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    tenant_id: { type: String, required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    break_duration_minutes: { type: Number, default: 0 },
    grace_period_minutes: { type: Number, default: 0 },
    is_night_shift: { type: Boolean, default: false },
    working_hours: { type: Number, default: 8 },
    color: { type: String, default: '#3B82F6' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ShiftSchema.index({ tenant_id: 1, code: 1 }, { unique: true });

export default mongoose.model<IShift>('Shift', ShiftSchema);
