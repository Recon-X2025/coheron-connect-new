import SagaApprovalGate from '../models/SagaApprovalGate.js';
import SagaInstance from '../models/SagaInstance.js';
import TenantOrchestrationConfigModel from '../models/TenantOrchestrationConfig.js';
import logger from '../shared/utils/logger.js';
import { eventBus } from './EventBus.js';

const APPROVAL_TIMEOUT_DEFAULT_MS = 24 * 60 * 60 * 1000; // 24 hours

class ApprovalService {
  /**
   * Create an approval gate for a saga step. The saga pauses until approved/rejected.
   */
  async createApprovalGate(params: {
    tenant_id: string;
    saga_instance_id: string;
    saga_name: string;
    step_name: string;
    entity_type: string;
    entity_id: string;
    title: string;
    description?: string;
    requested_by?: string;
    approval_roles?: string[];
    timeout_action?: 'approve' | 'reject' | 'escalate';
    timeout_ms?: number;
    context?: Record<string, any>;
  }): Promise<any> {
    const gate = await SagaApprovalGate.create({
      tenant_id: params.tenant_id,
      saga_instance_id: params.saga_instance_id,
      saga_name: params.saga_name,
      step_name: params.step_name,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      title: params.title,
      description: params.description || '',
      requested_by: params.requested_by || '',
      approval_roles: params.approval_roles || ['manager'],
      timeout_at: new Date(Date.now() + (params.timeout_ms || APPROVAL_TIMEOUT_DEFAULT_MS)),
      timeout_action: params.timeout_action || 'escalate',
      escalation_level: 0,
      context: params.context || {},
    });

    // Update saga instance to show it's waiting for approval
    await SagaInstance.updateOne(
      { _id: params.saga_instance_id },
      { $set: { status: 'waiting_approval' as any } },
    );

    // Notify via Socket.IO
    const io = (globalThis as any).__socketIO;
    if (io) {
      io.to(`tenant:${params.tenant_id}`).emit('approval:requested', {
        approval_id: gate._id.toString(),
        title: params.title,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        saga_name: params.saga_name,
      });
    }

    logger.info({ gateId: gate._id, saga: params.saga_name, step: params.step_name }, 'Approval gate created');
    return gate;
  }

  /**
   * Approve or reject an approval gate. Resumes the saga.
   */
  async decide(
    gateId: string,
    decision: 'approved' | 'rejected',
    decidedBy: string,
    note?: string,
  ): Promise<any> {
    const gate = await SagaApprovalGate.findById(gateId);
    if (!gate) throw new Error('Approval gate not found');
    if (gate.status !== 'pending') throw new Error(`Gate already ${gate.status}`);

    gate.status = decision;
    gate.decided_by = decidedBy;
    gate.decision_note = note || null;
    gate.decided_at = new Date();
    await gate.save();

    // Publish event so saga can continue
    eventBus.publish(`approval.${decision}`, gate.tenant_id, {
      approval_id: gate._id.toString(),
      saga_instance_id: gate.saga_instance_id,
      saga_name: gate.saga_name,
      step_name: gate.step_name,
      entity_type: gate.entity_type,
      entity_id: gate.entity_id,
      decided_by: decidedBy,
    }, { source: 'approval-service' });

    logger.info({ gateId, decision, saga: gate.saga_name }, 'Approval decision recorded');
    return gate;
  }

  /**
   * Process timed-out approval gates. Called by saga worker.
   * Supports configurable escalation chains from tenant config.
   */
  async processTimeouts(): Promise<number> {
    const expired = await SagaApprovalGate.find({
      status: 'pending',
      timeout_at: { $lte: new Date() },
    });

    let processed = 0;
    for (const gate of expired) {
      const action = gate.timeout_action;
      if (action === 'approve') {
        await this.decide(gate._id.toString(), 'approved', 'system:timeout', 'Auto-approved on timeout');
      } else if (action === 'reject') {
        await this.decide(gate._id.toString(), 'rejected', 'system:timeout', 'Auto-rejected on timeout');
      } else {
        // Escalate — use configurable escalation chain
        await this.escalate(gate);
      }
      processed++;
    }
    return processed;
  }

  private async escalate(gate: any): Promise<void> {
    let nextRole = 'admin';
    let nextTimeoutMs = APPROVAL_TIMEOUT_DEFAULT_MS;
    let chainExhausted = false;

    // Look up tenant escalation chain
    try {
      const tenantConfig = await TenantOrchestrationConfigModel.findOne({ tenant_id: gate.tenant_id }).lean();
      const chain = (tenantConfig?.escalation_chain as any)?.[gate.saga_name];
      if (chain?.levels && Array.isArray(chain.levels)) {
        const currentLevel = gate.escalation_level || 0;
        const nextLevel = currentLevel + 1;

        if (nextLevel < chain.levels.length) {
          const levelConfig = chain.levels[nextLevel];
          nextRole = levelConfig.role;
          nextTimeoutMs = levelConfig.timeout_ms || APPROVAL_TIMEOUT_DEFAULT_MS;
        } else {
          // Chain exhausted — auto-reject
          chainExhausted = true;
        }
      }
    } catch (err) {
      logger.error({ err, gateId: gate._id }, 'Failed to load escalation chain config');
    }

    if (chainExhausted) {
      // Auto-reject when escalation chain is exhausted
      await this.decide(gate._id.toString(), 'rejected', 'system:escalation-exhausted', 'Escalation chain exhausted — auto-rejected');
      return;
    }

    gate.status = 'escalated';
    gate.escalated_to = nextRole;
    gate.escalation_level = (gate.escalation_level || 0) + 1;
    gate.timeout_at = new Date(Date.now() + nextTimeoutMs);
    // Reset status to pending so it can be acted on at the new level
    gate.status = 'pending';
    await gate.save();

    // Notify via Socket.IO
    const io = (globalThis as any).__socketIO;
    if (io) {
      io.to(`tenant:${gate.tenant_id}`).emit('approval:escalated', {
        approval_id: gate._id.toString(),
        saga_name: gate.saga_name,
        step_name: gate.step_name,
        escalated_to: nextRole,
        escalation_level: gate.escalation_level,
      });
    }

    eventBus.publish('approval.escalated', gate.tenant_id, {
      approval_id: gate._id.toString(),
      saga_instance_id: gate.saga_instance_id,
      saga_name: gate.saga_name,
      step_name: gate.step_name,
      escalated_to: nextRole,
      escalation_level: gate.escalation_level,
    }, { source: 'approval-service' });

    logger.info({ gateId: gate._id, escalatedTo: nextRole, level: gate.escalation_level }, 'Approval escalated');
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
