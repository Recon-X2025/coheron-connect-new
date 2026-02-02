import { eventBus } from '../EventBus.js';
import { sagaOrchestrator } from '../SagaOrchestrator.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../types.js';

export function registerApprovalResumeHandler(): void {
  eventBus.subscribe('approval.approved', async function handleApprovalApproved(event: DomainEvent) {
    const { saga_instance_id, decided_by } = event.payload;
    if (!saga_instance_id) return;

    try {
      await sagaOrchestrator.resumeAfterApproval(saga_instance_id, true, decided_by || 'unknown');
      logger.info({ sagaInstanceId: saga_instance_id }, 'Saga resumed after approval');
    } catch (err) {
      logger.error({ err, sagaInstanceId: saga_instance_id }, 'Failed to resume saga after approval');
      throw err;
    }
  });

  eventBus.subscribe('approval.rejected', async function handleApprovalRejected(event: DomainEvent) {
    const { saga_instance_id, decided_by } = event.payload;
    if (!saga_instance_id) return;

    try {
      await sagaOrchestrator.resumeAfterApproval(saga_instance_id, false, decided_by || 'unknown');
      logger.info({ sagaInstanceId: saga_instance_id }, 'Saga compensating after rejection');
    } catch (err) {
      logger.error({ err, sagaInstanceId: saga_instance_id }, 'Failed to process saga rejection');
      throw err;
    }
  });
}
