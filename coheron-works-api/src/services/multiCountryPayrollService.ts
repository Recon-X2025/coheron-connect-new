import { PayrollLocalization } from "../models/PayrollLocalization.js";

interface PayrollDeduction {
  name: string;
  employee_share: number;
  employer_share: number;
}

interface PayrollResult {
  gross: number;
  deductions: PayrollDeduction[];
  net: number;
  employer_cost: number;
  tax_breakdown: { name: string; amount: number }[];
}

function calculateSlabTax(income: number, brackets: Array<{ from: number; to: number; rate: number; cess_rate?: number }>): { tax: number; cess: number } {
  let tax = 0;
  let cessable = 0;
  for (const b of brackets) {
    if (income <= b.from) break;
    const taxable = Math.min(income, b.to) - b.from;
    const slabTax = (taxable * b.rate) / 100;
    tax += slabTax;
    if (b.cess_rate) cessable += slabTax;
  }
  const avgCessRate = brackets.find(b => b.cess_rate)?.cess_rate || 0;
  return { tax, cess: (cessable * avgCessRate) / 100 };
}

export async function calculatePayroll(tenantId: string, _employeeId: string, countryCode: string, grossSalary: number, _options: any = {}): Promise<PayrollResult> {
  const loc = await PayrollLocalization.findOne({ tenant_id: tenantId, country_code: countryCode, is_active: true }).lean();
  if (!loc) throw new Error("Payroll localization not found for country: " + countryCode);

  const deductions: PayrollDeduction[] = [];
  const taxBreakdown: { name: string; amount: number }[] = [];
  let totalEmployeeDeductions = 0;
  let totalEmployerCost = 0;

  // Social security components
  for (const comp of loc.social_security?.components || []) {
    const basis = comp.max_basis ? Math.min(grossSalary, comp.max_basis) : grossSalary;
    const empShare = (basis * comp.employee_rate) / 100;
    const erShare = (basis * comp.employer_rate) / 100;
    deductions.push({ name: comp.name, employee_share: empShare, employer_share: erShare });
    totalEmployeeDeductions += empShare;
    totalEmployerCost += erShare;
  }

  // Statutory components
  for (const comp of loc.statutory_components || []) {
    let empShare = 0;
    let erShare = 0;
    if (comp.calculation === "percentage" && comp.rate) {
      empShare = (grossSalary * (comp.employee_share || 0)) / 100;
      erShare = (grossSalary * (comp.employer_share || 0)) / 100;
    } else if (comp.calculation === "fixed") {
      empShare = comp.employee_share || 0;
      erShare = comp.employer_share || 0;
    }
    if (empShare > 0 || erShare > 0) {
      deductions.push({ name: comp.name, employee_share: empShare, employer_share: erShare });
      totalEmployeeDeductions += empShare;
      totalEmployerCost += erShare;
    }
  }

  // Income tax
  const taxableIncome = Math.max(0, grossSalary * 12 - (loc.tax_config?.standard_deduction || 0));
  const { tax: annualTax, cess } = calculateSlabTax(taxableIncome, loc.tax_config?.tax_brackets || []);
  const monthlyTax = annualTax / 12;
  const monthlyCess = cess / 12;
  if (monthlyTax > 0) {
    taxBreakdown.push({ name: "Income Tax", amount: monthlyTax });
    totalEmployeeDeductions += monthlyTax;
  }
  if (monthlyCess > 0) {
    taxBreakdown.push({ name: "Cess", amount: monthlyCess });
    totalEmployeeDeductions += monthlyCess;
  }

  return {
    gross: grossSalary,
    deductions,
    net: grossSalary - totalEmployeeDeductions,
    employer_cost: grossSalary + totalEmployerCost,
    tax_breakdown: taxBreakdown,
  };
}

export async function getComplianceReports(tenantId: string, countryCode: string, _period: string): Promise<any[]> {
  const loc = await PayrollLocalization.findOne({ tenant_id: tenantId, country_code: countryCode, is_active: true }).lean();
  if (!loc) throw new Error("Payroll localization not found for country: " + countryCode);
  return loc.compliance_reports || [];
}
