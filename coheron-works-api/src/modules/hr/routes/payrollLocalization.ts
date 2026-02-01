import express from "express";
import { PayrollLocalization } from "../../../models/PayrollLocalization.js";
import { asyncHandler } from "../../../shared/middleware/asyncHandler.js";
import { payrollLocalizations } from "../../../data/payrollLocalizations.js";
import { calculatePayroll, getComplianceReports } from "../../../services/multiCountryPayrollService.js";

const router = express.Router();

// List configured countries
router.get("/countries", asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  const countries = await PayrollLocalization.find(filter).select("country_code country_name is_active payment_config.currency").lean();
  res.json(countries);
}));

// Add country localization
router.post("/countries", asyncHandler(async (req, res) => {
  const loc = await PayrollLocalization.create(req.body);
  res.status(201).json(loc);
}));

// Get country config
router.get("/countries/:code", asyncHandler(async (req, res) => {
  const loc = await PayrollLocalization.findOne({ country_code: req.params.code.toUpperCase() }).lean();
  if (!loc) return res.status(404).json({ error: "Country not found" });
  res.json(loc);
}));

// Update country config
router.put("/countries/:code", asyncHandler(async (req, res) => {
  const loc = await PayrollLocalization.findOneAndUpdate({ country_code: req.params.code.toUpperCase() }, req.body, { new: true });
  if (!loc) return res.status(404).json({ error: "Country not found" });
  res.json(loc);
}));

// Seed default localizations
router.post("/countries/seed", asyncHandler(async (req, res) => {
  const tenantId = req.body.tenant_id || "default";
  const results = [];
  for (const loc of payrollLocalizations) {
    const existing = await PayrollLocalization.findOne({ tenant_id: tenantId, country_code: loc.country_code });
    if (!existing) {
      const created = await PayrollLocalization.create({ ...loc, tenant_id: tenantId });
      results.push({ country_code: loc.country_code, status: "created" });
    } else {
      results.push({ country_code: loc.country_code, status: "exists" });
    }
  }
  res.json({ seeded: results });
}));

// Calculate payroll
router.post("/calculate", asyncHandler(async (req, res) => {
  const { tenant_id, employee_id, country_code, gross_salary, options } = req.body;
  const result = await calculatePayroll(tenant_id, employee_id, country_code, gross_salary, options);
  res.json(result);
}));

// Get compliance reports
router.get("/compliance-reports", asyncHandler(async (req, res) => {
  const { tenant_id, country_code, period } = req.query as any;
  const reports = await getComplianceReports(tenant_id, country_code, period);
  res.json(reports);
}));

export default router;
