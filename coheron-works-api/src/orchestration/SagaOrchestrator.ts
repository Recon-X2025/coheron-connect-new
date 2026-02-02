import SagaInstance from '../models/SagaInstance.js';
import TenantOrchestrationConfigModel from '../models/TenantOrchestrationConfig.js';
import { approvalService } from './ApprovalService.js';
import logger from '../shared/utils/logger.js';
import type { DomainEvent, SagaDefinition } from './types.js';
import { eventBus } from './EventBus.js';
import { recordMetric } from './metrics.js';

class SagaOrchestrator {
  private sagas: Map<string, SagaDefinition> = new Map();

  registerSaga(definition: SagaDefinition): void {
    // Default version to 1 if not specified
    if (!definition.version) {
      definition.version = 1;
    }
    this.sagas.set(definition.name, definition);

    // Subscribe to trigger event
    eventBus.subscribe(definition.triggerEvent, async (event: DomainEvent) => {
      await this.startSaga(definition.name, event);
    });

    logger.info({ saga: definition.name, trigger: definition.triggerEvent, version: definition.version }, 'Saga registered');
  }

  /** Get a registered saga definition by name */
  getDefinition(name: string): SagaDefinition | undefined {
    return this.sagas.get(name);
  }

  /** List all registered saga definitions */
  listDefinitions(): { name: string; triggerEvent: string; description?: string; category?: string; stepCount: number; version: number }[] {
    return Array.from(this.sagas.values()).map((d) => ({
      name: d.name,
      triggerEvent: d.triggerEvent,
      description: d.description,
      category: d.category,
      stepCount: d.steps.length,
      version: d.version || 1,
    }));
  }

  private async startSaga(sagaName: string, event: DomainEvent): Promise<void> {
    const definition = this.sagas.get(sagaName);
    if (!definition) return;

    // Tenant-aware: check if saga is enabled for this tenant
    if (event.tenant_id) {
      try {
        const tenantConfig = await TenantOrchestrationConfigModel.findOne({ tenant_id: event.tenant_id }).lean();
        if (tenantConfig && tenantConfig.enabled_sagas.length > 0 && !tenantConfig.enabled_sagas.includes(sagaName)) {
          logger.info({ saga: sagaName, tenant: event.tenant_id }, 'Saga not enabled for tenant, skipping');
          return;
        }
      } catch (err) {
        logger.error({ err, saga: sagaName }, 'Failed to check tenant saga config');
      }
    }

    const timeoutMs = definition.timeout_ms || 5 * 60 * 1000;
    const instance = await SagaInstance.create({
      saga_name: sagaName,
      saga_version: definition.version || 1,
      trigger_event_id: event.id,
      tenant_id: event.tenant_id,
      correlation_id: event.metadata.correlation_id,
      current_step: 0,
      status: 'running',
      context: { ...event.payload },
      step_results: [],
      timeout_at: new Date(Date.now() + timeoutMs),
    });

    recordMetric('saga_started', 1, { saga: sagaName });

    await this.executeFromStep(definition, instance, 0, event);
  }

  /**
   * Execute saga steps starting from a given index. Used both for initial execution
   * and for resuming after an approval gate is cleared.
   */
  async executeFromStep(
    definition: SagaDefinition,
    instance: any,
    fromStep: number,
    event: DomainEvent,
  ): Promise<void> {
    let context = { ...(instance.context || {}) } as Record<string, any>;

    for (let i = fromStep; i < definition.steps.length; i++) {
      const step = definition.steps[i];
      const stepStart = Date.now();

      // Handle approval gate steps
      if (step.type === 'approval') {
        try {
          // Run the step's execute to get context updates (description, entity info, etc.)
          const result = await step.execute(context, event);
          context = { ...context, ...result };

          recordMetric('saga_step_duration_ms', Date.now() - stepStart, { saga: definition.name, step: step.name });

          instance.current_step = i;
          instance.context = context;
          instance.step_results.push({
            step_name: step.name,
            status: 'waiting_approval',
            result,
            completed_at: new Date(),
          });
          instance.status = 'waiting_approval';
          await instance.save();

          // Create the approval gate — saga pauses here
          await approvalService.createApprovalGate({
            tenant_id: event.tenant_id,
            saga_instance_id: instance._id.toString(),
            saga_name: definition.name,
            step_name: step.name,
            entity_type: context.entity_type || definition.category || 'unknown',
            entity_id: context.order_id || context.entity_id || context.ticket_id || context.employee_id || '',
            title: `Approval required: ${step.name} (${definition.name})`,
            description: `Step "${step.name}" in saga "${definition.name}" requires approval`,
            requested_by: event.metadata.user_id || '',
            approval_roles: step.approval_roles || ['manager'],
            timeout_action: step.approval_timeout_action || 'escalate',
            context,
          });

          recordMetric('approvals_created', 1, { saga: definition.name });
          logger.info({ saga: definition.name, step: step.name, instanceId: instance._id }, 'Saga paused for approval');
          return; // Saga pauses — will resume via resumeAfterApproval
        } catch (err: any) {
          logger.error({ err, saga: definition.name, step: step.name }, 'Approval gate creation failed');
          instance.step_results.push({
            step_name: step.name,
            status: 'failed',
            error: err.message,
            completed_at: new Date(),
          });
          instance.status = 'compensating';
          await instance.save();
          await this.compensate(definition, instance, i - 1, context, event);
          return;
        }
      }

      // Normal step execution
      try {
        const result = await step.execute(context, event);
        context = { ...context, ...result };

        recordMetric('saga_step_duration_ms', Date.now() - stepStart, { saga: definition.name, step: step.name });

        instance.current_step = i + 1;
        instance.context = context;
        instance.step_results.push({
          step_name: step.name,
          status: 'completed',
          result,
          completed_at: new Date(),
        });
        await instance.save();
      } catch (err: any) {
        logger.error({ err, saga: definition.name, step: step.name }, 'Saga step failed');

        recordMetric('saga_step_duration_ms', Date.now() - stepStart, { saga: definition.name, step: step.name });

        instance.step_results.push({
          step_name: step.name,
          status: 'failed',
          error: err.message,
          completed_at: new Date(),
        });
        instance.status = 'compensating';
        await instance.save();

        await this.compensate(definition, instance, i - 1, context, event);
        return;
      }
    }

    instance.status = 'completed';
    await instance.save();
    recordMetric('saga_completed', 1, { saga: definition.name });
    logger.info({ saga: definition.name, instanceId: instance._id }, 'Saga completed');
  }

  /**
   * Resume a saga after an approval gate has been decided.
   */
  async resumeAfterApproval(
    sagaInstanceId: string,
    approved: boolean,
    decidedBy: string,
  ): Promise<void> {
    const instance = await SagaInstance.findById(sagaInstanceId);
    if (!instance) {
      logger.error({ sagaInstanceId }, 'Cannot resume saga: instance not found');
      return;
    }
    if (instance.status !== 'waiting_approval') {
      logger.warn({ sagaInstanceId, status: instance.status }, 'Saga not in waiting_approval state');
      return;
    }

    const definition = this.sagas.get(instance.saga_name);
    if (!definition) {
      logger.error({ sagaName: instance.saga_name }, 'Cannot resume saga: definition not found');
      return;
    }

    // Version mismatch warning
    if (instance.saga_version && definition.version && instance.saga_version !== definition.version) {
      logger.warn(
        { saga: instance.saga_name, instanceVersion: instance.saga_version, definitionVersion: definition.version },
        'Saga version mismatch between instance and current definition — proceeding anyway',
      );
    }

    recordMetric('approvals_decided', 1, { saga: instance.saga_name, decision: approved ? 'approved' : 'rejected' });

    // Update the waiting step result
    const lastResult = instance.step_results[instance.step_results.length - 1];
    if (lastResult && lastResult.status === 'waiting_approval') {
      lastResult.status = approved ? 'approved' : 'rejected';
      lastResult.result = { ...(lastResult.result || {}), decided_by: decidedBy, approved };
      lastResult.completed_at = new Date();
    }

    if (!approved) {
      // Rejected: compensate
      instance.status = 'compensating';
      await instance.save();

      const event: DomainEvent = {
        id: instance.trigger_event_id,
        type: definition.triggerEvent,
        version: 1,
        tenant_id: instance.tenant_id,
        payload: instance.context,
        metadata: {
          source: 'saga-resume',
          correlation_id: instance.correlation_id,
          timestamp: new Date(),
        },
      };

      await this.compensate(definition, instance, instance.current_step - 1, instance.context || {}, event);
      return;
    }

    // Approved: continue from next step
    instance.status = 'running';
    instance.current_step = instance.current_step + 1;
    await instance.save();

    const event: DomainEvent = {
      id: instance.trigger_event_id,
      type: definition.triggerEvent,
      version: 1,
      tenant_id: instance.tenant_id,
      payload: instance.context,
      metadata: {
        source: 'saga-resume',
        correlation_id: instance.correlation_id,
        timestamp: new Date(),
      },
    };

    await this.executeFromStep(definition, instance, instance.current_step, event);
  }

  private async compensate(
    definition: SagaDefinition,
    instance: any,
    fromStep: number,
    context: Record<string, any>,
    event: DomainEvent,
  ): Promise<void> {
    for (let i = fromStep; i >= 0; i--) {
      const step = definition.steps[i];
      if (!step.compensate) continue;
      try {
        await step.compensate(context, event);
        instance.step_results.push({
          step_name: `${step.name}:compensate`,
          status: 'completed',
          completed_at: new Date(),
        });
      } catch (err: any) {
        logger.error({ err, saga: definition.name, step: step.name }, 'Saga compensation failed');
        instance.step_results.push({
          step_name: `${step.name}:compensate`,
          status: 'failed',
          error: err.message,
          completed_at: new Date(),
        });
        instance.status = 'failed';
        await instance.save();
        recordMetric('saga_failed', 1, { saga: definition.name });
        return;
      }
    }

    instance.status = 'failed';
    await instance.save();
    recordMetric('saga_failed', 1, { saga: definition.name });
    logger.info({ saga: definition.name, instanceId: instance._id }, 'Saga compensation completed');
  }
}

export const sagaOrchestrator = new SagaOrchestrator();
export default sagaOrchestrator;
