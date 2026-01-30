import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IWebsiteMedia extends Document {
  name: string;
  file_url: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  alt_text: string;
  description: string;
  site_id: mongoose.Types.ObjectId;
  uploaded_by: mongoose.Types.ObjectId;
}

const websiteMediaSchema = new Schema({
  name: { type: String },
  file_url: { type: String },
  file_path: { type: String },
  mime_type: { type: String },
  file_size: { type: Number },
  width: { type: Number },
  height: { type: Number },
  alt_text: { type: String },
  description: { type: String },
  site_id: { type: Schema.Types.ObjectId, ref: 'WebsiteSite' },
  uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

// Indexes
websiteMediaSchema.index({ site_id: 1 });
websiteMediaSchema.index({ uploaded_by: 1 });
websiteMediaSchema.index({ mime_type: 1 });
websiteMediaSchema.index({ created_at: -1 });

export const WebsiteMedia = mongoose.model<IWebsiteMedia>('WebsiteMedia', websiteMediaSchema);
export default WebsiteMedia;
