import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';

export class PFESIService {
  static PF_RATE_EMPLOYEE = 0.12;
  static PF_RATE_EMPLOYER = 0.12;
  static ESI_RATE_EMPLOYEE = 0.0075;
  static ESI_RATE_EMPLOYER = 0.0325;
  static ESI_WAGE_LIMIT = 21000;
  static PF_WAGE_LIMIT = 15000;

  static async calculatePFContributions(tenantId: string, month: string): Promise<any> {
    const Employee = mongoose.models.Employee || mongoose.model('Employee');
    const employees = await Employee.find({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      status: 'active',
      'statutory_india.uan': { $exists: true },
    }).lean() as any[];

    const contributions = employees.map((emp: any) => {
      const basic = emp.salary?.basic || 0;
      const pfWage = Math.min(basic, PFESIService.PF_WAGE_LIMIT);

      return {
        uan: emp.statutory_india?.uan || '',
        employee_name: emp.name || `${emp.first_name} ${emp.last_name}`,
        pf_number: emp.statutory_india?.pf_number || '',
        basic_wage: basic,
        pf_wage: pfWage,
        employee_pf: Math.round(pfWage * PFESIService.PF_RATE_EMPLOYEE),
        employer_pf: Math.round(pfWage * 0.0367), // 3.67% to PF
        employer_eps: Math.round(pfWage * 0.0833), // 8.33% to EPS
        edli: Math.round(pfWage * 0.005),
        admin_charges: Math.round(pfWage * 0.005),
      };
    });

    const totals = {
      total_employees: contributions.length,
      total_employee_pf: contributions.reduce((s, c) => s + c.employee_pf, 0),
      total_employer_pf: contributions.reduce((s, c) => s + c.employer_pf, 0),
      total_employer_eps: contributions.reduce((s, c) => s + c.employer_eps, 0),
      total_edli: contributions.reduce((s, c) => s + c.edli, 0),
      total_admin: contributions.reduce((s, c) => s + c.admin_charges, 0),
    };

    logger.info({ tenantId, month, employees: contributions.length }, 'PF contributions calculated');
    return { month, contributions, totals };
  }

  static async generateECRFile(data: any): Promise<string> {
    // EPFO ECR (Electronic Challan cum Return) format
    const lines: string[] = [];
    // Header: #~#
    lines.push('#~#');

    for (const c of data.contributions) {
      // UAN, Member Name, Gross Wages, EPF Wages, EPS Wages, EDLI Wages, EPF Contribution (EE), EPS Contribution (ER), EPF Contribution (ER), NCP Days, Refund
      lines.push([
        c.uan, c.employee_name, c.basic_wage, c.pf_wage, c.pf_wage, c.pf_wage,
        c.employee_pf, c.employer_eps, c.employer_pf, 0, 0
      ].join('#~#'));
    }

    return lines.join('\n');
  }

  static async calculateESIContributions(tenantId: string, month: string): Promise<any> {
    const Employee = mongoose.models.Employee || mongoose.model('Employee');
    const employees = await Employee.find({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      status: 'active',
      'statutory_india.esi_number': { $exists: true },
    }).lean() as any[];

    const contributions = employees
      .filter((emp: any) => (emp.salary?.gross || 0) <= PFESIService.ESI_WAGE_LIMIT)
      .map((emp: any) => {
        const gross = emp.salary?.gross || 0;
        return {
          esi_number: emp.statutory_india?.esi_number || '',
          employee_name: emp.name || `${emp.first_name} ${emp.last_name}`,
          gross_wage: gross,
          employee_esi: Math.round(gross * PFESIService.ESI_RATE_EMPLOYEE),
          employer_esi: Math.round(gross * PFESIService.ESI_RATE_EMPLOYER),
          total_esi: Math.round(gross * (PFESIService.ESI_RATE_EMPLOYEE + PFESIService.ESI_RATE_EMPLOYER)),
        };
      });

    return {
      month,
      contributions,
      totals: {
        total_employees: contributions.length,
        total_employee_esi: contributions.reduce((s, c) => s + c.employee_esi, 0),
        total_employer_esi: contributions.reduce((s, c) => s + c.employer_esi, 0),
      },
    };
  }
}
