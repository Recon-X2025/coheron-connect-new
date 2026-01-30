import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IDepartment extends Document {
  name: string;
  code: string;
  parent_id: mongoose.Types.ObjectId;
  head_id: mongoose.Types.ObjectId;
  is_active: boolean;
  tenant_id: mongoose.Types.ObjectId;
}

const departmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true },
  code: { type: String },
  parent_id: { type: Schema.Types.ObjectId, ref: 'Department' },
  head_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

departmentSchema.index({ tenant_id: 1 });
departmentSchema.index({ parent_id: 1 });
departmentSchema.index({ tenant_id: 1, is_active: 1 });

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
export default Department;
