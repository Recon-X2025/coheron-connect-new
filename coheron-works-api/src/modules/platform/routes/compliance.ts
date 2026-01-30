import express from 'express';
import DataBreach from '../../../shared/models/DataBreach.js';
import ProcessingActivity from '../../../shared/models/ProcessingActivity.js';
import RetentionPolicy from '../../../shared/models/RetentionPolicy.js';

const router = express.Router();

// --- Data Breaches ---

router.get('/breaches', async (req, res) => {
  try {
    const user = (req as any).user;
    const breaches = await DataBreach.find({ tenant_id: user.tenant_id });
    res.json(breaches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch breaches' });
  }
});

router.post('/breaches', async (req, res) => {
  try {
    const user = (req as any).user;
    const breach = await DataBreach.create({ ...req.body, tenant_id: user.tenant_id, reported_by: user._id });
    res.status(201).json(breach);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create breach' });
  }
});

router.put('/breaches/:id', async (req, res) => {
  try {
    const breach = await DataBreach.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!breach) return res.status(404).json({ error: 'Breach not found' });
    res.json(breach);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update breach' });
  }
});

// --- Processing Activities (ROPA) ---

router.get('/processing-activities', async (req, res) => {
  try {
    const user = (req as any).user;
    const activities = await ProcessingActivity.find({ tenant_id: user.tenant_id });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch processing activities' });
  }
});

router.post('/processing-activities', async (req, res) => {
  try {
    const user = (req as any).user;
    const activity = await ProcessingActivity.create({ ...req.body, tenant_id: user.tenant_id });
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create processing activity' });
  }
});

router.put('/processing-activities/:id', async (req, res) => {
  try {
    const activity = await ProcessingActivity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!activity) return res.status(404).json({ error: 'Processing activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update processing activity' });
  }
});

router.delete('/processing-activities/:id', async (req, res) => {
  try {
    const activity = await ProcessingActivity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Processing activity not found' });
    res.json({ message: 'Processing activity deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete processing activity' });
  }
});

// --- Retention Policies ---

router.get('/retention-policies', async (req, res) => {
  try {
    const user = (req as any).user;
    const policies = await RetentionPolicy.find({ tenant_id: user.tenant_id });
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch retention policies' });
  }
});

router.post('/retention-policies', async (req, res) => {
  try {
    const user = (req as any).user;
    const policy = await RetentionPolicy.create({ ...req.body, tenant_id: user.tenant_id });
    res.status(201).json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create retention policy' });
  }
});

router.put('/retention-policies/:id', async (req, res) => {
  try {
    const policy = await RetentionPolicy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!policy) return res.status(404).json({ error: 'Retention policy not found' });
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update retention policy' });
  }
});

export default router;
