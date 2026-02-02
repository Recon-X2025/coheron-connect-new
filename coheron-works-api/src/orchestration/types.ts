export interface EventMetadata {
  user_id?: string;
  source: string;
  correlation_id: string;
  saga_id?: string;
  trace_id?: string;
  timestamp: Date;
}

export interface DomainEvent<T = any> {
  id: string;
  type: string;
  version: number;
  tenant_id: string;
  aggregate_id?: string;
  aggregate_version?: number;
  payload: T;
  metadata: EventMetadata;
}

export type EventHandler = (event: DomainEvent) => Promise<void>;

export interface SagaStep {
  name: string;
  /** 'execute' for normal steps, 'approval' for human-in-the-loop gates */
  type?: 'execute' | 'approval';
  /** For approval steps: who can approve */
  approval_roles?: string[];
  /** For approval steps: auto-action after timeout */
  approval_timeout_action?: 'approve' | 'reject' | 'escalate';
  execute: (context: Record<string, any>, event: DomainEvent) => Promise<Record<string, any>>;
  compensate?: (context: Record<string, any>, event: DomainEvent) => Promise<void>;
}

export interface SagaDefinition {
  name: string;
  triggerEvent: string;
  steps: SagaStep[];
  timeout_ms?: number;
  description?: string;
  category?: string;
  version?: number;
}

/** Tenant-specific orchestration configuration */
export interface TenantOrchestrationConfig {
  tenant_id: string;
  enabled_modules: string[];
  event_overrides: Record<string, {
    skip_handlers?: string[];
    require_approval?: boolean;
    custom_webhook_url?: string;
  }>;
  enabled_sagas: string[];
}

/** External integration connector definition */
export interface IntegrationConnector {
  name: string;
  type: 'webhook_inbound' | 'webhook_outbound' | 'polling' | 'file_watcher';
  config: Record<string, any>;
  transform?: (payload: any) => any;
  retry_policy?: { max_attempts: number; backoff_ms: number };
  circuit_breaker?: { failure_threshold: number; reset_timeout_ms: number };
}

/** Webhook registration for outbound dispatch */
export interface WebhookRegistration {
  tenant_id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  headers?: Record<string, string>;
}
