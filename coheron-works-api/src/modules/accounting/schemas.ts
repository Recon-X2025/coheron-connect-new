import { z } from 'zod';

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const createJournalEntrySchema = z.object({
  journal_id: objectIdString,
  date: z.string().min(1, 'Date is required'),
  ref: z.string().optional(),
  move_type: z.string().optional(),
  partner_id: objectIdString.optional(),
  currency_id: objectIdString.optional(),
  lines: z.array(z.object({
    account_id: objectIdString,
    partner_id: objectIdString.optional(),
    name: z.string().optional(),
    debit: z.number().min(0, 'Debit must be non-negative').optional().default(0),
    credit: z.number().min(0, 'Credit must be non-negative').optional().default(0),
    description: z.string().optional(),
    date: z.string().optional(),
    date_maturity: z.string().optional(),
    cost_center_id: objectIdString.optional(),
    project_id: objectIdString.optional(),
    product_id: objectIdString.optional(),
    tax_ids: z.array(objectIdString).optional(),
  })).min(1, 'At least one line is required'),
});

export const updateJournalEntrySchema = z.object({
  date: z.string().optional(),
  ref: z.string().optional(),
  partner_id: objectIdString.optional(),
  lines: z.array(z.object({
    account_id: objectIdString,
    partner_id: objectIdString.optional(),
    name: z.string().optional(),
    debit: z.number().min(0).optional().default(0),
    credit: z.number().min(0).optional().default(0),
    date: z.string().optional(),
    date_maturity: z.string().optional(),
    cost_center_id: objectIdString.optional(),
    project_id: objectIdString.optional(),
    product_id: objectIdString.optional(),
    tax_ids: z.array(objectIdString).optional(),
  })).optional(),
});

export const createAccountSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  name: z.string().min(1, 'Account name is required'),
  account_type: z.string().min(1, 'Account type is required'),
  parent_id: objectIdString.optional(),
  internal_type: z.string().optional(),
  reconcile: z.boolean().optional(),
  currency_id: objectIdString.optional(),
  tag_ids: z.array(objectIdString).optional(),
  notes: z.string().optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().optional(),
  account_type: z.string().optional(),
  parent_id: objectIdString.nullable().optional(),
  internal_type: z.string().optional(),
  reconcile: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  currency_id: objectIdString.optional(),
  tag_ids: z.array(objectIdString).optional(),
  notes: z.string().optional(),
});

export const createPaymentSchema = z.object({
  partner_id: objectIdString,
  amount: z.number().positive('Amount must be positive'),
  payment_type: z.enum(['inbound', 'outbound']),
  journal_id: objectIdString,
});
