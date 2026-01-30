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

  // --- Enhanced personal ---
  first_name: { type: String },
  last_name: { type: String },
  middle_name: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  marital_status: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
  blood_group: { type: String },
  personal_email: { type: String },
  personal_phone: { type: String },
  current_address: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: 'India' },
  },
  permanent_address: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: 'India' },
  },
  emergency_contact: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String },
  },

  // --- Status & employment ---
  status: { type: String, enum: ['active', 'probation', 'notice', 'suspended', 'separated', 'retired'], default: 'active' },
  joining_date: { type: Date },
  confirmation_date: { type: Date },
  probation_end_date: { type: Date },
  resignation_date: { type: Date },
  exit_date: { type: Date },
  notice_period_days: { type: Number },
  designation: { type: String },
  reports_to: { type: Schema.Types.ObjectId, ref: 'Employee' },
  location: { type: String },
  team: { type: String },

  // --- Salary ---
  salary: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    special_allowance: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    ctc: { type: Number, default: 0 },
    components: [{
      name: { type: String },
      amount: { type: Number },
      type: { type: String, enum: ['earning', 'deduction'] },
    }],
    revision_history: [{
      effective_date: { type: Date },
      old_ctc: { type: Number },
      new_ctc: { type: Number },
      reason: { type: String },
    }],
  },

  // --- Statutory (India) ---
  statutory_india: {
    uan: { type: String },
    pf_number: { type: String },
    esi_number: { type: String },
    tax_regime: { type: String, enum: ['old', 'new'], default: 'new' },
  },

  // --- Leave balances ---
  leave_balances: [{
    leave_type: { type: String },
    total: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
  }],

  // --- Attendance config ---
  attendance_config: {
    shift: { type: String },
    work_hours_per_day: { type: Number, default: 8 },
    week_off_days: [{ type: String }],
  },

  // --- Education ---
  education: [{
    degree: { type: String },
    institution: { type: String },
    year_of_passing: { type: Number },
    grade: { type: String },
  }],

  // --- Experience ---
  experience: [{
    company: { type: String },
    designation: { type: String },
    from_date: { type: Date },
    to_date: { type: Date },
    description: { type: String },
  }],

  // --- Skills & Certifications ---
  skills: [{ type: String }],
  certifications: [{
    name: { type: String },
    issuer: { type: String },
    issue_date: { type: Date },
    expiry_date: { type: Date },
  }],

  // --- Documents ---
  documents: [{
    name: { type: String },
    type: { type: String },
    file_url: { type: String },
    uploaded_at: { type: Date, default: Date.now },
  }],

  // --- Assets ---
  assets: [{
    name: { type: String },
    asset_id: { type: String },
    assigned_date: { type: Date },
    return_date: { type: Date },
  }],

  // --- Tenant ---
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

employeeSchema.index({ department_id: 1 });
employeeSchema.index({ manager_id: 1 });
employeeSchema.index({ hire_date: -1 });
employeeSchema.index({ department_id: 1, hire_date: -1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ tenant_id: 1 });
employeeSchema.index({ tenant_id: 1, department_id: 1 });
employeeSchema.index({ tenant_id: 1, status: 1 });
employeeSchema.index({ reports_to: 1 });

export const Employee = mongoose.model('Employee', employeeSchema);
