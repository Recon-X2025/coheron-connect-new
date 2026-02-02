import mongoose from 'mongoose';
import logger from '../shared/utils/logger.js';

interface ImportTemplate {
  id: string;
  name: string;
  source: string;
  target_collection: string;
  field_mappings: Array<{ source_field: string; target_field: string; transform?: string }>;
}

interface ImportResult {
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

const TEMPLATES: ImportTemplate[] = [
  {
    id: 'tally-ledgers', name: 'Tally Prime - Ledgers', source: 'tally', target_collection: 'accounts',
    field_mappings: [
      { source_field: 'LEDGERNAME', target_field: 'name' },
      { source_field: 'PARENT', target_field: 'parent_account' },
      { source_field: 'OPENINGBALANCE', target_field: 'opening_balance', transform: 'parseFloat' },
      { source_field: 'ISDEEMEDPOSITIVE', target_field: 'account_type', transform: 'tallyAccountType' },
    ],
  },
  {
    id: 'tally-parties', name: 'Tally Prime - Parties', source: 'tally', target_collection: 'partners',
    field_mappings: [
      { source_field: 'LEDGERNAME', target_field: 'name' },
      { source_field: 'ADDRESS', target_field: 'street' },
      { source_field: 'STATENAME', target_field: 'state' },
      { source_field: 'PINCODE', target_field: 'zip' },
      { source_field: 'LEDGERPHONE', target_field: 'phone' },
      { source_field: 'LEDGEREMAIL', target_field: 'email' },
      { source_field: 'GSTREGISTRATIONTYPE', target_field: 'gst_type' },
      { source_field: 'PARTYGSTIN', target_field: 'gstin' },
    ],
  },
  {
    id: 'tally-stock', name: 'Tally Prime - Stock Items', source: 'tally', target_collection: 'products',
    field_mappings: [
      { source_field: 'STOCKITEMNAME', target_field: 'name' },
      { source_field: 'STOCKGROUP', target_field: 'category' },
      { source_field: 'BASEUNITS', target_field: 'uom' },
      { source_field: 'OPENINGBALANCE', target_field: 'qty_on_hand', transform: 'parseFloat' },
      { source_field: 'OPENINGRATE', target_field: 'list_price', transform: 'parseFloat' },
      { source_field: 'HSNCODE', target_field: 'hsn_code' },
      { source_field: 'GSTRATE', target_field: 'tax_rate', transform: 'parseFloat' },
    ],
  },
  {
    id: 'zoho-contacts', name: 'Zoho Books - Contacts', source: 'zoho', target_collection: 'partners',
    field_mappings: [
      { source_field: 'Contact Name', target_field: 'name' },
      { source_field: 'Company Name', target_field: 'company_name' },
      { source_field: 'Email', target_field: 'email' },
      { source_field: 'Phone', target_field: 'phone' },
      { source_field: 'Billing Address', target_field: 'street' },
      { source_field: 'Billing City', target_field: 'city' },
      { source_field: 'Billing State', target_field: 'state' },
      { source_field: 'Billing Zip', target_field: 'zip' },
      { source_field: 'GSTIN', target_field: 'gstin' },
      { source_field: 'Contact Type', target_field: 'partner_type' },
    ],
  },
  {
    id: 'zoho-invoices', name: 'Zoho Books - Invoices', source: 'zoho', target_collection: 'accountmoves',
    field_mappings: [
      { source_field: 'Invoice Number', target_field: 'name' },
      { source_field: 'Invoice Date', target_field: 'invoice_date', transform: 'parseDate' },
      { source_field: 'Due Date', target_field: 'invoice_date_due', transform: 'parseDate' },
      { source_field: 'Customer Name', target_field: 'partner_name' },
      { source_field: 'Total', target_field: 'amount_total', transform: 'parseFloat' },
      { source_field: 'Balance', target_field: 'amount_residual', transform: 'parseFloat' },
      { source_field: 'Status', target_field: 'payment_state', transform: 'zohoPaymentState' },
    ],
  },
  {
    id: 'quickbooks-customers', name: 'QuickBooks - Customers', source: 'quickbooks', target_collection: 'partners',
    field_mappings: [
      { source_field: 'Customer', target_field: 'name' },
      { source_field: 'Email', target_field: 'email' },
      { source_field: 'Phone', target_field: 'phone' },
      { source_field: 'Street', target_field: 'street' },
      { source_field: 'City', target_field: 'city' },
      { source_field: 'State', target_field: 'state' },
      { source_field: 'Zip', target_field: 'zip' },
    ],
  },
  {
    id: 'quickbooks-items', name: 'QuickBooks - Items', source: 'quickbooks', target_collection: 'products',
    field_mappings: [
      { source_field: 'Item Name', target_field: 'name' },
      { source_field: 'Type', target_field: 'type' },
      { source_field: 'Description', target_field: 'description' },
      { source_field: 'Rate', target_field: 'list_price', transform: 'parseFloat' },
      { source_field: 'Quantity On Hand', target_field: 'qty_on_hand', transform: 'parseFloat' },
      { source_field: 'SKU', target_field: 'default_code' },
    ],
  },
  {
    id: 'excel-partners', name: 'Excel - Partners', source: 'excel', target_collection: 'partners',
    field_mappings: [
      { source_field: 'Name', target_field: 'name' },
      { source_field: 'Email', target_field: 'email' },
      { source_field: 'Phone', target_field: 'phone' },
      { source_field: 'Address', target_field: 'street' },
      { source_field: 'City', target_field: 'city' },
      { source_field: 'State', target_field: 'state' },
      { source_field: 'PIN Code', target_field: 'zip' },
      { source_field: 'GSTIN', target_field: 'gstin' },
      { source_field: 'Type', target_field: 'partner_type' },
    ],
  },
  {
    id: 'excel-products', name: 'Excel - Products', source: 'excel', target_collection: 'products',
    field_mappings: [
      { source_field: 'Name', target_field: 'name' },
      { source_field: 'SKU', target_field: 'default_code' },
      { source_field: 'Category', target_field: 'category' },
      { source_field: 'Price', target_field: 'list_price', transform: 'parseFloat' },
      { source_field: 'Quantity', target_field: 'qty_on_hand', transform: 'parseFloat' },
      { source_field: 'HSN Code', target_field: 'hsn_code' },
      { source_field: 'Tax Rate', target_field: 'tax_rate', transform: 'parseFloat' },
      { source_field: 'Barcode', target_field: 'barcode' },
    ],
  },
  {
    id: 'excel-employees', name: 'Excel - Employees', source: 'excel', target_collection: 'employees',
    field_mappings: [
      { source_field: 'Name', target_field: 'name' },
      { source_field: 'Email', target_field: 'work_email' },
      { source_field: 'Phone', target_field: 'phone' },
      { source_field: 'Department', target_field: 'department_name' },
      { source_field: 'Job Title', target_field: 'job_title' },
      { source_field: 'Hire Date', target_field: 'hire_date', transform: 'parseDate' },
      { source_field: 'Salary', target_field: 'salary.ctc', transform: 'parseFloat' },
      { source_field: 'PAN', target_field: 'pan_number' },
      { source_field: 'UAN', target_field: 'statutory_india.uan' },
    ],
  },
];

function applyTransform(value: any, transform?: string): any {
  if (value === undefined || value === null || value === '') return null;
  switch (transform) {
    case 'parseFloat': return parseFloat(String(value).replace(/[,₹$]/g, '')) || 0;
    case 'parseDate': {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    case 'tallyAccountType':
      return value === 'Yes' ? 'asset' : 'liability';
    case 'zohoPaymentState': {
      const map: Record<string, string> = { Paid: 'paid', 'Partially Paid': 'partial', Overdue: 'not_paid', Sent: 'not_paid', Draft: 'not_paid' };
      return map[value] || 'not_paid';
    }
    default: return value;
  }
}

function setNestedField(obj: any, path: string, value: any) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

export class DataImportService {
  static getTemplates(): ImportTemplate[] {
    return TEMPLATES;
  }

  static getTemplate(id: string): ImportTemplate | undefined {
    return TEMPLATES.find(t => t.id === id);
  }

  static async preview(rows: Record<string, any>[], templateId: string, customMappings?: Array<{ source_field: string; target_field: string }>): Promise<{ mapped: any[]; unmapped_fields: string[] }> {
    const template = TEMPLATES.find(t => t.id === templateId);
    const mappings = customMappings || template?.field_mappings || [];

    const sourceFields = rows.length > 0 ? Object.keys(rows[0]) : [];
    const mappedFields = mappings.map(m => m.source_field);
    const unmapped = sourceFields.filter(f => !mappedFields.includes(f));

    const mapped = rows.slice(0, 10).map(row => {
      const doc: Record<string, any> = {};
      for (const mapping of mappings) {
        const value = row[mapping.source_field];
        const transformed = applyTransform(value, (mapping as any).transform);
        if (transformed !== null && transformed !== undefined) {
          setNestedField(doc, mapping.target_field, transformed);
        }
      }
      return doc;
    });

    return { mapped, unmapped_fields: unmapped };
  }

  static async execute(
    rows: Record<string, any>[],
    templateId: string,
    tenantId: string,
    customMappings?: Array<{ source_field: string; target_field: string; transform?: string }>,
  ): Promise<ImportResult> {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template && !customMappings) throw new Error('Template not found and no custom mappings provided');

    const mappings = customMappings || template!.field_mappings;
    const collection = template?.target_collection || 'partners';
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const result: ImportResult = { total_rows: rows.length, imported_rows: 0, skipped_rows: 0, errors: [] };
    const batch: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const doc: Record<string, any> = {
          tenant_id: new mongoose.Types.ObjectId(tenantId),
          created_at: new Date(),
          updated_at: new Date(),
          _import_source: template?.source || 'manual',
          _import_template: templateId,
        };

        for (const mapping of mappings) {
          const value = rows[i][mapping.source_field];
          const transformed = applyTransform(value, mapping.transform);
          if (transformed !== null && transformed !== undefined) {
            setNestedField(doc, mapping.target_field, transformed);
          }
        }

        // Validate required: name field
        if (!doc.name && !doc.work_email) {
          result.errors.push({ row: i + 1, field: 'name', message: 'Name is required' });
          result.skipped_rows++;
          continue;
        }

        // Duplicate detection by name within tenant
        const existing = await db.collection(collection).findOne({
          tenant_id: doc.tenant_id,
          $or: [
            { name: doc.name },
            ...(doc.email ? [{ email: doc.email }] : []),
            ...(doc.default_code ? [{ default_code: doc.default_code }] : []),
          ],
        });

        if (existing) {
          result.skipped_rows++;
          result.errors.push({ row: i + 1, field: 'name', message: `Duplicate: ${doc.name || doc.email} already exists` });
          continue;
        }

        batch.push(doc);

        // Batch insert every 100 rows
        if (batch.length >= 100) {
          await db.collection(collection).insertMany(batch);
          result.imported_rows += batch.length;
          batch.length = 0;
        }
      } catch (err: any) {
        result.errors.push({ row: i + 1, field: '', message: err.message });
        result.skipped_rows++;
      }
    }

    // Insert remaining
    if (batch.length > 0) {
      await db.collection(collection).insertMany(batch);
      result.imported_rows += batch.length;
    }

    logger.info({ tenantId, templateId, ...result }, 'Data import completed');
    return result;
  }
}
