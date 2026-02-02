// Domain event type constants

// Sales
export const SALEORDER_CREATED = 'saleorder.created';
export const SALEORDER_CONFIRMED = 'saleorder.confirmed';
export const SALEORDER_CANCELLED = 'saleorder.cancelled';
export const QUOTATION_CONVERTED = 'quotation.converted';

// Invoicing
export const INVOICE_CREATED = 'invoice.created';
export const INVOICE_POSTED = 'invoice.posted';
export const INVOICE_CANCELLED = 'invoice.cancelled';

// Payments
export const PAYMENT_RECORDED = 'payment.recorded';
export const CREDITNOTE_CREATED = 'creditnote.created';

// Inventory
export const STOCK_ADJUSTED = 'stock.adjusted';
export const STOCK_RESERVED = 'stock.reserved';
export const STOCK_RELEASED = 'stock.released';
export const DELIVERY_COMPLETED = 'delivery.completed';
export const GRN_RECEIVED = 'grn.received';

// Purchasing
export const PURCHASEORDER_APPROVED = 'purchaseorder.approved';
export const PURCHASEORDER_RECEIVED = 'purchaseorder.received';
export const VENDORBILL_POSTED = 'vendorbill.posted';

// Manufacturing
export const MANUFACTURINGORDER_STARTED = 'manufacturingorder.started';
export const MANUFACTURINGORDER_COMPLETED = 'manufacturingorder.completed';

// HR
export const LEAVE_APPROVED = 'leave.approved';
export const PAYROLL_COMPLETED = 'payroll.completed';

// Generic
export const ENTITY_CREATED = 'entity.created';
export const ENTITY_UPDATED = 'entity.updated';
export const ENTITY_DELETED = 'entity.deleted';

// Payload types
export interface SaleOrderEventPayload {
  order_id: string;
  partner_id?: string;
  amount_total?: number;
  order_name?: string;
}

export interface InvoiceEventPayload {
  invoice_id: string;
  partner_id?: string;
  amount_total?: number;
  tax_amount?: number;
  invoice_name?: string;
  sale_order_id?: string;
}

export interface PaymentEventPayload {
  invoice_id: string;
  payment_number: string;
  amount: number;
  partner_id?: string;
  total_paid?: number;
  status?: string;
}

export interface StockEventPayload {
  adjustment_id?: string;
  delivery_id?: string;
  grn_id?: string;
  warehouse_id?: string;
  product_ids?: string[];
}

export interface GenericEntityPayload {
  entity_type: string;
  entity_id: string;
  entity_name?: string;
}
