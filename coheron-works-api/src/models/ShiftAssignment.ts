import mongoose, { Schema, Document } from 'mongoose';

export interface IShiftAssignment extends Document {
  tenant_id: string;
  employee_id: mongoose.Types.ObjectId;
  shift_id: mongoose.Types.ObjectId;
  start_date: Date;
  end_date?: Date;
  is_recurring: boolean;
  recurrence_pattern: 'daily' | 'weekly' | 'custom';
  custom_days: number[];
  status: 'active' | 'swapped' | 'cancelled';
  swapped_with_employee_id?: mongoose.Types.ObjectId;
  notes?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ShiftAssignmentSchema = new Schema<IShiftAssignment>(
  {
    tenant_id: { type: String, required: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    shift_id: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date },
    is_recurring: { type: Boolean, default: false },
    recurrence_pattern: { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
    custom_days: [{ type: Number, min: 0, max: 6 }],
    status: { type: String, enum: ['active', 'swapped', 'cancelled'], default: 'active' },
    swapped_with_employee_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
    notes: { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ShiftAssignmentSchema.index({ tenant_id: 1, employee_id: 1, start_date: 1 });
ShiftAssignmentSchema.index({ tenant_id: 1, shift_id: 1 });

export default mongoose.model<IShiftAssignment>('ShiftAssignment', ShiftAssignmentSchema);
