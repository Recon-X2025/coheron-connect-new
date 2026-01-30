/**
 * CRM RBAC Utility Functions
 *
 * Provides utilities for:
 * - Discount approval workflows
 * - Territory assignment
 * - Field-level security checks
 * - Export approvals
 * - Partner access control
 */

import { DiscountApproval, DiscountThreshold, Territory, UserTerritory, ExportApproval } from '../models/CrmRbac.js';
import { Role } from '../models/Role.js';
import { UserRole } from '../models/UserRole.js';
import { Permission } from '../models/Permission.js';
import { RolePermission } from '../models/RolePermission.js';
import RbacAuditLog from '../models/RbacAuditLog.js';
import TerritoryRule from '../models/TerritoryRule.js';
import FieldAccessLog from '../models/FieldAccessLog.js';
import PartnerDealRegistration from '../models/PartnerDealRegistration.js';
import mongoose from 'mongoose';

/**
 * Check if discount requires approval and get required approver role
 */
export async function checkDiscountApproval(
  discountPercentage: number
): Promise<{ requiresApproval: boolean; approverRole: string | null; autoApprove: boolean }> {
  const threshold = await DiscountThreshold.findOne({
    discount_min: { $lte: discountPercentage },
    discount_max: { $gte: discountPercentage },
    is_active: true,
  }).sort({ discount_min: -1 });

  if (!threshold) {
    return { requiresApproval: true, approverRole: 'sales_manager', autoApprove: false };
  }

  return {
    requiresApproval: !threshold.auto_approve,
    approverRole: threshold.approval_role || null,
    autoApprove: !!threshold.auto_approve,
  };
}

/**
 * Create discount approval request
 */
export async function createDiscountApproval(
  quoteId: any,
  requestedBy: any,
  discountPercentage: number,
  originalAmount: number,
  discountedAmount: number,
  justification?: string
): Promise<any> {
  const approvalCheck = await checkDiscountApproval(discountPercentage);

  if (approvalCheck.autoApprove) {
    const SaleOrder = mongoose.model('SaleOrder');
    await SaleOrder.findByIdAndUpdate(quoteId, { approval_status: 'approved' });
    return 0;
  }

  const approval = await DiscountApproval.create({
    quote_id: quoteId,
    requested_by: requestedBy,
    discount_percentage: discountPercentage,
    original_amount: originalAmount,
    discounted_amount: discountedAmount,
    justification,
    status: 'pending',
  });

  const SaleOrder = mongoose.model('SaleOrder');
  await SaleOrder.findByIdAndUpdate(quoteId, { approval_status: 'pending_approval' });

  await RbacAuditLog.create({
    user_id: requestedBy,
    action: 'discount_approval_requested',
    resource_type: 'quote',
    resource_id: quoteId,
    details: { discount_percentage: discountPercentage, approver_role: approvalCheck.approverRole },
  });

  return approval._id;
}

/**
 * Approve or reject discount request
 */
export async function processDiscountApproval(
  approvalId: any,
  approverId: any,
  approved: boolean,
  reason?: string
): Promise<void> {
  const approvalRequest = await DiscountApproval.findById(approvalId);
  if (!approvalRequest) {
    throw new Error('Approval request not found');
  }

  await DiscountApproval.findByIdAndUpdate(approvalId, {
    status: approved ? 'approved' : 'rejected',
    approved_by: approverId,
    approved_at: new Date(),
    rejection_reason: reason || null,
  });

  const SaleOrder = mongoose.model('SaleOrder');
  await SaleOrder.findByIdAndUpdate(approvalRequest.quote_id, {
    approval_status: approved ? 'approved' : 'rejected',
  });

  await RbacAuditLog.create({
    user_id: approverId,
    action: approved ? 'discount_approved' : 'discount_rejected',
    resource_type: 'quote',
    resource_id: approvalRequest.quote_id,
    details: {
      approval_id: approvalId,
      discount_percentage: approvalRequest.discount_percentage,
      reason,
    },
  });
}

/**
 * Auto-assign lead/opportunity to territory based on rules
 */
export async function assignToTerritory(
  leadId: any,
  zipCode?: string,
  state?: string,
  country?: string,
  industry?: string,
  companySize?: string
): Promise<any> {
  const activeTerrIds = (await Territory.find({ is_active: true })).map(t => t._id);

  const rules = await TerritoryRule.find({
    territory_id: { $in: activeTerrIds },
    is_active: true,
  }).sort({ priority: -1, territory_id: 1 });

  for (const rule of rules) {
    let matches = false;

    switch (rule.rule_type) {
      case 'zip_code':
        matches = Boolean(zipCode && rule.rule_value.split(',').includes(zipCode));
        break;
      case 'state':
        matches = Boolean(state && typeof state === 'string' && rule.rule_value.toLowerCase() === state.toLowerCase());
        break;
      case 'country':
        matches = Boolean(country && typeof country === 'string' && rule.rule_value.toLowerCase() === country.toLowerCase());
        break;
      case 'industry':
        matches = Boolean(industry && typeof industry === 'string' && rule.rule_value.toLowerCase() === industry.toLowerCase());
        break;
      case 'company_size':
        matches = Boolean(companySize && typeof companySize === 'string' && rule.rule_value.toLowerCase() === companySize.toLowerCase());
        break;
    }

    if (matches) {
      const Lead = mongoose.model('Lead');
      await Lead.findByIdAndUpdate(leadId, { territory_id: rule.territory_id });

      const territoryUser = await UserTerritory.findOne({ territory_id: rule.territory_id })
        .sort({ is_primary: -1, assigned_at: 1 });

      if (territoryUser) {
        await Lead.findByIdAndUpdate(leadId, { user_id: territoryUser.user_id });
      }

      return rule.territory_id;
    }
  }

  return null;
}

/**
 * Check if user can access field based on role and field restrictions
 */
export async function canAccessField(
  userId: any,
  resourceType: string,
  fieldName: string,
  action: 'view' | 'edit'
): Promise<boolean> {
  const userRoleDocs = await UserRole.find({
    user_id: userId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  }).populate('role_id');

  const userRoles = userRoleDocs
    .filter((ur: any) => ur.role_id?.is_active)
    .map((ur: any) => ur.role_id.code);

  if (userRoles.includes('system_admin')) {
    return true;
  }

  const permissionCode = `crm.fields.${fieldName}.${action}`;
  const roleIds = userRoleDocs
    .filter((ur: any) => ur.role_id?.is_active)
    .map((ur: any) => ur.role_id._id);

  const rolePerms = await RolePermission.find({ role_id: { $in: roleIds }, granted: true }).populate('permission_id');
  const hasPermission = rolePerms.some((rp: any) => rp.permission_id?.code === permissionCode);

  if (hasPermission) {
    return true;
  }

  const fieldRules: Record<string, Record<string, string[]>> = {
    discount_percentage: {
      view: ['sales_rep', 'sales_manager', 'sales_director', 'finance', 'system_admin'],
      edit: ['sales_rep', 'sales_manager', 'sales_director', 'finance', 'system_admin'],
    },
    margin: {
      view: ['sales_manager', 'sales_director', 'finance', 'system_admin'],
      edit: ['finance', 'sales_director', 'system_admin'],
    },
    personal_phone: {
      view: ['sales_rep', 'support_agent', 'sales_manager', 'system_admin'],
      edit: ['sales_rep', 'support_agent', 'sales_manager', 'system_admin'],
    },
    raw_source_data: {
      view: ['marketing_manager', 'data_steward', 'system_admin'],
      edit: ['marketing_manager', 'data_steward', 'system_admin'],
    },
  };

  const fieldRule = fieldRules[fieldName]?.[action];
  if (fieldRule) {
    return userRoles.some((role: string) => fieldRule.includes(role));
  }

  return false;
}

/**
 * Log field access for audit
 */
export async function logFieldAccess(
  userId: any,
  resourceType: string,
  resourceId: any,
  fieldName: string,
  action: 'view' | 'edit' | 'denied',
  oldValue?: any,
  newValue?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await FieldAccessLog.create({
    user_id: userId,
    resource_type: resourceType,
    resource_id: resourceId,
    field_name: fieldName,
    action,
    old_value: oldValue ? String(oldValue) : null,
    new_value: newValue ? String(newValue) : null,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

/**
 * Check if user can export data (bulk export approval)
 */
export async function canExport(
  userId: any,
  resourceType: string,
  recordCount: number
): Promise<{ allowed: boolean; requiresApproval: boolean; reason?: string }> {
  const userRoleDocs = await UserRole.find({
    user_id: userId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  }).populate('role_id');

  const userRoles = userRoleDocs
    .filter((ur: any) => ur.role_id?.is_active)
    .map((ur: any) => ur.role_id.code);

  const alwaysAllowed = ['system_admin', 'finance', 'auditor'];
  if (userRoles.some((role: string) => alwaysAllowed.includes(role))) {
    return { allowed: true, requiresApproval: false };
  }

  if (userRoles.includes('sales_manager') && recordCount <= 1000) {
    return { allowed: true, requiresApproval: false };
  }

  if (userRoles.includes('sales_manager') && recordCount > 1000) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: 'Bulk export (>1000 records) requires manager approval',
    };
  }

  return {
    allowed: false,
    requiresApproval: true,
    reason: 'Export requires approval for your role',
  };
}

/**
 * Create export approval request
 */
export async function createExportApproval(
  requestedBy: any,
  resourceType: string,
  recordCount: number,
  filters: any,
  justification: string
): Promise<any> {
  const approval = await ExportApproval.create({
    requested_by: requestedBy,
    resource_type: resourceType,
    record_count: recordCount,
    filters,
    justification,
    status: 'pending',
  });

  await RbacAuditLog.create({
    user_id: requestedBy,
    action: 'export_approval_requested',
    resource_type: resourceType,
    resource_id: approval._id,
    details: { record_count: recordCount, filters },
  });

  return approval._id;
}

/**
 * Check if partner can access lead/opportunity
 */
export async function canPartnerAccess(
  partnerId: any,
  leadId: any
): Promise<boolean> {
  const registration = await PartnerDealRegistration.findOne({
    partner_id: partnerId,
    $or: [{ lead_id: leadId }, { opportunity_id: leadId }],
    status: 'approved',
  });

  return !!registration;
}

/**
 * Register partner deal
 */
export async function registerPartnerDeal(
  partnerId: any,
  leadId: any,
  autoApprove: boolean = false
): Promise<any> {
  const existing = await PartnerDealRegistration.findOne({
    partner_id: partnerId,
    lead_id: leadId,
  });

  if (existing) {
    return existing._id;
  }

  const regNumber = `PDR-${Date.now()}-${partnerId}`;

  const registration = await PartnerDealRegistration.create({
    partner_id: partnerId,
    lead_id: leadId,
    registration_number: regNumber,
    status: autoApprove ? 'approved' : 'pending',
  });

  const Lead = mongoose.model('Lead');
  await Lead.findByIdAndUpdate(leadId, {
    is_partner_registered: true,
    partner_id: partnerId,
  });

  return registration._id;
}

/**
 * Check territory access for user
 */
export async function canAccessTerritory(
  userId: any,
  territoryId: any
): Promise<boolean> {
  const userRoleDocs = await UserRole.find({
    user_id: userId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  }).populate('role_id');

  const userRoles = userRoleDocs
    .filter((ur: any) => ur.role_id?.is_active)
    .map((ur: any) => ur.role_id.code);

  if (userRoles.includes('system_admin') || userRoles.includes('sales_director')) {
    return true;
  }

  const assignment = await UserTerritory.findOne({
    user_id: userId,
    territory_id: territoryId,
  });

  return !!assignment;
}
