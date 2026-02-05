import express from 'express';
import { Course, CourseEnrollment } from '../../../models/Course.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get courses
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  const filter: any = {};

  if (is_active !== undefined) {
    filter.is_active = is_active === 'true';
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Course.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    Course
  );
  res.json(result);
}));

// Create course
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, description, total_time, category, instructor } = req.body;

  const course = await Course.create({
    name, description, total_time, category, instructor
  });

  res.status(201).json(course);
}));

// Get enrollments
router.get('/enrollments', authenticate, asyncHandler(async (req, res) => {
  const { employee_id, course_id } = req.query;
  const filter: any = {};

  if (employee_id) {
    filter.employee_id = employee_id;
  }
  if (course_id) {
    filter.course_id = course_id;
  }

  const enrollments = await CourseEnrollment.find(filter)
    .populate('employee_id', 'name')
    .populate('course_id', 'name')
    .sort({ created_at: -1 });

  const result = enrollments.map((e: any) => {
    const obj = e.toJSON();
    if (obj.employee_id && typeof obj.employee_id === 'object') {
      obj.employee_name = obj.employee_id.name;
      obj.employee_id = obj.employee_id._id;
    }
    if (obj.course_id && typeof obj.course_id === 'object') {
      obj.course_name = obj.course_id.name;
      obj.course_id = obj.course_id._id;
    }
    return obj;
  });

  res.json(result);
}));

export default router;
