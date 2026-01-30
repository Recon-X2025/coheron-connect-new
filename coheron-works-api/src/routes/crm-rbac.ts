/**
 * CRM RBAC API Routes
 *
 * Endpoints for:
 * - Discount approvals
 * - Territory management
 * - Export approvals
 * - Partner deal registration
 * - Role simulation
 * - Field-level access checks
 */

import express from 'express';
import { requirePermission, requireRole } from '../middleware/permissions.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';
import {
  createDiscountApproval,
  processDiscountApproval,
  assignToTerritory,
  canAccessField,
  logFieldAccess,
  canExport,
  createExportApproval,
  canPartnerAccess,
  registerPartnerDeal,
  canAccessTerritory
} from '../utils/crm-rbac.js';
import { DiscountApproval, Territory, UserTerritory, ExportApproval, DiscountThreshold } from '../models/CrmRbac.js';
import { Role } from '../models/Role.js';
import { UserRole } from '../models/UserRole.js';
import { Permission } from '../models/Permission.js';
import { RolePermission } from '../models/RolePermission.js';
import { Partner } from '../models/Partner.js';

const router = express.Router();

// ============================================
// DISCOUNT APPROVAL ENDPOINTS
// ============================================

router.post('/discount-approvals', requirePermission('crm.quotes.create'), asyncHandler(async (req, res) => {
  const { quote_id, discount_percentage, original_amount, discounted_amount, justification } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const approvalId = await createDiscountApproval(
    quote_id, userId, discount_percentage, original_amount, discounted_amount, justification
  );

  if (approvalId === 0) {
    return res.json({ message: 'Discount auto-approved', auto_approved: true });
  }

  res.json({ message: 'Discount approval requested', approval_id: approvalId, status: 'pending' });
}));

router.get('/discount-approvals/pending', requirePermission('crm.opportunities.approve_discount'), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const userRoles = req.user?.roles || [];

  let filter: any = { status: 'pending' };

  if (!userRoles.includes('system_admin')) {
    const userRoleDocs = await UserRole.find({ user_id: userId, is_active: true }).populate('role_id');
    const roleCodes = userRoleDocs.map((ur: any) => ur.role_id?.code).filter(Boolean);

    const thresholds = await DiscountThreshold.find({ approval_role: { $in: roleCodes } });
    const thresholdFilters = thresholds.map((dt: any) => ({
      discount_percentage: { $gte: dt.discount_min, $lte: dt.discount_max }
    }));

    if (thresholdFilters.length > 0) {
      filter.$or = thresholdFilters;
    }
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    DiscountApproval.find(filter)
      .populate('quote_id', 'name')
      .populate('requested_by', 'name')
      .lean(),
    pagination,
    filter,
    DiscountApproval
  );

  const data = paginatedResult.data.map((a: any) => ({
    ...a,
    quote_name: a.quote_id?.name,
    requested_by_name: a.requested_by?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

router.post('/discount-approvals/:id/approve', requirePermission('crm.opportunities.approve_discount'), asyncHandler(async (req, res) => {
  const approvalId = req.params.id;
  const userId = req.user?.userId;
  const { reason } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await processDiscountApproval(approvalId, userId, true, reason);
  res.json({ message: 'Discount approved successfully' });
}));

router.post('/discount-approvals/:id/reject', requirePermission('crm.opportunities.approve_discount'), asyncHandler(async (req, res) => {
  const approvalId = req.params.id;
  const userId = req.user?.userId;
  const { reason } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await processDiscountApproval(approvalId, userId, false, reason);
  res.json({ message: 'Discount rejected' });
}));

// ============================================
// TERRITORY MANAGEMENT ENDPOINTS
// ============================================

router.get('/territories', requirePermission('crm.territories.view'), asyncHandler(async (req, res) => {
  const territories = await Territory.find({ is_active: true }).sort({ name: 1 }).lean();

  const result = await Promise.all(territories.map(async (t: any) => {
    const userCount = await UserTerritory.countDocuments({ territory_id: t._id });
    return { ...t, user_count: userCount };
  }));

  res.json(result);
}));

router.post('/territories/:id/users', requirePermission('crm.territories.manage'), asyncHandler(async (req, res) => {
  const territoryId = req.params.id;
  const { user_id, is_primary } = req.body;
  const assignedBy = req.user?.userId;

  await UserTerritory.findOneAndUpdate(
    { territory_id: territoryId, user_id },
    { territory_id: territoryId, user_id, is_primary: is_primary || false, assigned_by: assignedBy, assigned_at: new Date() },
    { upsert: true, new: true }
  );

  res.json({ message: 'User assigned to territory' });
}));

router.post('/leads/:id/assign-territory', requirePermission('crm.leads.assign'), asyncHandler(async (req, res) => {
  const leadId = req.params.id;
  const { zip_code, state, country, industry, company_size } = req.body;

  const territoryId = await assignToTerritory(leadId, zip_code, state, country, industry, company_size);

  if (territoryId) {
    res.json({ message: 'Lead assigned to territory', territory_id: territoryId });
  } else {
    res.json({ message: 'No matching territory found' });
  }
}));

// ============================================
// EXPORT APPROVAL ENDPOINTS
// ============================================

router.post('/export-approvals', requirePermission('crm.export'), asyncHandler(async (req, res) => {
  const { resource_type, record_count, filters, justification } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const exportCheck = await canExport(userId, resource_type, record_count);

  if (exportCheck.allowed && !exportCheck.requiresApproval) {
    return res.json({ message: 'Export allowed', requires_approval: false });
  }

  if (!exportCheck.requiresApproval) {
    return res.status(403).json({ error: exportCheck.reason || 'Export not allowed' });
  }

  const approvalId = await createExportApproval(userId, resource_type, record_count, filters, justification);
  res.json({ message: 'Export approval requested', approval_id: approvalId, status: 'pending' });
}));

router.get('/export-approvals/pending', requirePermission('crm.export'), asyncHandler(async (req, res) => {
  const filter: any = { status: 'pending' };

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ExportApproval.find(filter)
      .populate('requested_by', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    ExportApproval
  );

  const data = paginatedResult.data.map((a: any) => ({
    ...a,
    requested_by_name: a.requested_by?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// ============================================
// PARTNER DEAL REGISTRATION ENDPOINTS
// ============================================

router.post('/partner-deals/register', requirePermission('crm.partner.deals.register'), asyncHandler(async (req, res) => {
  const { lead_id, auto_approve } = req.body;
  const userId = req.user?.userId;

  const partner = await Partner.findOne({
    $or: [
      { partner_manager_id: userId },
    ]
  });

  if (!partner) {
    return res.status(403).json({ error: 'User is not associated with a partner' });
  }

  const partnerId = partner._id;
  const registrationId = await registerPartnerDeal(partnerId, lead_id, auto_approve);

  res.json({ message: 'Partner deal registered', registration_id: registrationId });
}));

router.get('/partner-deals/:lead_id/access', requirePermission('crm.partner.deals.view'), asyncHandler(async (req, res) => {
  const leadId = req.params.lead_id;
  const userId = req.user?.userId;

  const partner = await Partner.findOne({ partner_manager_id: userId });

  if (!partner) {
    return res.status(403).json({ error: 'User is not associated with a partner' });
  }

  const partnerId = partner._id;
  const hasAccess = await canPartnerAccess(partnerId, leadId);

  res.json({ has_access: hasAccess });
}));

// ============================================
// ROLE SIMULATION ENDPOINT
// ============================================

router.get('/simulate/:user_id', requirePermission('system.rbac.manage'), asyncHandler(async (req, res) => {
  const targetUserId = req.params.user_id;
  const { resource_type, action, resource_id } = req.query;

  const userRoleDocs = await UserRole.find({
    user_id: targetUserId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  }).populate('role_id');

  const roles = userRoleDocs
    .filter((ur: any) => ur.role_id?.is_active)
    .map((ur: any) => ({ code: ur.role_id.code, name: ur.role_id.name }));

  const roleIds = userRoleDocs
    .filter((ur: any) => ur.role_id?.is_active)
    .map((ur: any) => ur.role_id._id);

  const rolePermDocs = await RolePermission.find({ role_id: { $in: roleIds }, granted: true }).populate('permission_id');
  const permissions = [...new Map(
    rolePermDocs.map((rp: any) => [rp.permission_id?.code, {
      code: rp.permission_id?.code,
      name: rp.permission_id?.name,
      action: rp.permission_id?.action,
      resource_type: rp.permission_id?.resource_type,
      record_access_level: rp.permission_id?.record_access_level,
    }])
  ).values()];

  let accessCheck = null;
  if (resource_type && action) {
    const permissionCode = `${resource_type}.${action}`;
    const hasPermission = permissions.some(
      (p: any) => p.code?.includes(permissionCode) || p.code === permissionCode
    );
    accessCheck = { resource_type, action, has_permission: hasPermission };
  }

  res.json({ user_id: targetUserId, roles, permissions, access_check: accessCheck });
}));

// ============================================
// FIELD-LEVEL ACCESS CHECK
// ============================================

router.get('/fields/check', asyncHandler(async (req, res) => {
  const { resource_type, resource_id, field_name, action } = req.query;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const hasAccess = await canAccessField(
    userId,
    resource_type as string,
    field_name as string,
    action as 'view' | 'edit'
  );

  await logFieldAccess(
    userId,
    resource_type as string,
    resource_id as string,
    field_name as string,
    hasAccess ? (action as 'view' | 'edit') : 'denied',
    undefined,
    undefined,
    req.ip,
    req.get('user-agent') || undefined
  );

  res.json({ has_access: hasAccess, field_name, action });
}));

export default router;
