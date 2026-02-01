import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICustomAPI extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  method: string;
  path_template: string;
  authentication: string;
  rate_limit_per_minute: number;
  request_schema: any;
  response_mapping: {
    source_model: string;
    query: any;
    transform: any;
  };
  middleware: Array<{
    type: string;
    config: any;
  }>;
  is_active: boolean;
  call_count: number;
  created_by: mongoose.Types.ObjectId;
}

const CustomAPISchema = new Schema<ICustomAPI>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, default: '' },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], required: true },
  path_template: { type: String, required: true },
  authentication: { type: String, enum: ['none', 'api_key', 'oauth'], default: 'api_key' },
  rate_limit_per_minute: { type: Number, default: 60 },
  request_schema: Schema.Types.Mixed,
  response_mapping: {
    source_model: String,
    query: Schema.Types.Mixed,
    transform: Schema.Types.Mixed,
  },
  middleware: [{
    type: { type: String, enum: ['validate', 'transform', 'enrich', 'filter'] },
    config: Schema.Types.Mixed,
  }],
  is_active: { type: Boolean, default: true },
  call_count: { type: Number, default: 0 },
  created_by: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

export default mongoose.model<ICustomAPI>('CustomAPI', CustomAPISchema);
