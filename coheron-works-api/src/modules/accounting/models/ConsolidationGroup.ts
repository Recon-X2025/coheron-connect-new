import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IConsolidationGroup extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  parent_entity: string;
  subsidiaries: {
    entity_name: string;
    entity_id: mongoose.Types.ObjectId;
    ownership_percentage: number;
    currency: string;
    elimination_required: boolean;
  }[];
  consolidation_currency: string;
  is_active: boolean;
}

const subsidiarySchema = new Schema({
  entity_name: { type: String, required: true },
  entity_id: { type: Schema.Types.ObjectId, required: true },
  ownership_percentage: { type: Number, required: true },
  currency: { type: String, required: true },
  elimination_required: { type: Boolean, default: false },
}, { _id: false });

const consolidationGroupSchema = new Schema<IConsolidationGroup>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  parent_entity: { type: String, required: true },
  subsidiaries: [subsidiarySchema],
  consolidation_currency: { type: String, required: true, default: 'USD' },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

consolidationGroupSchema.index({ tenant_id: 1, name: 1 });

const ConsolidationGroupModel = mongoose.model<IConsolidationGroup>('ConsolidationGroup', consolidationGroupSchema);
export { ConsolidationGroupModel as ConsolidationGroup };
export default ConsolidationGroupModel;
