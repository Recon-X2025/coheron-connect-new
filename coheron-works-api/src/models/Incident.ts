import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

// INCIDENT
export interface IIncident extends Document {
  incident_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  impact: string;
  urgency: string;
  affected_users: number;
  affected_systems: string[];
  assigned_to: mongoose.Types.ObjectId;
  resolution: string;
  resolved_at: Date;
  closed_at: Date;
}

const incidentSchema = new Schema({
  incident_number: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'open' },
  priority: { type: String, required: true },
  impact: { type: String, required: true },
  urgency: { type: String, required: true },
  affected_users: { type: Number },
  affected_systems: [{ type: String }],
  assigned_to: { type: Schema.Types.ObjectId, ref: 'SupportAgent' },
  resolution: { type: String },
  resolved_at: { type: Date },
  closed_at: { type: Date },
}, schemaOptions);

// PROBLEM
export interface IProblem extends Document {
  problem_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: mongoose.Types.ObjectId;
  related_incidents: string[];
  root_cause_analysis: string;
  solution: string;
  known_error: boolean;
  resolved_at: Date;
}

const problemSchema = new Schema({
  problem_number: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'open' },
  priority: { type: String, default: 'medium' },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'SupportAgent' },
  related_incidents: [{ type: String }],
  root_cause_analysis: { type: String },
  solution: { type: String },
  known_error: { type: Boolean, default: false },
  resolved_at: { type: Date },
}, schemaOptions);

// CHANGE REQUEST
export interface IChange extends Document {
  change_number: string;
  title: string;
  description: string;
  change_type: string;
  status: string;
  priority: string;
  requested_by: mongoose.Types.ObjectId;
  approved_by: mongoose.Types.ObjectId;
  implemented_by: mongoose.Types.ObjectId;
  risk_level: string;
  impact_analysis: string;
  rollback_plan: string;
  scheduled_start: Date;
  scheduled_end: Date;
  actual_start: Date;
  actual_end: Date;
}

const changeSchema = new Schema({
  change_number: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  change_type: { type: String, default: 'normal' },
  status: { type: String, default: 'draft' },
  priority: { type: String, default: 'medium' },
  requested_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  implemented_by: { type: Schema.Types.ObjectId, ref: 'User' },
  risk_level: { type: String, default: 'medium' },
  impact_analysis: { type: String },
  rollback_plan: { type: String },
  scheduled_start: { type: Date },
  scheduled_end: { type: Date },
  actual_start: { type: Date },
  actual_end: { type: Date },
}, schemaOptions);

// CAB MEMBER
export interface IChangeCabMember extends Document {
  change_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role: string;
  approval_status: string;
  comments: string;
  approved_at: Date;
}

const changeCabMemberSchema = new Schema({
  change_id: { type: Schema.Types.ObjectId, ref: 'Change', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, default: 'reviewer' },
  approval_status: { type: String, default: 'pending' },
  comments: { type: String },
  approved_at: { type: Date },
}, schemaOptions);
changeCabMemberSchema.index({ change_id: 1, user_id: 1 }, { unique: true });

// SERVICE REQUEST (referenced in task but not in itsm.ts routes - add minimal model)
const serviceRequestSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'open' },
  priority: { type: String, default: 'medium' },
  requested_by: { type: Schema.Types.ObjectId, ref: 'User' },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'SupportAgent' },
}, schemaOptions);

// Incident indexes
incidentSchema.index({ status: 1 });
incidentSchema.index({ priority: 1 });
incidentSchema.index({ assigned_to: 1 });
incidentSchema.index({ status: 1, priority: 1 });
incidentSchema.index({ created_at: -1 });

// Problem indexes
problemSchema.index({ status: 1 });
problemSchema.index({ priority: 1 });
problemSchema.index({ assigned_to: 1 });

// Change indexes
changeSchema.index({ status: 1 });
changeSchema.index({ priority: 1 });
changeSchema.index({ requested_by: 1 });
changeSchema.index({ approved_by: 1 });
changeSchema.index({ implemented_by: 1 });
changeSchema.index({ change_type: 1 });
changeSchema.index({ scheduled_start: 1 });

// ChangeCabMember indexes (compound unique index already covers change_id + user_id)
changeCabMemberSchema.index({ approval_status: 1 });

// ServiceRequest indexes
serviceRequestSchema.index({ status: 1 });
serviceRequestSchema.index({ requested_by: 1 });
serviceRequestSchema.index({ assigned_to: 1 });

export const Incident = mongoose.model<IIncident>('Incident', incidentSchema);
export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
export const Change = mongoose.model<IChange>('Change', changeSchema);
export const ChangeCabMember = mongoose.model<IChangeCabMember>('ChangeCabMember', changeCabMemberSchema);
export const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

export default Incident;
