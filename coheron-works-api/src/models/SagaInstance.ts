import mongoose, { Schema, Document } from 'mongoose';

export interface ISagaInstance extends Document {
  saga_name: string;
  trigger_event_id: string;
  tenant_id: string;
  correlation_id: string;
  current_step: number;
  status: 'running' | 'completed' | 'compensating' | 'failed' | 'waiting_approval';
  saga_version: number;
  context: Record<string, any>;
  step_results: { step_name: string; status: string; result?: any; error?: string; completed_at: Date }[];
  timeout_at: Date;
  created_at: Date;
  updated_at: Date;
}

const SagaInstanceSchema = new Schema<ISagaInstance>(
  {
    saga_name: { type: String, required: true, index: true },
    trigger_event_id: { type: String, required: true },
    tenant_id: { type: String, required: true, index: true },
    correlation_id: { type: String, required: true, index: true },
    current_step: { type: Number, default: 0 },
    saga_version: { type: Number, default: 1 },
    status: { type: String, enum: ['running', 'completed', 'compensating', 'failed', 'waiting_approval'], default: 'running' },
    context: { type: Schema.Types.Mixed, default: {} },
    step_results: [{
      step_name: String,
      status: String,
      result: Schema.Types.Mixed,
      error: String,
      completed_at: Date,
    }],
    timeout_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

SagaInstanceSchema.index({ status: 1, timeout_at: 1 });

export default mongoose.model<ISagaInstance>('SagaInstance', SagaInstanceSchema);
