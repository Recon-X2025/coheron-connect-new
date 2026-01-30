import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface ITerritoryRule extends Document {
  territory_id: mongoose.Types.ObjectId;
  rule_type: string;
  rule_value: string;
  priority: number;
  is_active: boolean;
}

const territoryRuleSchema = new Schema<ITerritoryRule>({
  territory_id: { type: Schema.Types.ObjectId, ref: 'Territory', required: true },
  rule_type: { type: String, required: true },
  rule_value: { type: String, required: true },
  priority: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

// Indexes
territoryRuleSchema.index({ territory_id: 1 });
territoryRuleSchema.index({ is_active: 1 });
territoryRuleSchema.index({ territory_id: 1, is_active: 1 });

export default mongoose.model<ITerritoryRule>('TerritoryRule', territoryRuleSchema);
