import { eventBus } from '../EventBus.js';
import { triggerWorkflows } from '../../shared/middleware/workflowTrigger.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../types.js';

// Map event types to workflow entity types and trigger types
const eventToWorkflowMap: Record<string, { entity: string; trigger: 'on_create' | 'on_update' | 'on_delete' }> = {
  'saleorder.created': { entity: 'SaleOrder', trigger: 'on_create' },
  'saleorder.confirmed': { entity: 'SaleOrder', trigger: 'on_update' },
  'saleorder.cancelled': { entity: 'SaleOrder', trigger: 'on_update' },
  'invoice.created': { entity: 'Invoice', trigger: 'on_create' },
  'invoice.posted': { entity: 'Invoice', trigger: 'on_update' },
  'invoice.cancelled': { entity: 'Invoice', trigger: 'on_update' },
  'payment.recorded': { entity: 'Payment', trigger: 'on_create' },
  'creditnote.created': { entity: 'CreditNote', trigger: 'on_create' },
  'stock.adjusted': { entity: 'StockAdjustment', trigger: 'on_create' },
  'delivery.completed': { entity: 'Delivery', trigger: 'on_update' },
  'grn.received': { entity: 'GRN', trigger: 'on_create' },
  'purchaseorder.approved': { entity: 'PurchaseOrder', trigger: 'on_update' },
  'purchaseorder.received': { entity: 'PurchaseOrder', trigger: 'on_update' },
  'vendorbill.posted': { entity: 'VendorBill', trigger: 'on_update' },
  'manufacturingorder.started': { entity: 'ManufacturingOrder', trigger: 'on_update' },
  'manufacturingorder.completed': { entity: 'ManufacturingOrder', trigger: 'on_update' },
  'leave.approved': { entity: 'LeaveRequest', trigger: 'on_update' },
  'payroll.completed': { entity: 'Payroll', trigger: 'on_update' },
  'entity.created': { entity: '', trigger: 'on_create' },
  'entity.updated': { entity: '', trigger: 'on_update' },
  'entity.deleted': { entity: '', trigger: 'on_delete' },
};

function getEntityId(event: DomainEvent): string {
  const p = event.payload;
  return p.order_id || p.invoice_id || p.adjustment_id || p.delivery_id || p.grn_id || p.entity_id || '';
}

export function registerWorkflowBridge(): void {
  eventBus.subscribeAll(async function workflowBridge(event: DomainEvent) {
    const mapping = eventToWorkflowMap[event.type];
    if (!mapping) return;

    const entityType = mapping.entity || event.payload?.entity_type || 'Unknown';
    const entityId = getEntityId(event);
    if (!entityId) return;

    try {
      await triggerWorkflows(mapping.trigger, entityType, entityId, event.tenant_id);
    } catch (err) {
      logger.error({ err, eventType: event.type }, 'Workflow bridge failed');
    }
  });
}
