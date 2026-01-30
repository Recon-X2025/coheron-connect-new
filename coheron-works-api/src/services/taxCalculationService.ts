export interface TaxInput {
  gross_annual_salary: number;
  basic_salary?: number;
  hra_received?: number;
  rent_paid?: number;
  metro_city?: boolean;
  lta_claimed?: number;
  section_80c?: number;    // PF, PPF, ELSS, LIC, etc.
  section_80d?: number;    // Health insurance
  section_24b?: number;    // Home loan interest
  other_deductions?: number;
}

export interface TaxResult {
  regime: 'old' | 'new';
  gross_income: number;
  standard_deduction: number;
  hra_exemption: number;
  lta_exemption: number;
  total_deductions: number;
  taxable_income: number;
  tax_before_cess: number;
  cess: number;
  total_tax: number;
  effective_rate: number;
  slab_breakdown: { slab: string; rate: number; tax: number }[];
}

function calculateHRAExemption(input: TaxInput): number {
  if (!input.hra_received || !input.rent_paid || !input.basic_salary) return 0;
  const basic = input.basic_salary;
  const hra = input.hra_received;
  const rent = input.rent_paid;
  const metroPercent = input.metro_city ? 0.5 : 0.4;

  return Math.min(
    hra,
    metroPercent * basic,
    Math.max(0, rent - 0.1 * basic)
  );
}

function applySlabs(taxable: number, slabs: { upto: number; rate: number }[]): { tax: number; breakdown: { slab: string; rate: number; tax: number }[] } {
  let remaining = taxable;
  let tax = 0;
  const breakdown: { slab: string; rate: number; tax: number }[] = [];
  let prev = 0;

  for (const slab of slabs) {
    const width = slab.upto - prev;
    const amount = Math.min(remaining, width);
    const slabTax = amount * slab.rate;
    if (amount > 0) {
      breakdown.push({
        slab: `${(prev / 100000).toFixed(1)}L - ${slab.upto === Infinity ? '∞' : (slab.upto / 100000).toFixed(1) + 'L'}`,
        rate: slab.rate * 100,
        tax: Math.round(slabTax),
      });
    }
    tax += slabTax;
    remaining -= amount;
    prev = slab.upto;
    if (remaining <= 0) break;
  }

  return { tax: Math.round(tax), breakdown };
}

export function calculateOldRegimeTax(input: TaxInput): TaxResult {
  const gross = input.gross_annual_salary;
  const standardDeduction = 50000;
  const hraExemption = calculateHRAExemption(input);
  const ltaExemption = Math.min(input.lta_claimed || 0, 100000);
  const sec80c = Math.min(input.section_80c || 0, 150000);
  const sec80d = Math.min(input.section_80d || 0, 25000);
  const sec24b = Math.min(input.section_24b || 0, 200000);
  const otherDed = input.other_deductions || 0;

  const totalDeductions = standardDeduction + hraExemption + ltaExemption + sec80c + sec80d + sec24b + otherDed;
  const taxable = Math.max(0, gross - totalDeductions);

  const slabs = [
    { upto: 250000, rate: 0 },
    { upto: 500000, rate: 0.05 },
    { upto: 1000000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 },
  ];

  const { tax, breakdown } = applySlabs(taxable, slabs);

  // Rebate u/s 87A for old regime (taxable <= 5L)
  const taxAfterRebate = taxable <= 500000 ? 0 : tax;
  const cess = Math.round(taxAfterRebate * 0.04);

  return {
    regime: 'old',
    gross_income: gross,
    standard_deduction: standardDeduction,
    hra_exemption: hraExemption,
    lta_exemption: ltaExemption,
    total_deductions: totalDeductions,
    taxable_income: taxable,
    tax_before_cess: taxAfterRebate,
    cess,
    total_tax: taxAfterRebate + cess,
    effective_rate: gross > 0 ? Math.round(((taxAfterRebate + cess) / gross) * 10000) / 100 : 0,
    slab_breakdown: breakdown,
  };
}

export function calculateNewRegimeTax(input: TaxInput): TaxResult {
  const gross = input.gross_annual_salary;
  const standardDeduction = 75000;
  // New regime: no other deductions
  const totalDeductions = standardDeduction;
  const taxable = Math.max(0, gross - totalDeductions);

  const slabs = [
    { upto: 300000, rate: 0 },
    { upto: 700000, rate: 0.05 },
    { upto: 1000000, rate: 0.10 },
    { upto: 1200000, rate: 0.15 },
    { upto: 1500000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 },
  ];

  const { tax, breakdown } = applySlabs(taxable, slabs);

  // Rebate u/s 87A for new regime (taxable <= 7L)
  const taxAfterRebate = taxable <= 700000 ? 0 : tax;
  const cess = Math.round(taxAfterRebate * 0.04);

  return {
    regime: 'new',
    gross_income: gross,
    standard_deduction: standardDeduction,
    hra_exemption: 0,
    lta_exemption: 0,
    total_deductions: totalDeductions,
    taxable_income: taxable,
    tax_before_cess: taxAfterRebate,
    cess,
    total_tax: taxAfterRebate + cess,
    effective_rate: gross > 0 ? Math.round(((taxAfterRebate + cess) / gross) * 10000) / 100 : 0,
    slab_breakdown: breakdown,
  };
}

export function compareTaxRegimes(input: TaxInput): { old_regime: TaxResult; new_regime: TaxResult; recommended: 'old' | 'new'; savings: number } {
  const oldResult = calculateOldRegimeTax(input);
  const newResult = calculateNewRegimeTax(input);
  const recommended = oldResult.total_tax <= newResult.total_tax ? 'old' : 'new';
  const savings = Math.abs(oldResult.total_tax - newResult.total_tax);

  return { old_regime: oldResult, new_regime: newResult, recommended, savings };
}

export function projectAnnualTax(
  salary: { gross_monthly: number; gross_annual: number },
  declarations: TaxInput,
  regime: 'old' | 'new',
  monthsRemaining: number
): { annual_tax: number; monthly_tds: number; tax_paid_so_far: number; remaining_tax: number } {
  const result = regime === 'old' ? calculateOldRegimeTax(declarations) : calculateNewRegimeTax(declarations);
  const monthsPassed = 12 - monthsRemaining;
  const monthlyTds = monthsRemaining > 0 ? Math.round(result.total_tax / 12) : 0;
  const taxPaid = monthlyTds * monthsPassed;
  const remainingTax = Math.max(0, result.total_tax - taxPaid);

  return {
    annual_tax: result.total_tax,
    monthly_tds: monthsRemaining > 0 ? Math.round(remainingTax / monthsRemaining) : 0,
    tax_paid_so_far: taxPaid,
    remaining_tax: remainingTax,
  };
}

export interface Form16Data {
  employee: { name: string; pan: string; employee_id: string };
  employer: { name: string; tan: string; address: string };
  financial_year: string;
  assessment_year: string;
  part_a: {
    employer_name: string;
    employer_tan: string;
    employee_name: string;
    employee_pan: string;
    tds_entries: { quarter: string; amount_paid: number; tds_deducted: number; tds_deposited: number; date: string }[];
    total_tds: number;
  };
  part_b: {
    gross_salary: number;
    allowances_exempt: number;
    net_salary: number;
    standard_deduction: number;
    income_from_house_property: number;
    gross_total_income: number;
    deductions: { section: string; description: string; amount: number }[];
    total_deductions: number;
    taxable_income: number;
    tax_on_total_income: number;
    cess: number;
    total_tax_payable: number;
    relief_under_89: number;
    net_tax_payable: number;
    tds_deducted: number;
    balance_tax: number;
  };
}

export function generateForm16(
  employee: { name: string; pan: string; employee_id: string },
  taxResult: TaxResult,
  employer: { name: string; tan: string; address: string },
  tdsEntries: { quarter: string; amount_paid: number; tds_deducted: number; tds_deposited: number; date: string }[]
): Form16Data {
  const totalTds = tdsEntries.reduce((sum, e) => sum + e.tds_deducted, 0);
  const now = new Date();
  const fy = now.getMonth() >= 3
    ? `${now.getFullYear()}-${now.getFullYear() + 1}`
    : `${now.getFullYear() - 1}-${now.getFullYear()}`;
  const ay = now.getMonth() >= 3
    ? `${now.getFullYear() + 1}-${now.getFullYear() + 2}`
    : `${now.getFullYear()}-${now.getFullYear() + 1}`;

  const deductions: { section: string; description: string; amount: number }[] = [];
  if (taxResult.regime === 'old') {
    if (taxResult.hra_exemption > 0) deductions.push({ section: '10(13A)', description: 'HRA Exemption', amount: taxResult.hra_exemption });
    if (taxResult.lta_exemption > 0) deductions.push({ section: '10(5)', description: 'LTA Exemption', amount: taxResult.lta_exemption });
  }

  const totalDeductionsAmount = deductions.reduce((s, d) => s + d.amount, 0);

  return {
    employee,
    employer,
    financial_year: fy,
    assessment_year: ay,
    part_a: {
      employer_name: employer.name,
      employer_tan: employer.tan,
      employee_name: employee.name,
      employee_pan: employee.pan,
      tds_entries: tdsEntries,
      total_tds: totalTds,
    },
    part_b: {
      gross_salary: taxResult.gross_income,
      allowances_exempt: taxResult.hra_exemption + taxResult.lta_exemption,
      net_salary: taxResult.gross_income - taxResult.hra_exemption - taxResult.lta_exemption,
      standard_deduction: taxResult.standard_deduction,
      income_from_house_property: 0,
      gross_total_income: taxResult.taxable_income + taxResult.total_deductions - taxResult.standard_deduction - taxResult.hra_exemption - taxResult.lta_exemption,
      deductions,
      total_deductions: totalDeductionsAmount,
      taxable_income: taxResult.taxable_income,
      tax_on_total_income: taxResult.tax_before_cess,
      cess: taxResult.cess,
      total_tax_payable: taxResult.total_tax,
      relief_under_89: 0,
      net_tax_payable: taxResult.total_tax,
      tds_deducted: totalTds,
      balance_tax: Math.max(0, taxResult.total_tax - totalTds),
    },
  };
}
