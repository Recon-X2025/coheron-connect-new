import express from 'express';
import { JobPosting } from '../models/JobPosting.js';
import { JobApplication } from '../models/JobApplication.js';
import { InterviewSchedule } from '../models/InterviewSchedule.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// JOB POSTINGS
// ============================================

router.get('/jobs', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { department: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  const jobs = await JobPosting.find(filter).sort({ created_at: -1 }).lean();
  res.json(jobs);
}));

router.get('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await JobPosting.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!job) return res.status(404).json({ error: 'Job posting not found' });
  res.json(job);
}));

router.post('/jobs', asyncHandler(async (req, res) => {
  const job = await JobPosting.create({
    ...req.body,
    tenant_id: req.user?.tenant_id,
    created_by: req.user?.userId,
    pipeline_stages: req.body.pipeline_stages || [
      { name: 'Applied', order: 0 },
      { name: 'Screening', order: 1 },
      { name: 'Interview', order: 2 },
      { name: 'Assessment', order: 3 },
      { name: 'Offer', order: 4 },
      { name: 'Hired', order: 5 },
    ],
  });
  res.status(201).json(job);
}));

router.put('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await JobPosting.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    req.body, { new: true }
  );
  if (!job) return res.status(404).json({ error: 'Job posting not found' });
  res.json(job);
}));

router.delete('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await JobPosting.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!job) return res.status(404).json({ error: 'Job posting not found' });
  res.json({ message: 'Job posting deleted' });
}));

router.post('/jobs/:id/publish', asyncHandler(async (req, res) => {
  const job = await JobPosting.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { status: 'published', published_at: new Date() },
    { new: true }
  );
  if (!job) return res.status(404).json({ error: 'Job posting not found' });
  res.json(job);
}));

router.post('/jobs/:id/close', asyncHandler(async (req, res) => {
  const job = await JobPosting.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { status: 'closed' },
    { new: true }
  );
  if (!job) return res.status(404).json({ error: 'Job posting not found' });
  res.json(job);
}));

// ============================================
// APPLICATIONS
// ============================================

router.get('/applications', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.job_id) filter.job_id = req.query.job_id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  if (req.query.stage) filter.current_stage = req.query.stage;
  if (req.query.search) {
    filter.$or = [
      { candidate_name: { $regex: req.query.search, $options: 'i' } },
      { candidate_email: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  const apps = await JobApplication.find(filter)
    .populate('job_id', 'title department')
    .sort({ created_at: -1 })
    .lean();
  res.json(apps);
}));

router.get('/applications/:id', asyncHandler(async (req, res) => {
  const app = await JobApplication.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id })
    .populate('job_id', 'title department pipeline_stages')
    .populate('interview_scores.interviewer_id', 'name email')
    .lean();
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json(app);
}));

router.post('/applications', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const app = await JobApplication.create({
    ...req.body,
    tenant_id,
    current_stage: req.body.current_stage || 'Applied',
    stage_history: [{ stage: req.body.current_stage || 'Applied', entered_at: new Date() }],
  });
  await JobPosting.findByIdAndUpdate(req.body.job_id, { $inc: { application_count: 1 } });
  res.status(201).json(app);
}));

router.put('/applications/:id', asyncHandler(async (req, res) => {
  const app = await JobApplication.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    req.body, { new: true }
  );
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json(app);
}));

router.delete('/applications/:id', asyncHandler(async (req, res) => {
  const app = await JobApplication.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json({ message: 'Application deleted' });
}));

router.post('/applications/:id/move-stage', asyncHandler(async (req, res) => {
  const { stage } = req.body;
  const app = await JobApplication.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!app) return res.status(404).json({ error: 'Application not found' });

  // Close current stage
  const currentHistory = app.stage_history.find(h => h.stage === app.current_stage && !h.exited_at);
  if (currentHistory) currentHistory.exited_at = new Date();

  app.current_stage = stage;
  app.stage_history.push({ stage, entered_at: new Date(), moved_by: req.user?.userId as any });
  await app.save();
  res.json(app);
}));

router.post('/applications/:id/rate', asyncHandler(async (req, res) => {
  const { rating } = req.body;
  const app = await JobApplication.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { rating },
    { new: true }
  );
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json(app);
}));

router.post('/applications/:id/reject', asyncHandler(async (req, res) => {
  const { rejection_reason } = req.body;
  const app = await JobApplication.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { status: 'rejected', rejection_reason: rejection_reason || '' },
    { new: true }
  );
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json(app);
}));

router.post('/applications/:id/make-offer', asyncHandler(async (req, res) => {
  const { salary, start_date, benefits } = req.body;
  const app = await JobApplication.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    {
      offer: { salary, start_date, benefits, status: 'pending', sent_at: new Date() },
      current_stage: 'Offer',
    },
    { new: true }
  );
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json(app);
}));

// ============================================
// INTERVIEWS
// ============================================

router.get('/interviews', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.application_id) filter.application_id = req.query.application_id;
  if (req.query.job_id) filter.job_id = req.query.job_id;
  if (req.query.status) filter.status = req.query.status;
  const interviews = await InterviewSchedule.find(filter)
    .populate('application_id', 'candidate_name candidate_email')
    .populate('interviewers.user_id', 'name email')
    .sort({ scheduled_at: 1 })
    .lean();
  res.json(interviews);
}));

router.get('/interviews/:id', asyncHandler(async (req, res) => {
  const interview = await InterviewSchedule.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id })
    .populate('application_id', 'candidate_name candidate_email')
    .populate('interviewers.user_id', 'name email')
    .lean();
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  res.json(interview);
}));

router.post('/interviews', asyncHandler(async (req, res) => {
  const interview = await InterviewSchedule.create({
    ...req.body,
    tenant_id: req.user?.tenant_id,
  });
  res.status(201).json(interview);
}));

router.put('/interviews/:id', asyncHandler(async (req, res) => {
  const interview = await InterviewSchedule.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    req.body, { new: true }
  );
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  res.json(interview);
}));

router.delete('/interviews/:id', asyncHandler(async (req, res) => {
  const interview = await InterviewSchedule.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  res.json({ message: 'Interview deleted' });
}));

router.post('/interviews/:id/complete', asyncHandler(async (req, res) => {
  const interview = await InterviewSchedule.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { status: 'completed' },
    { new: true }
  );
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  res.json(interview);
}));

// ============================================
// PIPELINE & ANALYTICS
// ============================================

router.get('/pipeline/:jobId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const job = await JobPosting.findOne({ _id: req.params.jobId, tenant_id }).lean();
  if (!job) return res.status(404).json({ error: 'Job posting not found' });

  const applications = await JobApplication.find({ job_id: req.params.jobId, tenant_id, status: 'active' })
    .sort({ created_at: -1 }).lean();

  const stages = (job.pipeline_stages || []).sort((a: any, b: any) => a.order - b.order);
  const pipeline = stages.map((stage: any) => ({
    name: stage.name,
    order: stage.order,
    applications: applications.filter((a: any) => a.current_stage === stage.name),
    count: applications.filter((a: any) => a.current_stage === stage.name).length,
  }));

  res.json({ job, pipeline });
}));

router.get('/analytics', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;

  const [allApps, hiredApps, jobs] = await Promise.all([
    JobApplication.find({ tenant_id }).lean(),
    JobApplication.find({ tenant_id, status: 'hired' }).lean(),
    JobPosting.find({ tenant_id }).lean(),
  ]);

  // Source effectiveness
  const sourceCounts: Record<string, { total: number; hired: number }> = {};
  for (const app of allApps) {
    const s = (app as any).source || 'other';
    if (!sourceCounts[s]) sourceCounts[s] = { total: 0, hired: 0 };
    sourceCounts[s].total++;
    if ((app as any).status === 'hired') sourceCounts[s].hired++;
  }

  // Time to hire (avg days from created_at to last stage_history entry for hired)
  let totalDays = 0;
  for (const app of hiredApps) {
    const a = app as any;
    if (a.stage_history?.length > 0) {
      const start = new Date(a.created_at).getTime();
      const end = new Date(a.stage_history[a.stage_history.length - 1].entered_at).getTime();
      totalDays += (end - start) / (1000 * 60 * 60 * 24);
    }
  }
  const avgTimeToHire = hiredApps.length > 0 ? Math.round(totalDays / hiredApps.length) : 0;

  // Pipeline conversion
  const stageNames = ['Applied', 'Screening', 'Interview', 'Assessment', 'Offer', 'Hired'];
  const conversionRates = stageNames.map(stage => ({
    stage,
    count: allApps.filter((a: any) => {
      return a.current_stage === stage || a.stage_history?.some((h: any) => h.stage === stage);
    }).length,
  }));

  res.json({
    total_applications: allApps.length,
    total_hired: hiredApps.length,
    total_jobs: jobs.length,
    active_jobs: jobs.filter((j: any) => j.status === 'published').length,
    avg_time_to_hire_days: avgTimeToHire,
    source_effectiveness: sourceCounts,
    pipeline_conversion: conversionRates,
  });
}));

router.get('/talent-pool', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const pool = await JobApplication.find({
    tenant_id,
    status: 'rejected',
    rating: { $gte: 3 },
  })
    .populate('job_id', 'title department')
    .sort({ rating: -1 })
    .lean();
  res.json(pool);
}));

export default router;
