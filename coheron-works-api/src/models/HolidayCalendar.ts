import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const holidaySchema = new Schema({
  date: { type: Date, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['national', 'regional', 'company', 'optional'], default: 'company' },
}, { _id: false });

export interface IHolidayCalendar extends Document {
  name: string;
  year: number;
  location: string;
  tenant_id: mongoose.Types.ObjectId;
}

const holidayCalendarSchema = new Schema({
  name: { type: String, required: true },
  year: { type: Number, required: true },
  location: { type: String },
  holidays: [holidaySchema],
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

holidayCalendarSchema.index({ tenant_id: 1, year: 1 });
holidayCalendarSchema.index({ tenant_id: 1, location: 1 });

export const HolidayCalendar = mongoose.models.HolidayCalendar || mongoose.model('HolidayCalendar', holidayCalendarSchema);
export default HolidayCalendar;
