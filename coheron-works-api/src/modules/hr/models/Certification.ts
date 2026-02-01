import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICertification extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  issuing_authority: string;
  requirements: {
    learning_path_id?: mongoose.Types.ObjectId;
    min_score: number;
    required_courses: mongoose.Types.ObjectId[];
  };
  validity_months: number;
  renewal_required: boolean;
  status: 'active' | 'deprecated';
}

const certificationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  issuing_authority: { type: String, default: 'Internal' },
  requirements: {
    learning_path_id: { type: Schema.Types.ObjectId, ref: 'LearningPath' },
    min_score: { type: Number, default: 0 },
    required_courses: [{ type: Schema.Types.ObjectId }],
  },
  validity_months: { type: Number, default: 12 },
  renewal_required: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'deprecated'], default: 'active' },
}, defaultSchemaOptions);

export const Certification = mongoose.model<ICertification>('Certification', certificationSchema);
