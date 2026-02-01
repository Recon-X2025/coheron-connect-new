import express from 'express';
import { Employee } from '../../../models/Employee.js';
import { Department } from '../../../models/Department.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET / - Get full org chart tree
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const employees = await Employee.find({ tenant_id: tenantId, status: 'active' })
    .select('name employee_id designation department reports_to photo email')
    .populate('department', 'name')
    .lean();

  const map = new Map<string, any>();
  employees.forEach((e: any) => {
    map.set(e._id.toString(), { ...e, children: [] });
  });

  const roots: any[] = [];
  employees.forEach((e: any) => {
    const node = map.get(e._id.toString());
    if (e.reports_to && map.has(e.reports_to.toString())) {
      map.get(e.reports_to.toString()).children.push(node);
    } else {
      roots.push(node);
    }
  });

  res.json(roots);
}));

// GET /department/:id - Get org chart for specific department
router.get('/department/:id', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const employees = await Employee.find({ tenant_id: tenantId, department: req.params.id, status: 'active' })
    .select('name employee_id designation department reports_to photo email')
    .populate('department', 'name')
    .lean();

  const map = new Map<string, any>();
  employees.forEach((e: any) => {
    map.set(e._id.toString(), { ...e, children: [] });
  });

  const roots: any[] = [];
  employees.forEach((e: any) => {
    const node = map.get(e._id.toString());
    if (e.reports_to && map.has(e.reports_to.toString())) {
      map.get(e.reports_to.toString()).children.push(node);
    } else {
      roots.push(node);
    }
  });

  res.json(roots);
}));

export default router;
