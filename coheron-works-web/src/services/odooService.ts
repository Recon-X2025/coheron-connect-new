import type { Partner, Lead, SaleOrder, Product, Invoice, Employee, Project, Task, Payslip, Applicant, Policy, Appraisal, Course } from '../types/odoo';
import { odooRPCService } from './odooRPCService';
import { OdooAPIError } from './errorHandler';

/**
 * Odoo Service
 * Wrapper around Odoo RPC Service that provides a clean API
 * Falls back to mock data if not authenticated (for development)
 */
class OdooService {
    private useMockData: boolean = false;

    constructor() {
        // Check if we should use mock data (when not authenticated)
        this.useMockData = !odooRPCService.isAuthenticated();
    }

    /**
     * Generic search method
     */
    async search<T>(model: string, domain: any[] = [], fields: string[] = []): Promise<T[]> {
        if (this.useMockData && !odooRPCService.isAuthenticated()) {
            // Fallback to mock data if not authenticated
            return this.getMockData<T>(model);
        }

        try {
            return await odooRPCService.search<T>(model, domain, fields);
        } catch (error) {
            console.error(`Error searching ${model}:`, error);
            throw error;
        }
    }

    /**
     * Read specific records
     */
    async read<T>(model: string, ids: number[], fields: string[] = []): Promise<T[]> {
        if (this.useMockData && !odooRPCService.isAuthenticated()) {
            // Fallback to mock data
            const allRecords = await this.getMockData<T>(model);
            return allRecords.filter((record: any) => ids.includes(record.id));
        }

        try {
            return await odooRPCService.read<T>(model, ids, fields);
        } catch (error) {
            console.error(`Error reading ${model}:`, error);
            throw error;
        }
    }

    /**
     * Create new record
     */
    async create<T>(model: string, values: Partial<T>): Promise<number> {
        if (!odooRPCService.isAuthenticated()) {
            throw new OdooAPIError('Authentication required to create records', 401);
        }

        try {
            return await odooRPCService.create<T>(model, values);
        } catch (error) {
            console.error(`Error creating ${model}:`, error);
            throw error;
        }
    }

    /**
     * Update records
     */
    async write(model: string, ids: number[], values: any): Promise<boolean> {
        if (!odooRPCService.isAuthenticated()) {
            throw new OdooAPIError('Authentication required to update records', 401);
        }

        try {
            return await odooRPCService.write(model, ids, values);
        } catch (error) {
            console.error(`Error updating ${model}:`, error);
            throw error;
        }
    }

    /**
     * Delete records
     */
    async unlink(model: string, ids: number[]): Promise<boolean> {
        if (!odooRPCService.isAuthenticated()) {
            throw new OdooAPIError('Authentication required to delete records', 401);
        }

        try {
            return await odooRPCService.unlink(model, ids);
        } catch (error) {
            console.error(`Error deleting ${model}:`, error);
            throw error;
        }
    }

    /**
     * Call model method
     */
    async call(model: string, method: string, args: any[] = []): Promise<any> {
        if (!odooRPCService.isAuthenticated()) {
            throw new OdooAPIError('Authentication required to call model methods', 401);
        }

        try {
            return await odooRPCService.call(model, method, args);
        } catch (error) {
            console.error(`Error calling ${model}.${method}:`, error);
            throw error;
        }
    }

    /**
     * Get mock data (fallback for development)
     */
    private async getMockData<T>(model: string): Promise<T[]> {
        // Dynamic import to avoid loading mock data in production
        const { 
            mockUsers, mockPartners, mockLeads, mockProducts, mockSaleOrders,
            mockInvoices, mockEmployees, mockProjects, mockTasks, mockStockPickings,
            mockPayslips, mockApplicants, mockPolicies, mockAppraisals, mockCourses
        } = await import('../data/mockData');

        switch (model) {
            case 'res.partner':
                return mockPartners as T[];
            case 'crm.lead':
                return mockLeads as T[];
            case 'sale.order':
                return mockSaleOrders as T[];
            case 'product.product':
                return mockProducts as T[];
            case 'account.move':
                return mockInvoices as T[];
            case 'hr.employee':
                return mockEmployees as T[];
            case 'project.project':
                return mockProjects as T[];
            case 'project.task':
                return mockTasks as T[];
            case 'stock.picking':
                return mockStockPickings as T[];
            case 'res.users':
                return mockUsers as T[];
            case 'hr.payslip':
                return mockPayslips as T[];
            case 'hr.applicant':
                return mockApplicants as T[];
            case 'knowledge.article':
                return mockPolicies as T[];
            case 'hr.appraisal':
                return mockAppraisals as T[];
            case 'slide.channel':
                return mockCourses as T[];
            default:
                return [];
        }
    }
}

// Export singleton instance
export const odooService = new OdooService();

// Convenience methods for specific models
export const partnerService = {
    getAll: () => odooService.search<Partner>('res.partner'),
    getById: (id: number) => odooService.read<Partner>('res.partner', [id]),
    create: (values: Partial<Partner>) => odooService.create('res.partner', values),
    update: (id: number, values: Partial<Partner>) => odooService.write('res.partner', [id], values),
    delete: (id: number) => odooService.unlink('res.partner', [id]),
};

export const leadService = {
    getAll: () => odooService.search<Lead>('crm.lead'),
    getById: (id: number) => odooService.read<Lead>('crm.lead', [id]),
    getByStage: (stage: string) => odooService.search<Lead>('crm.lead').then(leads => leads.filter(l => l.stage === stage)),
    create: (values: Partial<Lead>) => odooService.create('crm.lead', values),
    update: (id: number, values: Partial<Lead>) => odooService.write('crm.lead', [id], values),
    delete: (id: number) => odooService.unlink('crm.lead', [id]),
};

export const saleOrderService = {
    getAll: () => odooService.search<SaleOrder>('sale.order'),
    getById: (id: number) => odooService.read<SaleOrder>('sale.order', [id]),
    create: (values: Partial<SaleOrder>) => odooService.create('sale.order', values),
    update: (id: number, values: Partial<SaleOrder>) => odooService.write('sale.order', [id], values),
    delete: (id: number) => odooService.unlink('sale.order', [id]),
};

export const productService = {
    getAll: () => odooService.search<Product>('product.product'),
    getById: (id: number) => odooService.read<Product>('product.product', [id]),
    create: (values: Partial<Product>) => odooService.create('product.product', values),
    update: (id: number, values: Partial<Product>) => odooService.write('product.product', [id], values),
    delete: (id: number) => odooService.unlink('product.product', [id]),
};

export const invoiceService = {
    getAll: () => odooService.search<Invoice>('account.move'),
    getById: (id: number) => odooService.read<Invoice>('account.move', [id]),
    create: (values: Partial<Invoice>) => odooService.create('account.move', values),
    update: (id: number, values: Partial<Invoice>) => odooService.write('account.move', [id], values),
    delete: (id: number) => odooService.unlink('account.move', [id]),
};

export const employeeService = {
    getAll: () => odooService.search<Employee>('hr.employee'),
    getById: (id: number) => odooService.read<Employee>('hr.employee', [id]),
    create: (values: Partial<Employee>) => odooService.create('hr.employee', values),
    update: (id: number, values: Partial<Employee>) => odooService.write('hr.employee', [id], values),
    delete: (id: number) => odooService.unlink('hr.employee', [id]),
};

export const projectService = {
    getAll: () => odooService.search<Project>('project.project'),
    getById: (id: number) => odooService.read<Project>('project.project', [id]),
    create: (values: Partial<Project>) => odooService.create('project.project', values),
    update: (id: number, values: Partial<Project>) => odooService.write('project.project', [id], values),
    delete: (id: number) => odooService.unlink('project.project', [id]),
};

export const taskService = {
    getAll: () => odooService.search<Task>('project.task'),
    getById: (id: number) => odooService.read<Task>('project.task', [id]),
    getByProject: (projectId: number) => odooService.search<Task>('project.task').then(tasks => tasks.filter(t => t.project_id === projectId)),
    create: (values: Partial<Task>) => odooService.create('project.task', values),
    update: (id: number, values: Partial<Task>) => odooService.write('project.task', [id], values),
    delete: (id: number) => odooService.unlink('project.task', [id]),
};

export const payrollService = {
    getAll: () => odooService.search<Payslip>('hr.payslip'),
    getById: (id: number) => odooService.read<Payslip>('hr.payslip', [id]),
    create: (values: Partial<Payslip>) => odooService.create('hr.payslip', values),
    update: (id: number, values: Partial<Payslip>) => odooService.write('hr.payslip', [id], values),
    delete: (id: number) => odooService.unlink('hr.payslip', [id]),
};

export const applicantService = {
    getAll: () => odooService.search<Applicant>('hr.applicant'),
    getById: (id: number) => odooService.read<Applicant>('hr.applicant', [id]),
    create: (values: Partial<Applicant>) => odooService.create('hr.applicant', values),
    update: (id: number, values: Partial<Applicant>) => odooService.write('hr.applicant', [id], values),
    delete: (id: number) => odooService.unlink('hr.applicant', [id]),
};

export const policyService = {
    getAll: () => odooService.search<Policy>('knowledge.article'),
    getById: (id: number) => odooService.read<Policy>('knowledge.article', [id]),
    create: (values: Partial<Policy>) => odooService.create('knowledge.article', values),
    update: (id: number, values: Partial<Policy>) => odooService.write('knowledge.article', [id], values),
    delete: (id: number) => odooService.unlink('knowledge.article', [id]),
};

export const appraisalService = {
    getAll: () => odooService.search<Appraisal>('hr.appraisal'),
    getById: (id: number) => odooService.read<Appraisal>('hr.appraisal', [id]),
    create: (values: Partial<Appraisal>) => odooService.create('hr.appraisal', values),
    update: (id: number, values: Partial<Appraisal>) => odooService.write('hr.appraisal', [id], values),
    delete: (id: number) => odooService.unlink('hr.appraisal', [id]),
};

export const courseService = {
    getAll: () => odooService.search<Course>('slide.channel'),
    getById: (id: number) => odooService.read<Course>('slide.channel', [id]),
    create: (values: Partial<Course>) => odooService.create('slide.channel', values),
    update: (id: number, values: Partial<Course>) => odooService.write('slide.channel', [id], values),
    delete: (id: number) => odooService.unlink('slide.channel', [id]),
};
