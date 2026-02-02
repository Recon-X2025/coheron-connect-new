import mongoose, { Schema, Document } from 'mongoose';

export interface IDomainEventLog extends Document {
  event_id: string;
  event_type: string;
  tenant_id: string;
  payload: any;
  metadata: any;
  version: number;
  aggregate_id?: string;
  status: 'processing' | 'completed' | 'partial_failure' | 'failed';
  handler_results: { handler: string; success: boolean; error?: string }[];
  created_at: Date;
}

const DomainEventLogSchema = new Schema<IDomainEventLog>(
  {
    event_id: { type: String, required: true, unique: true, index: true },
    event_type: { type: String, required: true, index: true },
    tenant_id: { type: String, index: true },
    payload: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    version: { type: Number, default: 1 },
    aggregate_id: { type: String, index: true },
    status: { type: String, enum: ['processing', 'completed', 'partial_failure', 'failed'], default: 'processing' },
    handler_results: [{ handler: String, success: Boolean, error: String }],
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

// TTL index: auto-delete after 90 days
DomainEventLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IDomainEventLog>('DomainEventLog', DomainEventLogSchema);
