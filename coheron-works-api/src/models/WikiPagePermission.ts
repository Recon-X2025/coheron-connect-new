import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IWikiPagePermission extends Document {
  page_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  permission_type: string;
  created_at: Date;
  updated_at: Date;
}

const wikiPagePermissionSchema = new Schema<IWikiPagePermission>({
  page_id: { type: Schema.Types.ObjectId, ref: 'WikiPage', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  permission_type: { type: String, default: 'read' },
}, defaultSchemaOptions);

wikiPagePermissionSchema.index({ page_id: 1, user_id: 1 }, { unique: true });
wikiPagePermissionSchema.index({ permission_type: 1 });

export default mongoose.models.WikiPagePermission as mongoose.Model<IWikiPagePermission> || mongoose.model<IWikiPagePermission>('WikiPagePermission', wikiPagePermissionSchema);
