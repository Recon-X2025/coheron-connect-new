import { registerWorkflowBridge } from './workflowBridge.js';
import { registerNotificationBridge } from './notificationBridge.js';
import { registerInvoiceHandlers } from './invoiceHandlers.js';
import { registerPaymentHandlers } from './paymentHandlers.js';
import { registerSaleOrderHandlers } from './saleOrderHandlers.js';
import { registerInventoryHandlers } from './inventoryHandlers.js';
import { registerWebhookBridge } from './webhookBridge.js';
import { registerApprovalResumeHandler } from './approvalResumeHandler.js';
import logger from '../../shared/utils/logger.js';

export function registerAllHandlers(): void {
  registerWorkflowBridge();
  registerNotificationBridge();
  registerWebhookBridge();
  registerApprovalResumeHandler();
  registerInvoiceHandlers();
  registerPaymentHandlers();
  registerSaleOrderHandlers();
  registerInventoryHandlers();
  logger.info('All orchestration event handlers registered');
}
