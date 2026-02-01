import ApprovalRule from '../models/ApprovalRule.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

export class ApprovalService {
  async submitForApproval(
    tenantId: string,
    documentType: string,
    documentId: string,
    documentData: Record<string, any>,
    submittedBy: string
  ): Promise<any> {
    const tid = new mongoose.Types.ObjectId(tenantId);

    // Find matching approval rule
    const rules = await ApprovalRule.find({ tenant_id: tid, document_type: documentType, is_active: true });

    let matchedRule: any = null;
    for (const rule of rules) {
      if (this.evaluateConditions(rule.conditions || [], documentData)) {
        matchedRule = rule;
        break;
      }
    }

    if (!matchedRule) {
      // No approval rule found — auto-approve
      return { status: 'auto_approved', message: 'No approval rule configured for this document type' };
    }

    // Create approval request
    const request = await ApprovalRequest.create({
      tenant_id: tid,
      rule_id: matchedRule._id,
      document_type: documentType,
      document_id: new mongoose.Types.ObjectId(documentId),
      submitted_by: new mongoose.Types.ObjectId(submittedBy),
      status: 'pending',
      current_level: 1,
      approvals: [],
    });

    return request;
  }

  async processApproval(
    tenantId: string,
    requestId: string,
    approverId: string,
    decision: 'approved' | 'rejected',
    comments?: string
  ): Promise<any> {
    const request = await ApprovalRequest.findOne({
      _id: new mongoose.Types.ObjectId(requestId),
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      status: 'pending',
    });

    if (!request) throw new NotFoundError('Approval request not found or already processed');

    const rule = await ApprovalRule.findById(request.rule_id);
    if (!rule) throw new NotFoundError('Approval rule');

    // Record the approval/rejection
    (request as any).approvals.push({
      level: request.current_level,
      approver_id: new mongoose.Types.ObjectId(approverId),
      decision,
      comments: comments || '',
      decided_at: new Date(),
    });

    if (decision === 'rejected') {
      request.status = 'rejected';
    } else {
      // Check if there are more levels
      const maxLevel = Math.max(...(rule.levels || []).map((l: any) => l.level || 0));
      if (request.current_level >= maxLevel) {
        request.status = 'approved';
      } else {
        request.current_level += 1;
      }
    }

    await request.save();
    return request;
  }

  async getApprovalStatus(tenantId: string, documentType: string, documentId: string): Promise<any> {
    return ApprovalRequest.findOne({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      document_type: documentType,
      document_id: new mongoose.Types.ObjectId(documentId),
    }).sort({ created_at: -1 });
  }

  async getPendingApprovals(tenantId: string, approverId: string): Promise<any[]> {
    // Get all pending approval requests and filter by current level's approver
    const requests = await ApprovalRequest.find({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      status: 'pending',
    }).populate('rule_id');

    return requests.filter((req: any) => {
      const rule = req.rule_id;
      if (!rule || !rule.levels) return false;
      const currentLevel = rule.levels.find((l: any) => l.level === req.current_level);
      if (!currentLevel) return false;
      if (currentLevel.approver_type === 'user') {
        return currentLevel.approver_id?.toString() === approverId;
      }
      // For role-based approvals, the caller should filter further
      return true;
    });
  }

  private evaluateConditions(conditions: any[], data: Record<string, any>): boolean {
    if (!conditions.length) return true;
    return conditions.every(cond => {
      const value = data[cond.field];
      switch (cond.operator) {
        case 'gt': return value > cond.value;
        case 'gte': return value >= cond.value;
        case 'lt': return value < cond.value;
        case 'lte': return value <= cond.value;
        case 'eq': return value === cond.value;
        case 'ne': return value !== cond.value;
        case 'in': return Array.isArray(cond.value) && cond.value.includes(value);
        default: return true;
      }
    });
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
