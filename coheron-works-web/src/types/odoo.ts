// Mock data types matching Odoo models
export interface Partner {
    id: number;
    name: string;
    email: string;
    phone: string;
    company: string;
    image?: string;
    type: 'contact' | 'company';
}

export interface Lead {
    id: number;
    name: string;
    partner_id: number;
    email: string;
    phone: string;
    expected_revenue: number;
    probability: number;
    stage: 'new' | 'qualified' | 'proposition' | 'won' | 'lost';
    user_id: number;
    create_date: string;
    priority: 'low' | 'medium' | 'high';
}

export interface SaleOrder {
    id: number;
    name: string;
    partner_id: number;
    date_order: string;
    amount_total: number;
    state: 'draft' | 'sent' | 'sale' | 'done' | 'cancel';
    user_id: number;
    order_line: SaleOrderLine[];
}

export interface SaleOrderLine {
    id: number;
    product_id: number;
    product_uom_qty: number;
    price_unit: number;
    price_subtotal: number;
}

export interface Product {
    id: number;
    name: string;
    default_code: string;
    list_price: number;
    standard_price: number;
    qty_available: number;
    type: 'product' | 'service' | 'consu';
    categ_id: number;
    image?: string;
}

export interface Invoice {
    id: number;
    name: string;
    partner_id: number;
    invoice_date: string;
    amount_total: number;
    amount_residual: number;
    state: 'draft' | 'posted' | 'cancel';
    payment_state: 'not_paid' | 'in_payment' | 'paid' | 'partial';
    move_type: 'out_invoice' | 'in_invoice' | 'out_refund' | 'in_refund';
}

export interface Employee {
    id: number;
    name: string;
    job_title: string;
    department_id: number;
    work_email: string;
    work_phone: string;
    image?: string;
    attendance_state: 'checked_in' | 'checked_out';
}

export interface Project {
    id: number;
    name: string;
    user_id: number;
    partner_id?: number;
    date_start: string;
    date?: string;
    task_count: number;
    progress: number;
}

export interface Task {
    id: number;
    name: string;
    project_id: number;
    user_id: number;
    stage_id: number;
    priority: '0' | '1' | '2' | '3';
    date_deadline?: string;
    description?: string;
}

export interface StockPicking {
    id: number;
    name: string;
    partner_id: number;
    scheduled_date: string;
    state: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancel';
    picking_type: 'incoming' | 'outgoing' | 'internal';
    location_id: number;
    location_dest_id: number;
}

export interface User {
    id: number;
    name: string;
    email: string;
    image?: string;
}

export interface Ticket {
    id: number;
    name: string;
    description?: string;
    partner_id: number;
    user_id: number;
    stage_id: number;
    priority: 'low' | 'medium' | 'high';
    create_date: string;
    close_date: string | null;
}

export interface Payslip {
    id: number;
    name: string;
    employee_id: number;
    date_from: string;
    date_to: string;
    basic_wage: number;
    net_wage: number;
    state: 'draft' | 'verify' | 'done' | 'cancel';
}

export interface Applicant {
    id: number;
    name: string;
    partner_name: string;
    email_from: string;
    job_id: number;
    stage_id: number;
    priority: '0' | '1' | '2' | '3';
}

export interface Policy {
    id: number;
    name: string;
    category: string;
    create_date: string;
    body: string;
}

export interface Appraisal {
    id: number;
    employee_id: number;
    manager_id: number;
    date_close: string;
    state: 'new' | 'pending' | 'done' | 'cancel';
    final_assessment?: string;
}

export interface Course {
    id: number;
    name: string;
    description: string;
    total_time: number;
    members_count: number;
}
