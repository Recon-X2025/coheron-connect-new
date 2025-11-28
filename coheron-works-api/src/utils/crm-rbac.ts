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

import pool from '../database/connection.js';

/**
 * Check if discount requires approval and get required approver role
 */
export async function checkDiscountApproval(
  discountPercentage: number
): Promise<{ requiresApproval: boolean; approverRole: string | null; autoApprove: boolean }> {
  const result = await pool.query(
    `SELECT approval_role, auto_approve
     FROM discount_thresholds
     WHERE discount_min <= $1 AND discount_max >= $1
       AND is_active = true
     ORDER BY discount_min DESC
     LIMIT 1`,
    [discountPercentage]
  );

  if (result.rows.length === 0) {
    // No threshold found, default to requiring approval
    return { requiresApproval: true, approverRole: 'sales_manager', autoApprove: false };
  }

  const threshold = result.rows[0];
  return {
    requiresApproval: !threshold.auto_approve,
    approverRole: threshold.approval_role,
    autoApprove: threshold.auto_approve
  };
}

/**
 * Create discount approval request
 */
export async function createDiscountApproval(
  quoteId: number,
  requestedBy: number,
  discountPercentage: number,
  originalAmount: number,
  discountedAmount: number,
  justification?: string
): Promise<number> {
  const approvalCheck = await checkDiscountApproval(discountPercentage);

  if (approvalCheck.autoApprove) {
    // Auto-approve and update quote
    await pool.query(
      `UPDATE sale_orders SET approval_status = 'approved' WHERE id = $1`,
      [quoteId]
    );
    return 0; // No approval request needed
  }

  const result = await pool.query(
    `INSERT INTO discount_approvals 
     (quote_id, requested_by, discount_percentage, original_amount, discounted_amount, justification, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [quoteId, requestedBy, discountPercentage, originalAmount, discountedAmount, justification]
  );

  // Update quote status
  await pool.query(
    `UPDATE sale_orders SET approval_status = 'pending_approval' WHERE id = $1`,
    [quoteId]
  );

  // Log to audit
  await pool.query(
    `INSERT INTO rbac_audit_logs 
     (user_id, action, resource_type, resource_id, details)
     VALUES ($1, 'discount_approval_requested', 'quote', $2, $3)`,
    [
      requestedBy,
      quoteId,
      JSON.stringify({
        discount_percentage: discountPercentage,
        approver_role: approvalCheck.approverRole
      })
    ]
  );

  return result.rows[0].id;
}

/**
 * Approve or reject discount request
 */
export async function processDiscountApproval(
  approvalId: number,
  approverId: number,
  approved: boolean,
  reason?: string
): Promise<void> {
  const approval = await pool.query(
    `SELECT * FROM discount_approvals WHERE id = $1`,
    [approvalId]
  );

  if (approval.rows.length === 0) {
    throw new Error('Approval request not found');
  }

  const approvalRequest = approval.rows[0];

  await pool.query(
    `UPDATE discount_approvals 
     SET status = $1, approved_by = $2, approved_at = NOW(), rejection_reason = $3
     WHERE id = $4`,
    [approved ? 'approved' : 'rejected', approverId, reason || null, approvalId]
  );

  // Update quote status
  await pool.query(
    `UPDATE sale_orders 
     SET approval_status = $1
     WHERE id = $2`,
    [approved ? 'approved' : 'rejected', approvalRequest.quote_id]
  );

  // Log to audit
  await pool.query(
    `INSERT INTO rbac_audit_logs 
     (user_id, action, resource_type, resource_id, details)
     VALUES ($1, $2, 'quote', $3, $4)`,
    [
      approverId,
      approved ? 'discount_approved' : 'discount_rejected',
      approvalRequest.quote_id,
      JSON.stringify({
        approval_id: approvalId,
        discount_percentage: approvalRequest.discount_percentage,
        reason
      })
    ]
  );
}

/**
 * Auto-assign lead/opportunity to territory based on rules
 */
export async function assignToTerritory(
  leadId: number,
  zipCode?: string,
  state?: string,
  country?: string,
  industry?: string,
  companySize?: string
): Promise<number | null> {
  // Get territory rules in priority order
  const rules = await pool.query(
    `SELECT tr.territory_id, tr.rule_type, tr.rule_value, tr.priority
     FROM territory_rules tr
     INNER JOIN territories t ON tr.territory_id = t.id
     WHERE tr.is_active = true AND t.is_active = true
     ORDER BY tr.priority DESC, tr.territory_id`
  );

  for (const rule of rules.rows) {
    let matches = false;

    switch (rule.rule_type) {
      case 'zip_code':
        matches = zipCode && rule.rule_value.split(',').includes(zipCode);
        break;
      case 'state':
        matches = state && rule.rule_value.toLowerCase() === state.toLowerCase();
        break;
      case 'country':
        matches = country && rule.rule_value.toLowerCase() === country.toLowerCase();
        break;
      case 'industry':
        matches = industry && rule.rule_value.toLowerCase() === industry.toLowerCase();
        break;
      case 'company_size':
        matches = companySize && rule.rule_value.toLowerCase() === companySize.toLowerCase();
        break;
    }

    if (matches) {
      // Assign to territory
      await pool.query(
        `UPDATE leads SET territory_id = $1 WHERE id = $2`,
        [rule.territory_id, leadId]
      );

      // Auto-assign to user in territory (round-robin or primary)
      const territoryUsers = await pool.query(
        `SELECT ut.user_id 
         FROM user_territories ut
         WHERE ut.territory_id = $1
         ORDER BY ut.is_primary DESC, ut.assigned_at ASC
         LIMIT 1`,
        [rule.territory_id]
      );

      if (territoryUsers.rows.length > 0) {
        await pool.query(
          `UPDATE leads SET user_id = $1 WHERE id = $2`,
          [territoryUsers.rows[0].user_id, leadId]
        );
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
  userId: number,
  resourceType: string,
  fieldName: string,
  action: 'view' | 'edit'
): Promise<boolean> {
  // Get user roles
  const roles = await pool.query(
    `SELECT r.code
     FROM roles r
     INNER JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
    [userId]
  );

  const userRoles = roles.rows.map((r: any) => r.code);

  // System admin can access everything
  if (userRoles.includes('system_admin')) {
    return true;
  }

  // Check field-level permissions
  const permissionCode = `crm.fields.${fieldName}.${action}`;
  const permission = await pool.query(
    `SELECT p.code, p.field_restrictions, rp.granted
     FROM permissions p
     INNER JOIN role_permissions rp ON p.id = rp.permission_id
     INNER JOIN roles r ON rp.role_id = r.id
     INNER JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND p.code = $2
       AND ur.is_active = true AND r.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
     LIMIT 1`,
    [userId, permissionCode]
  );

  if (permission.rows.length > 0 && permission.rows[0].granted) {
    return true;
  }

  // Check role-based field access rules
  const fieldRules: Record<string, Record<string, string[]>> = {
    discount_percentage: {
      view: ['sales_rep', 'sales_manager', 'sales_director', 'finance', 'system_admin'],
      edit: ['sales_rep', 'sales_manager', 'sales_director', 'finance', 'system_admin']
    },
    margin: {
      view: ['sales_manager', 'sales_director', 'finance', 'system_admin'],
      edit: ['finance', 'sales_director', 'system_admin']
    },
    personal_phone: {
      view: ['sales_rep', 'support_agent', 'sales_manager', 'system_admin'],
      edit: ['sales_rep', 'support_agent', 'sales_manager', 'system_admin']
    },
    raw_source_data: {
      view: ['marketing_manager', 'data_steward', 'system_admin'],
      edit: ['marketing_manager', 'data_steward', 'system_admin']
    }
  };

  const fieldRule = fieldRules[fieldName]?.[action];
  if (fieldRule) {
    return userRoles.some(role => fieldRule.includes(role));
  }

  return false;
}

/**
 * Log field access for audit
 */
export async function logFieldAccess(
  userId: number,
  resourceType: string,
  resourceId: number,
  fieldName: string,
  action: 'view' | 'edit' | 'denied',
  oldValue?: any,
  newValue?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO field_access_logs 
     (user_id, resource_type, resource_id, field_name, action, old_value, new_value, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      userId,
      resourceType,
      resourceId,
      fieldName,
      action,
      oldValue ? String(oldValue) : null,
      newValue ? String(newValue) : null,
      ipAddress,
      userAgent
    ]
  );
}

/**
 * Check if user can export data (bulk export approval)
 */
export async function canExport(
  userId: number,
  resourceType: string,
  recordCount: number
): Promise<{ allowed: boolean; requiresApproval: boolean; reason?: string }> {
  // Get user roles
  const roles = await pool.query(
    `SELECT r.code
     FROM roles r
     INNER JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
    [userId]
  );

  const userRoles = roles.rows.map((r: any) => r.code);

  // Roles that can always export
  const alwaysAllowed = ['system_admin', 'finance', 'auditor'];
  if (userRoles.some(role => alwaysAllowed.includes(role))) {
    return { allowed: true, requiresApproval: false };
  }

  // Sales manager can export up to 1000 records
  if (userRoles.includes('sales_manager') && recordCount <= 1000) {
    return { allowed: true, requiresApproval: false };
  }

  // Sales manager exporting > 1000 requires approval
  if (userRoles.includes('sales_manager') && recordCount > 1000) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: 'Bulk export (>1000 records) requires manager approval'
    };
  }

  // Other roles need approval for any export
  return {
    allowed: false,
    requiresApproval: true,
    reason: 'Export requires approval for your role'
  };
}

/**
 * Create export approval request
 */
export async function createExportApproval(
  requestedBy: number,
  resourceType: string,
  recordCount: number,
  filters: any,
  justification: string
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO export_approvals 
     (requested_by, resource_type, record_count, filters, justification, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`,
    [requestedBy, resourceType, recordCount, JSON.stringify(filters), justification]
  );

  // Log to audit
  await pool.query(
    `INSERT INTO rbac_audit_logs 
     (user_id, action, resource_type, resource_id, details)
     VALUES ($1, 'export_approval_requested', $2, $3, $4)`,
    [
      requestedBy,
      resourceType,
      result.rows[0].id,
      JSON.stringify({ record_count: recordCount, filters })
    ]
  );

  return result.rows[0].id;
}

/**
 * Check if partner can access lead/opportunity
 */
export async function canPartnerAccess(
  partnerId: number,
  leadId: number
): Promise<boolean> {
  // Check if lead is partner-registered
  const registration = await pool.query(
    `SELECT id, status
     FROM partner_deal_registrations
     WHERE partner_id = $1 AND (lead_id = $2 OR opportunity_id = $2)
       AND status = 'approved'`,
    [partnerId, leadId]
  );

  return registration.rows.length > 0;
}

/**
 * Register partner deal
 */
export async function registerPartnerDeal(
  partnerId: number,
  leadId: number,
  autoApprove: boolean = false
): Promise<number> {
  // Check if already registered
  const existing = await pool.query(
    `SELECT id FROM partner_deal_registrations
     WHERE partner_id = $1 AND lead_id = $2`,
    [partnerId, leadId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Generate registration number
  const regNumber = `PDR-${Date.now()}-${partnerId}`;

  const result = await pool.query(
    `INSERT INTO partner_deal_registrations 
     (partner_id, lead_id, registration_number, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [partnerId, leadId, regNumber, autoApprove ? 'approved' : 'pending']
  );

  // Update lead
  await pool.query(
    `UPDATE leads 
     SET is_partner_registered = true, partner_id = $1
     WHERE id = $2`,
    [partnerId, leadId]
  );

  return result.rows[0].id;
}

/**
 * Check territory access for user
 */
export async function canAccessTerritory(
  userId: number,
  territoryId: number
): Promise<boolean> {
  // System admin and sales director can access all territories
  const roles = await pool.query(
    `SELECT r.code
     FROM roles r
     INNER JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
    [userId]
  );

  const userRoles = roles.rows.map((r: any) => r.code);
  if (userRoles.includes('system_admin') || userRoles.includes('sales_director')) {
    return true;
  }

  // Check if user is assigned to territory
  const assignment = await pool.query(
    `SELECT id FROM user_territories
     WHERE user_id = $1 AND territory_id = $2`,
    [userId, territoryId]
  );

  return assignment.rows.length > 0;
}

