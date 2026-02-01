import mongoose, { Schema, Document } from 'mongoose';

export interface IAttributionModel extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  type: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'u_shaped' | 'w_shaped' | 'custom';
  config: {
    lookback_window_days: number;
    custom_weights: any;
  };
  is_default: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const attributionModelSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['first_touch', 'last_touch', 'linear', 'time_decay', 'u_shaped', 'w_shaped', 'custom'], required: true },
  config: {
    lookback_window_days: { type: Number, default: 30 },
    custom_weights: { type: Schema.Types.Mixed },
  },
  is_default: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

attributionModelSchema.index({ tenant_id: 1, is_default: 1 });

export const AttributionModel = mongoose.model<IAttributionModel>('AttributionModel', attributionModelSchema);
