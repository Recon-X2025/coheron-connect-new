import { z } from 'zod';

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const createEmployeeSchema = z.object({
  employee_id: z.string().optional(),
  name: z.string().min(1, 'Employee name is required'),
  work_email: z.string().email('Invalid email format'),
  work_phone: z.string().optional(),
  job_title: z.string().optional(),
  department_id: objectIdString.optional(),
  manager_id: objectIdString.optional(),
  hire_date: z.string().optional(),
  employment_type: z.string().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  work_email: z.string().email().optional(),
  work_phone: z.string().optional(),
  job_title: z.string().optional(),
  department_id: objectIdString.optional(),
  manager_id: objectIdString.optional(),
  hire_date: z.string().optional(),
  employment_type: z.string().optional(),
});

export const addDocumentSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  url: z.string().optional(),
  file_name: z.string().optional(),
});
