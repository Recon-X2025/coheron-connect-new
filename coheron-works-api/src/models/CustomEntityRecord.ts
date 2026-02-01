import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const customEntityRecordSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  entity_slug: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  created_by: { type: Schema.Types.ObjectId },
  updated_by: { type: Schema.Types.ObjectId }
}, schemaOptions);

customEntityRecordSchema.index({ tenant_id: 1, entity_slug: 1, created_at: -1 });
customEntityRecordSchema.index({ tenant_id: 1, entity_slug: 1 });

export const CustomEntityRecord = mongoose.model('CustomEntityRecord', customEntityRecordSchema);
