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
import pool from '../database/connection.js';
import { requirePermission, requireRole } from '../middleware/permissions.js';
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

const router = express.Router();

// ============================================
// DISCOUNT APPROVAL ENDPOINTS
// ============================================

/**
 * Request discount approval for a quote
 * POST /api/crm-rbac/discount-approvals
 */
router.post('/discount-approvals', requirePermission('crm.quotes.create'), async (req, res) => {
  try {
    const { quote_id, discount_percentage, original_amount, discounted_amount, justification } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const approvalId = await createDiscountApproval(
      quote_id,
      userId,
      discount_percentage,
      original_amount,
      discounted_amount,
      justification
    );

    if (approvalId === 0) {
      return res.json({ message: 'Discount auto-approved', auto_approved: true });
    }

    res.json({
      message: 'Discount approval requested',
      approval_id: approvalId,
      status: 'pending'
    });
  } catch (error: any) {
    console.error('Error creating discount approval:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get pending discount approvals
 * GET /api/crm-rbac/discount-approvals/pending
 */
router.get('/discount-approvals/pending', requirePermission('crm.opportunities.approve_discount'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];

    // Get approvals based on user's approval role
    let query = `
      SELECT da.*, so.name as quote_name, u.name as requested_by_name
      FROM discount_approvals da
      INNER JOIN sale_orders so ON da.quote_id = so.id
      INNER JOIN users u ON da.requested_by = u.id
      WHERE da.status = 'pending'
    `;

    // Filter by approver role if not system admin
    if (!userRoles.includes('system_admin')) {
      const rolesResult = await pool.query(
        `SELECT r.code FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND ur.is_active = true`,
        [userId]
      );
      const roleCodes = rolesResult.rows.map((r: any) => r.code);

      query += ` AND EXISTS (
        SELECT 1 FROM discount_thresholds dt
        WHERE dt.discount_min <= da.discount_percentage
          AND dt.discount_max >= da.discount_percentage
          AND dt.approval_role = ANY($1::text[])
      )`;
      const result = await pool.query(query, [roleCodes]);
      return res.json(result.rows);
    }

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Approve or reject discount
 * POST /api/crm-rbac/discount-approvals/:id/approve
 * POST /api/crm-rbac/discount-approvals/:id/reject
 */
router.post('/discount-approvals/:id/approve', requirePermission('crm.opportunities.approve_discount'), async (req, res) => {
  try {
    const approvalId = parseInt(req.params.id);
    const userId = req.user?.userId;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await processDiscountApproval(approvalId, userId, true, reason);
    res.json({ message: 'Discount approved successfully' });
  } catch (error: any) {
    console.error('Error approving discount:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/discount-approvals/:id/reject', requirePermission('crm.opportunities.approve_discount'), async (req, res) => {
  try {
    const approvalId = parseInt(req.params.id);
    const userId = req.user?.userId;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await processDiscountApproval(approvalId, userId, false, reason);
    res.json({ message: 'Discount rejected' });
  } catch (error: any) {
    console.error('Error rejecting discount:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TERRITORY MANAGEMENT ENDPOINTS
// ============================================

/**
 * Get all territories
 * GET /api/crm-rbac/territories
 */
router.get('/territories', requirePermission('crm.territories.view'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, COUNT(ut.user_id) as user_count
       FROM territories t
       LEFT JOIN user_territories ut ON t.id = ut.territory_id
       WHERE t.is_active = true
       GROUP BY t.id
       ORDER BY t.name`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching territories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Assign user to territory
 * POST /api/crm-rbac/territories/:id/users
 */
router.post('/territories/:id/users', requirePermission('crm.territories.manage'), async (req, res) => {
  try {
    const territoryId = parseInt(req.params.id);
    const { user_id, is_primary } = req.body;
    const assignedBy = req.user?.userId;

    await pool.query(
      `INSERT INTO user_territories (territory_id, user_id, is_primary, assigned_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, territory_id) DO UPDATE SET
         is_primary = EXCLUDED.is_primary,
         assigned_at = NOW()`,
      [territoryId, user_id, is_primary || false, assignedBy]
    );

    res.json({ message: 'User assigned to territory' });
  } catch (error: any) {
    console.error('Error assigning user to territory:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Auto-assign lead to territory
 * POST /api/crm-rbac/leads/:id/assign-territory
 */
router.post('/leads/:id/assign-territory', requirePermission('crm.leads.assign'), async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { zip_code, state, country, industry, company_size } = req.body;

    const territoryId = await assignToTerritory(leadId, zip_code, state, country, industry, company_size);

    if (territoryId) {
      res.json({ message: 'Lead assigned to territory', territory_id: territoryId });
    } else {
      res.json({ message: 'No matching territory found' });
    }
  } catch (error: any) {
    console.error('Error assigning territory:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EXPORT APPROVAL ENDPOINTS
// ============================================

/**
 * Request export approval
 * POST /api/crm-rbac/export-approvals
 */
router.post('/export-approvals', requirePermission('crm.export'), async (req, res) => {
  try {
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
    res.json({
      message: 'Export approval requested',
      approval_id: approvalId,
      status: 'pending'
    });
  } catch (error: any) {
    console.error('Error creating export approval:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get pending export approvals
 * GET /api/crm-rbac/export-approvals/pending
 */
router.get('/export-approvals/pending', requirePermission('crm.export'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ea.*, u.name as requested_by_name
       FROM export_approvals ea
       INNER JOIN users u ON ea.requested_by = u.id
       WHERE ea.status = 'pending'
       ORDER BY ea.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching export approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PARTNER DEAL REGISTRATION ENDPOINTS
// ============================================

/**
 * Register partner deal
 * POST /api/crm-rbac/partner-deals/register
 */
router.post('/partner-deals/register', requirePermission('crm.partner.deals.register'), async (req, res) => {
  try {
    const { lead_id, auto_approve } = req.body;
    const userId = req.user?.userId;

    // Get partner_id from user's partner relationship
    const partnerResult = await pool.query(
      `SELECT p.id FROM partners p
       INNER JOIN users u ON p.partner_manager_id = u.id OR p.id = (
         SELECT partner_id FROM user_roles ur
         INNER JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1 AND r.code = 'partner'
         LIMIT 1
       )
       WHERE u.id = $1 OR EXISTS (
         SELECT 1 FROM partners p2 WHERE p2.id = p.id
       )
       LIMIT 1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(403).json({ error: 'User is not associated with a partner' });
    }

    const partnerId = partnerResult.rows[0].id;
    const registrationId = await registerPartnerDeal(partnerId, lead_id, auto_approve);

    res.json({
      message: 'Partner deal registered',
      registration_id: registrationId
    });
  } catch (error: any) {
    console.error('Error registering partner deal:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check partner access to lead/opportunity
 * GET /api/crm-rbac/partner-deals/:lead_id/access
 */
router.get('/partner-deals/:lead_id/access', requirePermission('crm.partner.deals.view'), async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const userId = req.user?.userId;

    // Get partner_id (same logic as above)
    const partnerResult = await pool.query(
      `SELECT p.id FROM partners p
       WHERE p.partner_manager_id = $1 OR EXISTS (
         SELECT 1 FROM user_roles ur
         INNER JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1 AND r.code = 'partner'
       )
       LIMIT 1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(403).json({ error: 'User is not associated with a partner' });
    }

    const partnerId = partnerResult.rows[0].id;
    const hasAccess = await canPartnerAccess(partnerId, leadId);

    res.json({ has_access: hasAccess });
  } catch (error: any) {
    console.error('Error checking partner access:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROLE SIMULATION ENDPOINT
// ============================================

/**
 * Simulate user permissions (for testing/validation)
 * GET /api/crm-rbac/simulate/:user_id
 */
router.get('/simulate/:user_id', requirePermission('system.rbac.manage'), async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.user_id);
    const { resource_type, action, resource_id } = req.query;

    // Get user roles
    const rolesResult = await pool.query(
      `SELECT r.code, r.name
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
      [targetUserId]
    );

    // Get user permissions
    const permissionsResult = await pool.query(
      `SELECT DISTINCT p.code, p.name, p.action, p.resource_type, p.record_access_level
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN roles r ON rp.role_id = r.id
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 
         AND ur.is_active = true
         AND r.is_active = true
         AND rp.granted = true
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
      [targetUserId]
    );

    // If specific resource/action requested, check access
    let accessCheck = null;
    if (resource_type && action) {
      const permissionCode = `${resource_type}.${action}`;
      const hasPermission = permissionsResult.rows.some(
        (p: any) => p.code.includes(permissionCode) || p.code === permissionCode
      );
      accessCheck = {
        resource_type: resource_type,
        action: action,
        has_permission: hasPermission
      };
    }

    res.json({
      user_id: targetUserId,
      roles: rolesResult.rows,
      permissions: permissionsResult.rows,
      access_check: accessCheck
    });
  } catch (error: any) {
    console.error('Error simulating user permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FIELD-LEVEL ACCESS CHECK
// ============================================

/**
 * Check field access
 * GET /api/crm-rbac/fields/check
 */
router.get('/fields/check', async (req, res) => {
  try {
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

    // Log access attempt
    await logFieldAccess(
      userId,
      resource_type as string,
      parseInt(resource_id as string),
      field_name as string,
      hasAccess ? (action as 'view' | 'edit') : 'denied',
      undefined,
      undefined,
      req.ip,
      req.get('user-agent') || undefined
    );

    res.json({
      has_access: hasAccess,
      field_name: field_name,
      action: action
    });
  } catch (error: any) {
    console.error('Error checking field access:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

