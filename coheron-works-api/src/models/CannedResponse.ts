import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ICannedResponse extends Document {
  name: string;
  shortcut: string;
  content: string;
  category: string;
  is_public: boolean;
  created_by: mongoose.Types.ObjectId;
  usage_count: number;
}

const cannedResponseSchema = new Schema({
  name: { type: String, required: true },
  shortcut: { type: String },
  content: { type: String, required: true },
  category: { type: String },
  is_public: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  usage_count: { type: Number, default: 0 },
}, schemaOptions);

// CannedResponse indexes
cannedResponseSchema.index({ created_by: 1 });
cannedResponseSchema.index({ category: 1 });
cannedResponseSchema.index({ is_public: 1 });

export const CannedResponse = mongoose.model<ICannedResponse>('CannedResponse', cannedResponseSchema);
export default CannedResponse;
