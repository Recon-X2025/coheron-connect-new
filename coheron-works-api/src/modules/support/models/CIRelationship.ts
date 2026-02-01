import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICIRelationship extends Document {
  tenant_id: mongoose.Types.ObjectId;
  source_ci_id: mongoose.Types.ObjectId;
  target_ci_id: mongoose.Types.ObjectId;
  relationship_type: string;
  description: string;
  is_active: boolean;
}

const ciRelationshipSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  source_ci_id: { type: Schema.Types.ObjectId, ref: 'ConfigurationItem', required: true },
  target_ci_id: { type: Schema.Types.ObjectId, ref: 'ConfigurationItem', required: true },
  relationship_type: { type: String, enum: ['depends_on', 'supports', 'connects_to', 'runs_on', 'part_of', 'managed_by'], required: true },
  description: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

ciRelationshipSchema.index({ tenant_id: 1, source_ci_id: 1 });
ciRelationshipSchema.index({ tenant_id: 1, target_ci_id: 1 });

export const CIRelationship = mongoose.model<ICIRelationship>('CIRelationship', ciRelationshipSchema);
export default CIRelationship;
