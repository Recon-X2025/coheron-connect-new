import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const costCenterSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'CostCenter', default: null },
  type: { type: String, enum: ['cost_center', 'profit_center', 'department'], required: true },
  manager_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  is_active: { type: Boolean, default: true },
  budget_amount: { type: Number, default: 0 },
  actual_amount: { type: Number, default: 0 },
}, schemaOptions);

costCenterSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
costCenterSchema.index({ tenant_id: 1, parent_id: 1 });

export default mongoose.models.CostCenter || mongoose.model('CostCenter', costCenterSchema);
