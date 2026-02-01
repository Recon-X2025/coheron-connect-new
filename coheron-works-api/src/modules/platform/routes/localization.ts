import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { CountryLocalization } from '../models/CountryLocalization.js';

const router = express.Router();

// List all localizations
router.get('/', asyncHandler(async (req, res) => {
  const { page = '1', limit = '50' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    CountryLocalization.find().sort({ country_name: 1 }).skip(skip).limit(Number(limit)).lean(),
    CountryLocalization.countDocuments(),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
}));

// List active countries
router.get('/active', asyncHandler(async (_req, res) => {
  const items = await CountryLocalization.find({ is_active: true }).sort({ country_name: 1 }).lean();
  res.json(items);
}));

// Get single
router.get('/:id', asyncHandler(async (req, res) => {
  const item = await CountryLocalization.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Localization not found' });
  res.json(item);
}));

// Create
router.post('/', asyncHandler(async (req, res) => {
  const item = await CountryLocalization.create(req.body);
  res.status(201).json(item);
}));

// Update
router.put('/:id', asyncHandler(async (req, res) => {
  const item = await CountryLocalization.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
  if (!item) return res.status(404).json({ error: 'Localization not found' });
  res.json(item);
}));

// Delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const item = await CountryLocalization.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Localization not found' });
  res.json({ message: 'Deleted' });
}));

// Seed default data
router.post('/seed', asyncHandler(async (_req, res) => {
  const defaults = [
    {
      country_code: 'IN', country_name: 'India', currency_code: 'INR', currency_symbol: '\u20B9',
      date_format: 'DD/MM/YYYY', number_format: { decimal_separator: '.', thousands_separator: ',', decimal_places: 2 },
      tax_system: 'GST', tax_rates: [
        { name: 'GST 5%', rate: 5, type: 'gst', is_default: false },
        { name: 'GST 12%', rate: 12, type: 'gst', is_default: false },
        { name: 'GST 18%', rate: 18, type: 'gst', is_default: true },
        { name: 'GST 28%', rate: 28, type: 'gst', is_default: false },
      ],
      fiscal_year_start: { month: 4, day: 1 },
      payroll_components: [
        { name: 'Basic Salary', type: 'earning', statutory: true, rate: 50 },
        { name: 'HRA', type: 'earning', statutory: true, rate: 20 },
        { name: 'PF', type: 'deduction', statutory: true, rate: 12 },
        { name: 'ESI', type: 'deduction', statutory: true, rate: 0.75 },
        { name: 'Professional Tax', type: 'deduction', statutory: true, rate: 0 },
      ],
      compliance_reports: [
        { name: 'GSTR-1', frequency: 'monthly', description: 'Outward supplies return' },
        { name: 'GSTR-3B', frequency: 'monthly', description: 'Summary return' },
        { name: 'TDS Return', frequency: 'quarterly', description: 'Tax deducted at source' },
      ],
      bank_formats: [{ name: 'NEFT/RTGS', format: 'rbi_neft' }],
      address_format: ['address_line_1', 'address_line_2', 'city', 'state', 'pincode'],
      phone_code: '+91', languages: ['en', 'hi'], is_active: true,
    },
    {
      country_code: 'US', country_name: 'United States', currency_code: 'USD', currency_symbol: '$',
      date_format: 'MM/DD/YYYY', number_format: { decimal_separator: '.', thousands_separator: ',', decimal_places: 2 },
      tax_system: 'Federal + State Sales Tax', tax_rates: [
        { name: 'No Tax', rate: 0, type: 'sales', is_default: true },
      ],
      fiscal_year_start: { month: 1, day: 1 },
      payroll_components: [
        { name: 'Federal Income Tax', type: 'deduction', statutory: true, rate: 0 },
        { name: 'Social Security', type: 'deduction', statutory: true, rate: 6.2 },
        { name: 'Medicare', type: 'deduction', statutory: true, rate: 1.45 },
      ],
      compliance_reports: [
        { name: 'Form 941', frequency: 'quarterly', description: 'Employer quarterly tax return' },
        { name: 'Form W-2', frequency: 'annual', description: 'Wage and tax statement' },
      ],
      bank_formats: [{ name: 'ACH', format: 'nacha' }],
      address_format: ['address_line_1', 'address_line_2', 'city', 'state', 'zip_code'],
      phone_code: '+1', languages: ['en'], is_active: true,
    },
    {
      country_code: 'GB', country_name: 'United Kingdom', currency_code: 'GBP', currency_symbol: '\u00A3',
      date_format: 'DD/MM/YYYY', number_format: { decimal_separator: '.', thousands_separator: ',', decimal_places: 2 },
      tax_system: 'VAT', tax_rates: [
        { name: 'Standard VAT', rate: 20, type: 'vat', is_default: true },
        { name: 'Reduced VAT', rate: 5, type: 'vat', is_default: false },
        { name: 'Zero Rate', rate: 0, type: 'vat', is_default: false },
      ],
      fiscal_year_start: { month: 4, day: 6 },
      payroll_components: [
        { name: 'PAYE', type: 'deduction', statutory: true, rate: 0 },
        { name: 'NI Employee', type: 'deduction', statutory: true, rate: 12 },
        { name: 'NI Employer', type: 'deduction', statutory: true, rate: 13.8 },
      ],
      compliance_reports: [
        { name: 'VAT Return', frequency: 'quarterly', description: 'MTD VAT return' },
        { name: 'RTI', frequency: 'monthly', description: 'Real time information for payroll' },
      ],
      bank_formats: [{ name: 'BACS', format: 'bacs_18' }],
      address_format: ['address_line_1', 'address_line_2', 'city', 'county', 'postcode'],
      phone_code: '+44', languages: ['en'], is_active: true,
    },
    {
      country_code: 'AE', country_name: 'United Arab Emirates', currency_code: 'AED', currency_symbol: 'AED',
      date_format: 'DD/MM/YYYY', number_format: { decimal_separator: '.', thousands_separator: ',', decimal_places: 2 },
      tax_system: 'VAT', tax_rates: [
        { name: 'VAT 5%', rate: 5, type: 'vat', is_default: true },
        { name: 'Zero Rate', rate: 0, type: 'vat', is_default: false },
      ],
      fiscal_year_start: { month: 1, day: 1 },
      payroll_components: [],
      compliance_reports: [
        { name: 'VAT Return', frequency: 'quarterly', description: 'FTA VAT return' },
      ],
      bank_formats: [{ name: 'WPS', format: 'uae_wps' }],
      address_format: ['address_line_1', 'address_line_2', 'city', 'emirate'],
      phone_code: '+971', languages: ['en', 'ar'], is_active: true,
    },
    {
      country_code: 'SG', country_name: 'Singapore', currency_code: 'SGD', currency_symbol: 'S$',
      date_format: 'DD/MM/YYYY', number_format: { decimal_separator: '.', thousands_separator: ',', decimal_places: 2 },
      tax_system: 'GST', tax_rates: [
        { name: 'GST 9%', rate: 9, type: 'gst', is_default: true },
        { name: 'Zero Rate', rate: 0, type: 'gst', is_default: false },
      ],
      fiscal_year_start: { month: 1, day: 1 },
      payroll_components: [
        { name: 'CPF Employee', type: 'deduction', statutory: true, rate: 20 },
        { name: 'CPF Employer', type: 'deduction', statutory: true, rate: 17 },
      ],
      compliance_reports: [
        { name: 'GST F5', frequency: 'quarterly', description: 'GST return' },
        { name: 'IR8A', frequency: 'annual', description: 'Employment income return' },
      ],
      bank_formats: [{ name: 'GIRO', format: 'sg_giro' }],
      address_format: ['address_line_1', 'address_line_2', 'postal_code'],
      phone_code: '+65', languages: ['en', 'zh', 'ms', 'ta'], is_active: true,
    },
  ];

  const results = [];
  for (const data of defaults) {
    const existing = await CountryLocalization.findOne({ country_code: data.country_code });
    if (existing) {
      const updated = await CountryLocalization.findByIdAndUpdate(existing._id, { $set: data }, { new: true });
      results.push({ country_code: data.country_code, action: 'updated', item: updated });
    } else {
      const created = await CountryLocalization.create(data);
      results.push({ country_code: data.country_code, action: 'created', item: created });
    }
  }

  res.json({ message: `Seeded ${results.length} countries`, results });
}));

export default router;
