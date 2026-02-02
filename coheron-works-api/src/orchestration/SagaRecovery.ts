import SagaInstance from '../models/SagaInstance.js';
import logger from '../shared/utils/logger.js';
import { sagaOrchestrator } from './SagaOrchestrator.js';
import type { DomainEvent } from './types.js';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Recover sagas that are stuck in 'running' or 'compensating' status
 * after a process restart. Sagas in 'waiting_approval' are left alone
 * since approval gates are independent.
 */
export async function recoverStuckSagas(): Promise<{ recovered: number; skipped: number; errors: number }> {
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);
  let recovered = 0;
  let skipped = 0;
  let errors = 0;

  // Find stuck running sagas
  const stuckRunning = await SagaInstance.find({
    status: 'running',
    updated_at: { $lte: staleThreshold },
  });

  for (const instance of stuckRunning) {
    const definition = sagaOrchestrator.getDefinition(instance.saga_name);
    if (!definition) {
      logger.warn({ saga: instance.saga_name, instanceId: instance._id }, 'Saga recovery: no definition found, skipping');
      skipped++;
      continue;
    }

    try {
      logger.info(
        { saga: instance.saga_name, instanceId: instance._id, currentStep: instance.current_step },
        'Saga recovery: resuming stuck running saga',
      );

      const event: DomainEvent = {
        id: instance.trigger_event_id,
        type: definition.triggerEvent,
        version: 1,
        tenant_id: instance.tenant_id,
        payload: instance.context || {},
        metadata: {
          source: 'saga-recovery',
          correlation_id: instance.correlation_id,
          timestamp: new Date(),
        },
      };

      await sagaOrchestrator.executeFromStep(definition, instance, instance.current_step, event);
      recovered++;
    } catch (err) {
      logger.error({ err, saga: instance.saga_name, instanceId: instance._id }, 'Saga recovery: failed to resume running saga');
      errors++;
    }
  }

  // Find stuck compensating sagas
  const stuckCompensating = await SagaInstance.find({
    status: 'compensating',
    updated_at: { $lte: staleThreshold },
  });

  for (const instance of stuckCompensating) {
    const definition = sagaOrchestrator.getDefinition(instance.saga_name);
    if (!definition) {
      logger.warn({ saga: instance.saga_name, instanceId: instance._id }, 'Saga recovery: no definition for compensating saga, skipping');
      skipped++;
      continue;
    }

    try {
      logger.info(
        { saga: instance.saga_name, instanceId: instance._id, currentStep: instance.current_step },
        'Saga recovery: retrying stuck compensation',
      );

      // Find where compensation left off by checking step_results
      const lastCompensateResult = [...(instance.step_results || [])]
        .reverse()
        .find((r) => r.step_name?.includes(':compensate'));

      let compensateFromStep = instance.current_step - 1;
      if (lastCompensateResult) {
        const baseName = lastCompensateResult.step_name.replace(':compensate', '');
        const stepIdx = definition.steps.findIndex((s) => s.name === baseName);
        if (stepIdx >= 0 && lastCompensateResult.status === 'completed') {
          compensateFromStep = stepIdx - 1;
        } else if (stepIdx >= 0) {
          compensateFromStep = stepIdx;
        }
      }

      const event: DomainEvent = {
        id: instance.trigger_event_id,
        type: definition.triggerEvent,
        version: 1,
        tenant_id: instance.tenant_id,
        payload: instance.context || {},
        metadata: {
          source: 'saga-recovery',
          correlation_id: instance.correlation_id,
          timestamp: new Date(),
        },
      };

      // Re-run compensation from where it left off
      for (let i = compensateFromStep; i >= 0; i--) {
        const step = definition.steps[i];
        if (!step.compensate) continue;
        try {
          await step.compensate(instance.context || {}, event);
          instance.step_results.push({
            step_name: `${step.name}:compensate`,
            status: 'completed',
            completed_at: new Date(),
          });
        } catch (compErr: any) {
          logger.error({ err: compErr, saga: definition.name, step: step.name }, 'Saga recovery: compensation step failed');
          instance.step_results.push({
            step_name: `${step.name}:compensate`,
            status: 'failed',
            error: compErr.message,
            completed_at: new Date(),
          });
          instance.status = 'failed';
          await instance.save();
          errors++;
          break;
        }
      }

      if (instance.status === 'compensating') {
        instance.status = 'failed';
        await instance.save();
      }
      recovered++;
    } catch (err) {
      logger.error({ err, saga: instance.saga_name, instanceId: instance._id }, 'Saga recovery: failed to resume compensation');
      errors++;
    }
  }

  // Log waiting_approval sagas (skip them)
  const waitingCount = await SagaInstance.countDocuments({
    status: 'waiting_approval',
    updated_at: { $lte: staleThreshold },
  });
  if (waitingCount > 0) {
    logger.info({ count: waitingCount }, 'Saga recovery: skipping waiting_approval sagas (approval gates are independent)');
    skipped += waitingCount;
  }

  logger.info({ recovered, skipped, errors }, 'Saga recovery completed');
  return { recovered, skipped, errors };
}
