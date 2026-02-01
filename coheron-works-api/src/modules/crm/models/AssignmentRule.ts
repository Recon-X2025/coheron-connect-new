import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IAssignmentRule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  entity_type: 'lead' | 'deal';
  priority: number;
  is_active: boolean;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'in' | 'not_in';
    value: any;
  }>;
  assignment_method: 'round_robin' | 'weighted' | 'territory' | 'least_loaded' | 'specific_user';
  config: {
    user_ids?: mongoose.Types.ObjectId[];
    territory_id?: mongoose.Types.ObjectId;
    weights?: any;
  };
  assigned_count: number;
  last_assigned_to: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
}

const assignmentRuleSchema = new Schema<IAssignmentRule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  entity_type: { type: String, enum: ['lead', 'deal'], default: 'lead' },
  priority: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  conditions: [{
    field: { type: String, required: true },
    operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'gt', 'lt', 'in', 'not_in'] },
    value: { type: Schema.Types.Mixed },
  }],
  assignment_method: { type: String, enum: ['round_robin', 'weighted', 'territory', 'least_loaded', 'specific_user'], default: 'round_robin' },
  config: {
    user_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    territory_id: { type: Schema.Types.ObjectId },
    weights: { type: Schema.Types.Mixed },
  },
  assigned_count: { type: Number, default: 0 },
  last_assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

assignmentRuleSchema.index({ tenant_id: 1, priority: 1 });

export const AssignmentRule = mongoose.model<IAssignmentRule>('AssignmentRule', assignmentRuleSchema);
