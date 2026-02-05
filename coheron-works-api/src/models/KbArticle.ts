import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IKbArticle extends Document {
  title: string;
  slug: string;
  content: string;
  summary: string;
  category_id: mongoose.Types.ObjectId;
  parent_article_id: mongoose.Types.ObjectId;
  article_type: string;
  status: string;
  is_public: boolean;
  tags: string[];
  meta_keywords: string;
  meta_description: string;
  author_id: mongoose.Types.ObjectId;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

const kbArticleSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  summary: { type: String },
  category_id: { type: Schema.Types.ObjectId, ref: 'TicketCategory' },
  parent_article_id: { type: Schema.Types.ObjectId, ref: 'KbArticle' },
  article_type: { type: String, default: 'article' },
  status: { type: String, default: 'draft' },
  is_public: { type: Boolean, default: true },
  tags: [{ type: String }],
  meta_keywords: { type: String },
  meta_description: { type: String },
  author_id: { type: Schema.Types.ObjectId, ref: 'User' },
  view_count: { type: Number, default: 0 },
  helpful_count: { type: Number, default: 0 },
  not_helpful_count: { type: Number, default: 0 },
}, schemaOptions);

export const KbArticleRevisionSchema = new Schema({
  article_id: { type: Schema.Types.ObjectId, ref: 'KbArticle', required: true },
  revision_number: { type: Number, required: true },
  title: { type: String },
  content: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

export const KbArticleAttachmentSchema = new Schema({
  article_id: { type: Schema.Types.ObjectId, ref: 'KbArticle', required: true },
  file_name: { type: String },
  file_url: { type: String },
  file_size: { type: Number },
  mime_type: { type: String },
  uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

export const TicketChannelSchema = new Schema({
  name: { type: String, required: true },
  channel_type: { type: String, required: true },
  config: { type: Schema.Types.Mixed },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

export const TicketCategorySchema = new Schema({
  name: { type: String, required: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'TicketCategory' },
  description: { type: String },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// KbArticle indexes (slug already has unique: true)
kbArticleSchema.index({ category_id: 1 });
kbArticleSchema.index({ parent_article_id: 1 });
kbArticleSchema.index({ author_id: 1 });
kbArticleSchema.index({ status: 1 });
kbArticleSchema.index({ is_public: 1 });
kbArticleSchema.index({ article_type: 1 });
kbArticleSchema.index({ status: 1, is_public: 1 });

// KbArticleRevision indexes
KbArticleRevisionSchema.index({ article_id: 1 });
KbArticleRevisionSchema.index({ created_by: 1 });
KbArticleRevisionSchema.index({ article_id: 1, revision_number: -1 });

// KbArticleAttachment indexes
KbArticleAttachmentSchema.index({ article_id: 1 });
KbArticleAttachmentSchema.index({ uploaded_by: 1 });

// TicketChannel indexes
TicketChannelSchema.index({ channel_type: 1 });
TicketChannelSchema.index({ is_active: 1 });

// TicketCategory indexes
TicketCategorySchema.index({ parent_id: 1 });
TicketCategorySchema.index({ is_active: 1 });

export const KbArticle = mongoose.models.KbArticle || mongoose.model<IKbArticle>('KbArticle', kbArticleSchema);
export const KbArticleRevision = mongoose.models.KbArticleRevision || mongoose.model('KbArticleRevision', KbArticleRevisionSchema);
export const KbArticleAttachment = mongoose.models.KbArticleAttachment || mongoose.model('KbArticleAttachment', KbArticleAttachmentSchema);
export { default as TicketChannel } from './TicketChannel.js';
export const TicketCategory = mongoose.models.TicketCategory || mongoose.model('TicketCategory', TicketCategorySchema);

export default KbArticle;
