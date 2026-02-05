import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ITimesheet extends Document {
  project_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  date_worked: Date;
  hours_worked: number;
  description?: string;
  is_billable: boolean;
  approval_status: string;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const timesheetSchema = new Schema<ITimesheet>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date_worked: { type: Date, required: true },
  hours_worked: { type: Number, required: true },
  description: { type: String },
  is_billable: { type: Boolean, default: true },
  approval_status: { type: String, default: 'draft' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
}, defaultSchemaOptions);

// Timesheet indexes
timesheetSchema.index({ project_id: 1 });
timesheetSchema.index({ task_id: 1 });
timesheetSchema.index({ user_id: 1 });
timesheetSchema.index({ approved_by: 1 });
timesheetSchema.index({ approval_status: 1 });
timesheetSchema.index({ date_worked: -1 });
timesheetSchema.index({ project_id: 1, user_id: 1 });
timesheetSchema.index({ user_id: 1, date_worked: -1 });

export default mongoose.models.Timesheet as mongoose.Model<ITimesheet> || mongoose.model<ITimesheet>('Timesheet', timesheetSchema);
