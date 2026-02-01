import { z } from 'zod';

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  default_code: z.string().optional(),
  type: z.enum(['product', 'service', 'consumable']).optional().default('product'),
  list_price: z.number().min(0, 'List price must be non-negative').optional().default(0),
  standard_price: z.number().min(0, 'Cost price must be non-negative').optional().default(0),
  qty_available: z.number().optional().default(0),
  categ_id: objectIdString.optional(),
  image_url: z.string().optional(),
  sku: z.string().optional(),
  hsn_code: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  default_code: z.string().optional(),
  type: z.enum(['product', 'service', 'consumable']).optional(),
  list_price: z.number().min(0).optional(),
  standard_price: z.number().min(0).optional(),
  qty_available: z.number().optional(),
  categ_id: objectIdString.optional(),
  image_url: z.string().optional(),
});

export const createPurchaseOrderSchema = z.object({
  vendor_id: objectIdString,
  lines: z.array(z.object({
    product_id: objectIdString,
    quantity: z.number().positive('Quantity must be positive'),
    unit_price: z.number().min(0, 'Unit price must be non-negative'),
  })).optional(),
});

export const updatePurchaseOrderSchema = z.object({
  vendor_id: objectIdString.optional(),
  lines: z.array(z.object({
    product_id: objectIdString,
    quantity: z.number().positive(),
    unit_price: z.number().min(0),
  })).optional(),
  state: z.string().optional(),
});

export const addSupplierSchema = z.object({
  supplier_id: objectIdString.optional(),
  name: z.string().optional(),
  price: z.number().min(0).optional(),
  lead_time: z.number().int().min(0).optional(),
});
