import { z } from 'zod';

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const createSaleOrderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  partner_id: objectIdString.optional(),
  date_order: z.string().datetime().optional(),
  user_id: objectIdString.optional(),
  order_line: z.array(z.object({
    product_id: objectIdString,
    product_uom_qty: z.number().positive('Quantity must be positive'),
    price_unit: z.number().min(0, 'Price must be non-negative'),
  })).optional(),
});

export const updateSaleOrderSchema = z.object({
  state: z.enum(['draft', 'sale', 'done', 'cancel']).optional(),
  amount_total: z.number().optional(),
});

export const createQuotationSchema = z.object({
  partner_id: objectIdString,
  lines: z.array(z.object({
    product_id: objectIdString,
    quantity: z.number().positive(),
    unit_price: z.number().min(0),
  })).optional(),
  validity_date: z.string().datetime().optional(),
});

export const updateQuotationSchema = z.object({
  partner_id: objectIdString.optional(),
  lines: z.array(z.object({
    product_id: objectIdString,
    quantity: z.number().positive(),
    unit_price: z.number().min(0),
  })).optional(),
  validity_date: z.string().datetime().optional(),
});

export const createInvoiceSchema = z.object({
  name: z.string().optional(),
  partner_id: objectIdString.optional(),
  invoice_date: z.string().datetime().optional(),
  amount_total: z.number().min(0).optional(),
  amount_residual: z.number().min(0).optional(),
  state: z.enum(['draft', 'posted', 'cancel']).optional(),
  payment_state: z.enum(['not_paid', 'partial', 'paid']).optional(),
  move_type: z.enum(['out_invoice', 'in_invoice', 'out_refund', 'in_refund']).optional(),
});

export const updateInvoiceSchema = z.object({
  state: z.enum(['draft', 'posted', 'cancel']).optional(),
  payment_state: z.enum(['not_paid', 'partial', 'paid']).optional(),
  amount_residual: z.number().min(0).optional(),
});

export const recordPaymentSchema = z.object({
  invoice_id: objectIdString,
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.string().min(1),
  reference: z.string().optional(),
});

export const sendInvoiceSchema = z.object({
  email: z.string().email().optional(),
});
