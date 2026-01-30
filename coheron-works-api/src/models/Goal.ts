import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const goalSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  title: { type: String, required: true },
  description: { type: String },
  goal_type: { type: String, default: 'okr' },
  target_value: { type: Number },
  current_value: { type: Number, default: 0 },
  status: { type: String, default: 'on_track' },
  due_date: { type: Date },
}, schemaOptions);

goalSchema.index({ employee_id: 1 });
goalSchema.index({ status: 1 });
goalSchema.index({ due_date: -1 });
goalSchema.index({ employee_id: 1, status: 1 });

export const Goal = mongoose.model('Goal', goalSchema);
