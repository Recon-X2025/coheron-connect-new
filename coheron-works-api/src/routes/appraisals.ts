import express from 'express';
import { Appraisal } from '../models/Appraisal.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get appraisals
router.get('/', asyncHandler(async (req, res) => {
  const { employee_id, state } = req.query;
  const filter: any = {};

  if (employee_id) {
    filter.employee_id = employee_id;
  }
  if (state) {
    filter.state = state;
  }

  const appraisals = await Appraisal.find(filter)
    .populate('employee_id', 'name employee_id')
    .populate('manager_id', 'name')
    .sort({ created_at: -1 });

  const result = appraisals.map((a: any) => {
    const obj = a.toJSON();
    if (obj.employee_id && typeof obj.employee_id === 'object') {
      obj.employee_name = obj.employee_id.name;
      obj.emp_id = obj.employee_id.employee_id;
      obj.employee_id = obj.employee_id._id;
    }
    if (obj.manager_id && typeof obj.manager_id === 'object') {
      obj.manager_name = obj.manager_id.name;
      obj.manager_id = obj.manager_id._id;
    }
    return obj;
  });

  res.json(result);
}));

// Create appraisal
router.post('/', asyncHandler(async (req, res) => {
  const { employee_id, manager_id, appraisal_period, date_close } = req.body;

  const appraisal = await Appraisal.create({
    employee_id, manager_id, appraisal_period, date_close
  });

  res.status(201).json(appraisal);
}));

// Update appraisal
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { final_assessment, state } = req.body;

  const appraisal = await Appraisal.findByIdAndUpdate(
    id,
    { final_assessment, state },
    { new: true }
  );

  if (!appraisal) {
    return res.status(404).json({ error: 'Appraisal not found' });
  }
  res.json(appraisal);
}));

export default router;
