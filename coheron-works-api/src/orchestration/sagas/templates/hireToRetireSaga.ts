import mongoose from 'mongoose';
import { sagaOrchestrator } from '../../SagaOrchestrator.js';
import logger from '../../../shared/utils/logger.js';
import type { SagaDefinition } from '../../types.js';

const hireToRetireSaga: SagaDefinition = {
  name: 'hire-to-retire',
  description: 'Requisition -> Recruit -> Onboard -> Payroll -> Offboard',
  category: 'hr',
  triggerEvent: 'employee.onboarded',
  timeout_ms: 30 * 24 * 60 * 60 * 1000, // 30 days
  steps: [
    {
      name: 'setup-payroll',
      async execute(context, event) {
        const { employee_id, tenant_id } = context;
        logger.info({ employeeId: employee_id }, 'Hire-to-retire: setting up payroll');

        const db = mongoose.connection.db;
        const employee = await db?.collection('employees').findOne({
          _id: new mongoose.Types.ObjectId(employee_id),
        });

        if (!employee) return { payroll_setup: false };

        const salary = employee.salary || {};

        // Create default salary structure components
        const components = [
          { component_type: 'earning', component_name: 'Basic', amount: salary.basic || 0, calculation_type: 'fixed', is_active: true },
          { component_type: 'earning', component_name: 'HRA', amount: salary.hra || 0, calculation_type: 'fixed', is_active: true },
          { component_type: 'earning', component_name: 'Special Allowance', amount: salary.special_allowance || 0, calculation_type: 'fixed', is_active: true },
        ];

        const docs = components.map((c) => ({
          employee_id: new mongoose.Types.ObjectId(employee_id),
          ...c,
          created_at: new Date(),
          updated_at: new Date(),
        }));

        if (docs.length > 0) {
          await db?.collection('salarystructures').insertMany(docs);
        }

        // Update employee status to active if still in probation
        if (employee.status === 'probation') {
          await db?.collection('employees').updateOne(
            { _id: employee._id },
            { $set: { status: 'active', confirmation_date: new Date(), updated_at: new Date() } },
          );
        }

        return {
          payroll_setup: true,
          salary_components: components.length,
          gross: salary.gross || 0,
        };
      },
    },
    {
      name: 'manager-approval',
      type: 'approval',
      approval_roles: ['hr_manager', 'manager'],
      approval_timeout_action: 'escalate',
      async execute(context, event) {
        logger.info({ employeeId: context.employee_id }, 'Hire-to-retire: awaiting manager approval for onboarding');
        return { approval_requested: true };
      },
    },
    {
      name: 'assign-assets',
      async execute(context, event) {
        const { employee_id } = context;
        logger.info({ employeeId: employee_id }, 'Hire-to-retire: assigning company assets');

        const db = mongoose.connection.db;
        const employee = await db?.collection('employees').findOne({
          _id: new mongoose.Types.ObjectId(employee_id),
        });

        if (!employee) return { assets_assigned: false };

        // Create default asset assignment records
        const defaultAssets = ['Laptop', 'ID Card', 'Access Badge'];
        const assetDocs = defaultAssets.map((name) => ({
          employee_id: new mongoose.Types.ObjectId(employee_id),
          asset_name: name,
          assigned_date: new Date(),
          status: 'assigned',
          created_at: new Date(),
          updated_at: new Date(),
        }));

        // Update employee's assets array
        await db?.collection('employees').updateOne(
          { _id: employee._id },
          {
            $push: {
              assets: { $each: assetDocs.map((a) => ({ name: a.asset_name, assigned_date: a.assigned_date, status: 'assigned' })) },
            } as any,
            $set: { updated_at: new Date() },
          },
        );

        return { assets_assigned: true, asset_count: defaultAssets.length };
      },
      async compensate(context) {
        const { employee_id } = context;
        logger.info({ employeeId: employee_id }, 'Hire-to-retire: reclaiming company assets');
        const db = mongoose.connection.db;
        await db?.collection('employees').updateOne(
          { _id: new mongoose.Types.ObjectId(employee_id) },
          { $set: { assets: [], updated_at: new Date() } },
        );
      },
    },
    {
      name: 'create-access',
      async execute(context, event) {
        const { employee_id } = context;
        logger.info({ employeeId: employee_id }, 'Hire-to-retire: creating system access');

        const db = mongoose.connection.db;
        const employee = await db?.collection('employees').findOne({
          _id: new mongoose.Types.ObjectId(employee_id),
        });

        if (!employee?.work_email) return { access_created: false, reason: 'no work email' };

        // Check if a user account already exists
        const existingUser = await db?.collection('users').findOne({ email: employee.work_email });
        if (existingUser) {
          return { access_created: true, user_id: existingUser._id.toString(), existing: true };
        }

        // Create a user account linked to the employee
        const result = await db?.collection('users').insertOne({
          name: employee.name,
          email: employee.work_email,
          role: 'user',
          employee_id: employee._id,
          tenant_id: employee.tenant_id,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });

        return {
          access_created: true,
          user_id: result?.insertedId?.toString(),
          existing: false,
        };
      },
      async compensate(context) {
        const { employee_id } = context;
        logger.info({ employeeId: employee_id }, 'Hire-to-retire: disabling system access');
        const db = mongoose.connection.db;
        const employee = await db?.collection('employees').findOne({
          _id: new mongoose.Types.ObjectId(employee_id),
        });
        if (employee?.work_email) {
          await db?.collection('users').updateOne(
            { email: employee.work_email, employee_id: employee._id },
            { $set: { is_active: false, updated_at: new Date() } },
          );
        }
      },
    },
    {
      name: 'notify-team',
      async execute(context, event) {
        const { employee_id } = context;
        logger.info({ employeeId: employee_id }, 'Hire-to-retire: notifying team');

        const db = mongoose.connection.db;
        const employee = await db?.collection('employees').findOne({
          _id: new mongoose.Types.ObjectId(employee_id),
        });

        if (!employee) return { team_notified: false };

        // Create notification records for the department
        const departmentMembers = employee.department_id
          ? await db?.collection('employees').find({
              department_id: employee.department_id,
              _id: { $ne: employee._id },
              status: 'active',
            }).toArray() || []
          : [];

        const notifications = departmentMembers.map((member: any) => ({
          recipient_id: member._id,
          type: 'new_team_member',
          title: `New team member: ${employee.name}`,
          message: `${employee.name} has joined as ${employee.job_title || 'a new member'}`,
          read: false,
          created_at: new Date(),
        }));

        if (notifications.length > 0) {
          await db?.collection('notifications').insertMany(notifications);
        }

        return { team_notified: true, notified_count: notifications.length };
      },
    },
  ],
};

export function registerHireToRetireSaga(): void {
  sagaOrchestrator.registerSaga(hireToRetireSaga);
}
