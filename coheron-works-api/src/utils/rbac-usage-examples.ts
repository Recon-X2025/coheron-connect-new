/**
 * RBAC Usage Examples
 * 
 * This file demonstrates how to use the CRM RBAC utilities in your application code.
 * Copy and adapt these examples for your use case.
 */

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
} from './crm-rbac.js';
import { getUserPermissions, hasPermission } from './permissions.js';

// ============================================
// Example 1: Check User Permissions
// ============================================

export async function exampleCheckPermissions(userId: number) {
  // Get all user permissions
  const permissions = await getUserPermissions(userId);
  console.log('User permissions:', permissions);
  
  // Check specific permission
  const canCreateLeads = await hasPermission(userId, 'crm.leads.create');
  if (canCreateLeads) {
    // Allow creating leads
    console.log('User can create leads');
  }
  
  // Check multiple permissions
  const canManageLeads = await hasPermission(userId, 'crm.leads.create') &&
                          await hasPermission(userId, 'crm.leads.update');
  if (canManageLeads) {
    console.log('User can manage leads');
  }
}

// ============================================
// Example 2: Discount Approval Workflow
// ============================================

export async function exampleDiscountApproval(
  quoteId: number,
  userId: number,
  discountPercentage: number,
  originalAmount: number
) {
  // Calculate discounted amount
  const discountedAmount = originalAmount * (1 - discountPercentage / 100);
  
  // Create approval request
  const approvalId = await createDiscountApproval(
    quoteId,
    userId,
    discountPercentage,
    originalAmount,
    discountedAmount,
    'Bulk order discount for strategic customer'
  );
  
  if (approvalId === 0) {
    console.log('Discount auto-approved!');
    // Quote is already approved, proceed
  } else {
    console.log(`Approval requested. Approval ID: ${approvalId}`);
    // Quote status is now 'pending_approval'
    // Manager will need to approve via API or UI
  }
}

// ============================================
// Example 3: Approve Discount (Manager)
// ============================================

export async function exampleApproveDiscount(
  approvalId: number,
  managerId: number,
  approved: boolean,
  reason?: string
) {
  await processDiscountApproval(approvalId, managerId, approved, reason);
  
  if (approved) {
    console.log('Discount approved! Quote can now be finalized.');
  } else {
    console.log('Discount rejected. Quote needs to be updated.');
  }
}

// ============================================
// Example 4: Territory Auto-Assignment
// ============================================

export async function exampleTerritoryAssignment(leadId: number) {
  // When a lead is created, auto-assign to territory
  const territoryId = await assignToTerritory(
    leadId,
    '560001',      // ZIP code
    'Karnataka',   // State
    'India',       // Country
    'IT',          // Industry
    'Large'        // Company size
  );
  
  if (territoryId) {
    console.log(`Lead assigned to territory: ${territoryId}`);
    // Lead is now assigned to territory and user
  } else {
    console.log('No matching territory found. Manual assignment required.');
  }
}

// ============================================
// Example 5: Field-Level Security Check
// ============================================

export async function exampleFieldAccess(
  userId: number,
  quoteId: number,
  fieldName: string,
  newValue: any,
  oldValue?: any
) {
  // Check if user can edit the field
  const canEdit = await canAccessField(userId, 'quote', fieldName, 'edit');
  
  if (canEdit) {
    // Allow editing
    // ... update quote field ...
    
    // Log the access
    await logFieldAccess(
      userId,
      'quote',
      quoteId,
      fieldName,
      'edit',
      oldValue,
      newValue
    );
    
    console.log(`Field ${fieldName} updated successfully`);
  } else {
    // Deny access
    await logFieldAccess(
      userId,
      'quote',
      quoteId,
      fieldName,
      'denied',
      oldValue,
      newValue
    );
    
    throw new Error(`Insufficient permissions to edit ${fieldName}`);
  }
}

// ============================================
// Example 6: Export Permission Check
// ============================================

export async function exampleExportCheck(
  userId: number,
  resourceType: string,
  recordCount: number
) {
  const exportCheck = await canExport(userId, resourceType, recordCount);
  
  if (exportCheck.allowed && !exportCheck.requiresApproval) {
    // Direct export allowed
    console.log('Export allowed. Proceeding...');
    // ... perform export ...
  } else if (exportCheck.requiresApproval) {
    // Need approval
    const approvalId = await createExportApproval(
      userId,
      resourceType,
      recordCount,
      { /* filters */ },
      'Monthly report for management review'
    );
    
    console.log(`Export approval requested. Approval ID: ${approvalId}`);
    // Wait for approval before exporting
  } else {
    throw new Error(exportCheck.reason || 'Export not allowed');
  }
}

// ============================================
// Example 7: Partner Deal Registration
// ============================================

export async function examplePartnerDealRegistration(
  partnerId: number,
  leadId: number
) {
  // Register partner deal
  const registrationId = await registerPartnerDeal(
    partnerId,
    leadId,
    false // Requires approval
  );
  
  console.log(`Partner deal registered. Registration ID: ${registrationId}`);
  // Deal is now registered and pending approval
}

// ============================================
// Example 8: Check Partner Access
// ============================================

export async function examplePartnerAccess(
  partnerId: number,
  leadId: number
) {
  const hasAccess = await canPartnerAccess(partnerId, leadId);
  
  if (hasAccess) {
    console.log('Partner has access to this deal');
    // Allow viewing/editing
  } else {
    console.log('Partner does not have access to this deal');
    // Deny access
  }
}

// ============================================
// Example 9: Using in Express Route
// ============================================

/*
import { requirePermission } from '../middleware/permissions.js';
import { createDiscountApproval } from '../utils/crm-rbac.js';

// Protect route with permission
router.post('/quotes/:id/apply-discount', 
  requirePermission('crm.quotes.update'),
  async (req, res) => {
    const { discount_percentage } = req.body;
    const userId = req.user?.userId;
    const quoteId = parseInt(req.params.id);
    
    // Create approval request
    const approvalId = await createDiscountApproval(
      quoteId,
      userId,
      discount_percentage,
      req.body.original_amount,
      req.body.discounted_amount,
      req.body.justification
    );
    
    res.json({ approval_id: approvalId, status: 'pending' });
  }
);
*/

// ============================================
// Example 10: Check Territory Access
// ============================================

export async function exampleTerritoryAccess(
  userId: number,
  territoryId: number
) {
  const hasAccess = await canAccessTerritory(userId, territoryId);
  
  if (hasAccess) {
    console.log('User has access to this territory');
    // Allow viewing records in this territory
  } else {
    console.log('User does not have access to this territory');
    // Filter out records from this territory
  }
}

