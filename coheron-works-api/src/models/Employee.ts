import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const employeeSchema = new Schema({
  employee_id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  work_email: { type: String },
  work_phone: { type: String },
  job_title: { type: String },
  department_id: { type: Schema.Types.ObjectId },
  manager_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  hire_date: { type: Date },
  employment_type: { type: String },
  // Personal info (embedded - was separate table)
  date_of_birth: { type: Date },
  pan_number: { type: String },
  aadhaar_number: { type: String },
  address: { type: String },
  // Bank details (embedded - was separate table)
  bank_name: { type: String },
  account_number: { type: String },
  ifsc_code: { type: String },
}, schemaOptions);

employeeSchema.index({ department_id: 1 });
employeeSchema.index({ manager_id: 1 });
employeeSchema.index({ hire_date: -1 });
employeeSchema.index({ department_id: 1, hire_date: -1 });

export const Employee = mongoose.model('Employee', employeeSchema);
