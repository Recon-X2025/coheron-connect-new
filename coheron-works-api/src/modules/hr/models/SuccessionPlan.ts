import mongoose, { Schema, Document } from 'mongoose';

export interface ISuccessionPlan extends Document {
  tenant_id: mongoose.Types.ObjectId;
  position_title: string;
  department: string;
  incumbent_id: mongoose.Types.ObjectId;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  risk_of_loss: 'high' | 'medium' | 'low';
  impact_of_loss: 'high' | 'medium' | 'low';
  status: 'active' | 'closed';
  notes: string;
  created_at: Date;
  updated_at: Date;
}

const successionPlanSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  position_title: { type: String, required: true },
  department: { type: String, required: true },
  incumbent_id: { type: Schema.Types.ObjectId, ref: 'User' },
  criticality: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  risk_of_loss: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  impact_of_loss: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  notes: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

successionPlanSchema.index({ tenant_id: 1, department: 1 });

export const SuccessionPlan = mongoose.model<ISuccessionPlan>('SuccessionPlan', successionPlanSchema);
