import mongoose from 'mongoose';
import { sagaOrchestrator } from '../../SagaOrchestrator.js';
import logger from '../../../shared/utils/logger.js';
import type { SagaDefinition } from '../../types.js';

const issueToResolutionSaga: SagaDefinition = {
  name: 'issue-to-resolution',
  description: 'Ticket -> Assign -> SLA Monitor -> Escalate -> Resolve -> Survey',
  category: 'helpdesk',
  triggerEvent: 'ticket.created',
  timeout_ms: 7 * 24 * 60 * 60 * 1000, // 7 days
  steps: [
    {
      name: 'auto-assign',
      async execute(context, event) {
        const { ticket_id } = context;
        logger.info({ ticketId: ticket_id }, 'Issue-to-resolution: auto-assigning ticket');

        const db = mongoose.connection.db;
        const ticket = await db?.collection('supporttickets').findOne({
          _id: new mongoose.Types.ObjectId(ticket_id),
        });

        if (!ticket) return { assigned: false };

        // If already assigned, skip
        if (ticket.assigned_agent_id) {
          return { assigned: true, agent_id: ticket.assigned_agent_id.toString(), already_assigned: true };
        }

        // Round-robin: find the agent with fewest open tickets
        const agents = await db?.collection('supportagents').find({ is_available: true }).toArray() || [];

        if (agents.length === 0) {
          return { assigned: false, reason: 'no available agents' };
        }

        // Count open tickets per agent
        const agentLoads = await Promise.all(
          agents.map(async (agent: any) => {
            const count = await db?.collection('supporttickets').countDocuments({
              assigned_agent_id: agent._id,
              status: { $in: ['new', 'open', 'pending'] },
            }) || 0;
            return { agent, count };
          }),
        );

        agentLoads.sort((a, b) => a.count - b.count);
        const bestAgent = agentLoads[0].agent;

        await db?.collection('supporttickets').updateOne(
          { _id: ticket._id },
          {
            $set: {
              assigned_agent_id: bestAgent._id,
              status: 'open',
              updated_at: new Date(),
            },
          },
        );

        return {
          assigned: true,
          agent_id: bestAgent._id.toString(),
          agent_name: bestAgent.name,
        };
      },
    },
    {
      name: 'sla-monitoring',
      async execute(context, event) {
        const { ticket_id } = context;
        logger.info({ ticketId: ticket_id }, 'Issue-to-resolution: setting up SLA monitoring');

        const db = mongoose.connection.db;
        const ticket = await db?.collection('supporttickets').findOne({
          _id: new mongoose.Types.ObjectId(ticket_id),
        });

        if (!ticket) return { sla_active: false };

        // Look up SLA policy based on priority
        const priorityHours: Record<string, { first_response: number; resolution: number }> = {
          critical: { first_response: 1, resolution: 4 },
          urgent: { first_response: 2, resolution: 8 },
          high: { first_response: 4, resolution: 24 },
          medium: { first_response: 8, resolution: 48 },
          low: { first_response: 24, resolution: 72 },
        };

        const sla = priorityHours[ticket.priority || 'medium'] || priorityHours.medium;
        const now = new Date();
        const firstResponseDeadline = new Date(now.getTime() + sla.first_response * 60 * 60 * 1000);
        const resolutionDeadline = new Date(now.getTime() + sla.resolution * 60 * 60 * 1000);

        await db?.collection('supporttickets').updateOne(
          { _id: ticket._id },
          {
            $set: {
              sla_first_response_deadline: firstResponseDeadline,
              sla_resolution_deadline: resolutionDeadline,
              sla_first_response_breached: false,
              sla_resolution_breached: false,
              is_sla_breached: false,
              updated_at: new Date(),
            },
          },
        );

        return {
          sla_active: true,
          priority: ticket.priority || 'medium',
          first_response_deadline: firstResponseDeadline.toISOString(),
          resolution_deadline: resolutionDeadline.toISOString(),
        };
      },
    },
    {
      name: 'resolution-approval',
      type: 'approval',
      approval_roles: ['support_manager', 'support_lead'],
      approval_timeout_action: 'escalate',
      async execute(context, event) {
        const { ticket_id } = context;
        logger.info({ ticketId: ticket_id }, 'Issue-to-resolution: awaiting resolution approval');

        const db = mongoose.connection.db;
        // Mark ticket as pending approval
        await db?.collection('supporttickets').updateOne(
          { _id: new mongoose.Types.ObjectId(ticket_id) },
          { $set: { status: 'pending', updated_at: new Date() } },
        );

        return { approval_pending: true };
      },
    },
    {
      name: 'resolve-ticket',
      async execute(context, event) {
        const { ticket_id, agent_id } = context;
        logger.info({ ticketId: ticket_id }, 'Issue-to-resolution: resolving ticket');

        const db = mongoose.connection.db;
        await db?.collection('supporttickets').updateOne(
          { _id: new mongoose.Types.ObjectId(ticket_id) },
          {
            $set: {
              status: 'resolved',
              resolved_at: new Date(),
              resolved_by: agent_id || null,
              updated_at: new Date(),
            },
          },
        );

        return { resolved: true };
      },
    },
    {
      name: 'send-survey',
      async execute(context, event) {
        const { ticket_id } = context;
        logger.info({ ticketId: ticket_id }, 'Issue-to-resolution: sending satisfaction survey');

        const db = mongoose.connection.db;
        const ticket = await db?.collection('supporttickets').findOne({
          _id: new mongoose.Types.ObjectId(ticket_id),
        });

        if (!ticket?.partner_id && !ticket?.contact_id) {
          return { survey_sent: false, reason: 'no contact' };
        }

        // Create a satisfaction survey record
        const result = await db?.collection('satisfaction_surveys').insertOne({
          ticket_id: new mongoose.Types.ObjectId(ticket_id),
          ticket_number: ticket.ticket_number,
          partner_id: ticket.partner_id || null,
          contact_id: ticket.contact_id || null,
          agent_id: ticket.assigned_agent_id || null,
          status: 'pending',
          sent_at: new Date(),
          created_at: new Date(),
        });

        // Update ticket with satisfaction survey reference
        await db?.collection('supporttickets').updateOne(
          { _id: ticket._id },
          {
            $set: {
              'satisfaction.survey_id': result?.insertedId,
              'satisfaction.sent_at': new Date(),
              updated_at: new Date(),
            },
          },
        );

        return { survey_sent: true, survey_id: result?.insertedId?.toString() };
      },
    },
  ],
};

export function registerIssueToResolutionSaga(): void {
  sagaOrchestrator.registerSaga(issueToResolutionSaga);
}
