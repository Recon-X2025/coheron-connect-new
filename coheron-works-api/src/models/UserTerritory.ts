import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IUserTerritory extends Document {
  territory_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  is_primary: boolean;
  assigned_by: mongoose.Types.ObjectId;
  assigned_at: Date;
}

const userTerritorySchema = new Schema<IUserTerritory>({
  territory_id: { type: Schema.Types.ObjectId, ref: 'Territory', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  is_primary: { type: Boolean, default: false },
  assigned_by: { type: Schema.Types.ObjectId, ref: 'User' },
  assigned_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

userTerritorySchema.index({ user_id: 1, territory_id: 1 }, { unique: true });

// Indexes (compound unique index above already covers user_id + territory_id)
userTerritorySchema.index({ territory_id: 1 });
userTerritorySchema.index({ assigned_by: 1 });

export default mongoose.model<IUserTerritory>('UserTerritory', userTerritorySchema);
