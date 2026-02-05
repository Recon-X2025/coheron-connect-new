import express from 'express';
import { LearningPath } from '../models/LearningPath.js';
import { Certification } from '../models/Certification.js';
import { CertificationRecord } from '../models/CertificationRecord.js';
import { LearningEnrollment } from '../models/LearningEnrollment.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();
router.use(authenticate);

// ============================================
// LEARNING PATHS
// ============================================

router.get('/paths', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  if (req.query.published === 'true') filter.is_published = true;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  const paths = await LearningPath.find(filter).sort({ created_at: -1 }).lean();
  res.json(paths);
}));

router.get('/paths/:id', asyncHandler(async (req, res) => {
  const path = await LearningPath.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!path) return res.status(404).json({ error: 'Learning path not found' });
  res.json(path);
}));

router.post('/paths', asyncHandler(async (req, res) => {
  const path = await LearningPath.create({
    ...req.body,
    tenant_id: req.user?.tenant_id,
    created_by: req.user?.userId,
  });
  res.status(201).json(path);
}));

router.put('/paths/:id', asyncHandler(async (req, res) => {
  const path = await LearningPath.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    req.body, { new: true }
  );
  if (!path) return res.status(404).json({ error: 'Learning path not found' });
  res.json(path);
}));

router.delete('/paths/:id', asyncHandler(async (req, res) => {
  const path = await LearningPath.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!path) return res.status(404).json({ error: 'Learning path not found' });
  res.json({ message: 'Learning path deleted' });
}));

router.post('/paths/:id/publish', asyncHandler(async (req, res) => {
  const path = await LearningPath.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { is_published: true },
    { new: true }
  );
  if (!path) return res.status(404).json({ error: 'Learning path not found' });
  res.json(path);
}));

router.post('/paths/:id/enroll', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { employee_ids } = req.body; // array of user IDs
  const path = await LearningPath.findOne({ _id: req.params.id, tenant_id });
  if (!path) return res.status(404).json({ error: 'Learning path not found' });

  const enrollments = [];
  for (const eid of (employee_ids || [])) {
    const existing = await LearningEnrollment.findOne({ path_id: req.params.id, employee_id: eid, tenant_id });
    if (!existing) {
      const enrollment = await LearningEnrollment.create({
        tenant_id,
        path_id: req.params.id,
        employee_id: eid,
        assigned_by: req.user?.userId,
        started_at: new Date(),
      });
      enrollments.push(enrollment);
    }
  }
  await LearningPath.findByIdAndUpdate(req.params.id, { $inc: { enrollment_count: enrollments.length } });
  res.status(201).json({ enrolled: enrollments.length, enrollments });
}));

// ============================================
// CERTIFICATIONS
// ============================================

router.get('/certifications', asyncHandler(async (req, res) => {
  const filter: any = { tenant_id: req.user?.tenant_id };
  if (req.query.status) filter.status = req.query.status;
  const certs = await Certification.find(filter).sort({ created_at: -1 }).lean();
  res.json(certs);
}));

router.get('/certifications/:id', asyncHandler(async (req, res) => {
  const cert = await Certification.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  res.json(cert);
}));

router.post('/certifications', asyncHandler(async (req, res) => {
  const cert = await Certification.create({ ...req.body, tenant_id: req.user?.tenant_id });
  res.status(201).json(cert);
}));

router.put('/certifications/:id', asyncHandler(async (req, res) => {
  const cert = await Certification.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    req.body, { new: true }
  );
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  res.json(cert);
}));

router.delete('/certifications/:id', asyncHandler(async (req, res) => {
  const cert = await Certification.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  res.json({ message: 'Certification deleted' });
}));

router.get('/certifications/:id/holders', asyncHandler(async (req, res) => {
  const records = await CertificationRecord.find({
    certification_id: req.params.id,
    tenant_id: req.user?.tenant_id,
    status: 'earned',
  }).populate('employee_id', 'name email').lean();
  res.json(records);
}));

// ============================================
// CERTIFICATION RECORDS
// ============================================

router.get('/certification-records', asyncHandler(async (req, res) => {
  const filter: any = { tenant_id: req.user?.tenant_id };
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  if (req.query.certification_id) filter.certification_id = req.query.certification_id;
  if (req.query.status) filter.status = req.query.status;
  const records = await CertificationRecord.find(filter)
    .populate('certification_id', 'name issuing_authority')
    .populate('employee_id', 'name email')
    .sort({ created_at: -1 }).lean();
  res.json(records);
}));

router.post('/certification-records', asyncHandler(async (req, res) => {
  const record = await CertificationRecord.create({ ...req.body, tenant_id: req.user?.tenant_id });
  res.status(201).json(record);
}));

router.put('/certification-records/:id', asyncHandler(async (req, res) => {
  const record = await CertificationRecord.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    req.body, { new: true }
  );
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json(record);
}));

router.get('/expiring-certifications', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const daysAhead = parseInt(req.query.days as string) || 30;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const expiring = await CertificationRecord.find({
    tenant_id,
    status: 'earned',
    expires_at: { $lte: futureDate, $gte: new Date() },
  })
    .populate('certification_id', 'name issuing_authority')
    .populate('employee_id', 'name email')
    .sort({ expires_at: 1 })
    .lean();
  res.json(expiring);
}));

// ============================================
// ENROLLMENTS
// ============================================

router.get('/enrollments', asyncHandler(async (req, res) => {
  const filter: any = { tenant_id: req.user?.tenant_id };
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  if (req.query.path_id) filter.path_id = req.query.path_id;
  if (req.query.status) filter.status = req.query.status;
  const enrollments = await LearningEnrollment.find(filter)
    .populate('path_id', 'name category difficulty estimated_hours')
    .populate('employee_id', 'name email')
    .sort({ created_at: -1 }).lean();
  res.json(enrollments);
}));

router.put('/enrollments/:id/progress', asyncHandler(async (req, res) => {
  const { progress_pct, course_progress } = req.body;
  const update: any = {};
  if (progress_pct !== undefined) update.progress_pct = progress_pct;
  if (course_progress) update.course_progress = course_progress;
  if (progress_pct >= 100) {
    update.status = 'completed';
    update.completed_at = new Date();
  } else if (progress_pct > 0) {
    update.status = 'in_progress';
  }
  const enrollment = await LearningEnrollment.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    update, { new: true }
  );
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  res.json(enrollment);
}));

// ============================================
// ANALYTICS
// ============================================

router.get('/skill-gap-analysis', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const certs = await Certification.find({ tenant_id, status: 'active' }).lean();
  const records = await CertificationRecord.find({ tenant_id, status: 'earned' }).lean();

  const earnedMap: Record<string, string[]> = {};
  for (const r of records) {
    const eid = (r as any).employee_id.toString();
    if (!earnedMap[eid]) earnedMap[eid] = [];
    earnedMap[eid].push((r as any).certification_id.toString());
  }

  const paths = await LearningPath.find({ tenant_id, is_published: true }).lean();
  const allSkills = [...new Set(paths.flatMap((p: any) => p.skills || []))];

  res.json({
    total_certifications: certs.length,
    total_certified_employees: Object.keys(earnedMap).length,
    available_skills: allSkills,
    certification_coverage: certs.map((c: any) => ({
      certification: c.name,
      holders: records.filter((r: any) => r.certification_id.toString() === c._id.toString()).length,
    })),
  });
}));

router.get('/leaderboard', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const completedEnrollments = await LearningEnrollment.find({ tenant_id, status: 'completed' })
    .populate('employee_id', 'name email')
    .lean();

  const leaderMap: Record<string, { name: string; email: string; completed: number }> = {};
  for (const e of completedEnrollments) {
    const emp = (e as any).employee_id;
    if (!emp) continue;
    const id = emp._id?.toString() || emp.toString();
    if (!leaderMap[id]) leaderMap[id] = { name: emp.name || 'Unknown', email: emp.email || '', completed: 0 };
    leaderMap[id].completed++;
  }

  const leaderboard = Object.entries(leaderMap)
    .map(([id, data]) => ({ employee_id: id, ...data }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 20);

  res.json(leaderboard);
}));

router.get('/compliance-training-status', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const mandatoryPaths = await LearningPath.find({ tenant_id, is_published: true, category: 'compliance' }).lean();
  const enrollments = await LearningEnrollment.find({
    tenant_id,
    path_id: { $in: mandatoryPaths.map((p: any) => p._id) },
  }).populate('employee_id', 'name email').lean();

  const status = mandatoryPaths.map((path: any) => {
    const pathEnrollments = enrollments.filter((e: any) => e.path_id?.toString() === path._id.toString());
    return {
      path_name: path.name,
      path_id: path._id,
      total_enrolled: pathEnrollments.length,
      completed: pathEnrollments.filter((e: any) => e.status === 'completed').length,
      in_progress: pathEnrollments.filter((e: any) => e.status === 'in_progress').length,
      not_started: pathEnrollments.filter((e: any) => e.status === 'enrolled').length,
      completion_rate: pathEnrollments.length > 0
        ? Math.round((pathEnrollments.filter((e: any) => e.status === 'completed').length / pathEnrollments.length) * 100)
        : 0,
    };
  });

  res.json(status);
}));

export default router;
