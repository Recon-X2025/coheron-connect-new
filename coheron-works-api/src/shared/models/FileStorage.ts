import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const fileStorageSchema = new Schema({
  original_name: { type: String, required: true },
  storage_key: { type: String, required: true },
  mime_type: { type: String },
  size: { type: Number },
  uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
  entity_type: { type: String }, // 'esignature', 'ticket', 'product', etc.
  entity_id: { type: Schema.Types.ObjectId },
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

fileStorageSchema.index({ storage_key: 1 });
fileStorageSchema.index({ entity_type: 1, entity_id: 1 });
fileStorageSchema.index({ tenant_id: 1 });

export const FileStorage = mongoose.model('FileStorage', fileStorageSchema);
export default FileStorage;
