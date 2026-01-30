import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const activitySchema = new Schema({
  res_id: { type: Schema.Types.ObjectId },
  res_model: { type: String },
  activity_type: { type: String, default: 'note' },
  summary: { type: String },
  description: { type: String },
  date_deadline: { type: Date },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  state: { type: String, default: 'planned' },
  duration: { type: Number },
}, schemaOptions);

activitySchema.index({ res_id: 1, res_model: 1 });
activitySchema.index({ user_id: 1 });
activitySchema.index({ state: 1 });
activitySchema.index({ date_deadline: 1 });
activitySchema.index({ user_id: 1, state: 1 });

export const Activity = mongoose.model('Activity', activitySchema);
