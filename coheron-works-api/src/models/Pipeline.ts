import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const stageSchema = new Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true },
  probability: { type: Number, default: 0 },
  rotting_days: { type: Number, default: 30 },
  win_stage: { type: Boolean, default: false },
  lost_stage: { type: Boolean, default: false },
}, { _id: true });

export interface IPipeline extends Document {
  name: string;
  tenant_id: mongoose.Types.ObjectId;
  is_default: boolean;
  stages: any[];
}

const pipelineSchema = new Schema<IPipeline>({
  name: { type: String, required: true },
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  is_default: { type: Boolean, default: false },
  stages: [stageSchema],
}, schemaOptions);

pipelineSchema.index({ tenant_id: 1 });
pipelineSchema.index({ tenant_id: 1, is_default: 1 });

export const Pipeline = mongoose.model<IPipeline>('Pipeline', pipelineSchema);
export default Pipeline;
