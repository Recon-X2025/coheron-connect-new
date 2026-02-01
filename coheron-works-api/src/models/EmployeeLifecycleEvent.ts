import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeLifecycleEvent extends Document {
  tenant_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  event_type: string;
  event_date: Date;
  effective_date: Date;
  description: string;
  old_values: any;
  new_values: any;
  checklist: Array<{ item: string; completed: boolean; completed_by: mongoose.Types.ObjectId; completed_at: Date }>;
  documents: Array<{ name: string; url: string; type: string }>;
  approved_by: mongoose.Types.ObjectId;
  approved_at: Date;
  status: string;
  notes: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};


const checklistItemSchema = new Schema({
  item: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  completed_at: { type: Date },
}, { _id: false });

const documentSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String },
  type: { type: String },
}, { _id: false });

const employeeLifecycleEventSchema = new Schema<IEmployeeLifecycleEvent>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, ref: 'Tenant' },
  employee_id: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
  event_type: { type: String, required: true, enum: ['onboarding','promotion','transfer','role_change','salary_revision','warning','suspension','probation_confirmation','resignation','termination','retirement','exit_interview','final_settlement','rehire'] },
  event_date: { type: Date, required: true },
  effective_date: { type: Date },
  description: { type: String },
  old_values: { type: Schema.Types.Mixed },
  new_values: { type: Schema.Types.Mixed },
  checklist: [checklistItemSchema],
  documents: [documentSchema],
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'completed', 'cancelled'] },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

employeeLifecycleEventSchema.index({ tenant_id: 1, employee_id: 1, event_date: 1 });
employeeLifecycleEventSchema.index({ tenant_id: 1, event_type: 1 });

export const EmployeeLifecycleEvent = mongoose.model<IEmployeeLifecycleEvent>('EmployeeLifecycleEvent', employeeLifecycleEventSchema);
