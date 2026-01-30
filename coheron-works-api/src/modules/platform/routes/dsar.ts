import express from 'express';
import DataSubjectRequest from '../../../shared/models/DataSubjectRequest.js';
import { exportUserData } from '../../../shared/services/dataExportService.js';
import { eraseUserData } from '../../../shared/services/dataErasureService.js';

const router = express.Router();

// List all DSARs for tenant (admin only)
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const dsars = await DataSubjectRequest.find({ tenant_id: user.tenant_id });
    res.json(dsars);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch DSARs' });
  }
});

// Create DSAR
router.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const { requester_email, requester_name, request_type } = req.body;
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 30);
    const dsar = await DataSubjectRequest.create({
      tenant_id: user.tenant_id,
      requester_email,
      requester_name,
      request_type,
      due_date,
      created_by: user._id,
    });
    res.status(201).json(dsar);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create DSAR' });
  }
});

// Get single DSAR
router.get('/:id', async (req, res) => {
  try {
    const dsar = await DataSubjectRequest.findById(req.params.id);
    if (!dsar) return res.status(404).json({ error: 'DSAR not found' });
    res.json(dsar);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch DSAR' });
  }
});

// Assign DSAR to user
router.put('/:id/assign', async (req, res) => {
  try {
    const { assigned_to } = req.body;
    const dsar = await DataSubjectRequest.findByIdAndUpdate(
      req.params.id,
      { assigned_to },
      { new: true }
    );
    if (!dsar) return res.status(404).json({ error: 'DSAR not found' });
    res.json(dsar);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign DSAR' });
  }
});

// Update DSAR status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    const update: any = { status };
    if (rejection_reason) update.rejection_reason = rejection_reason;
    const dsar = await DataSubjectRequest.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );
    if (!dsar) return res.status(404).json({ error: 'DSAR not found' });
    res.json(dsar);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update DSAR status' });
  }
});

// Execute DSAR
router.post('/:id/execute', async (req, res) => {
  try {
    const dsar = await DataSubjectRequest.findById(req.params.id);
    if (!dsar) return res.status(404).json({ error: 'DSAR not found' });

    let result;
    if (dsar.request_type === 'access' || dsar.request_type === 'portability') {
      result = await exportUserData(dsar.requester_email, dsar.tenant_id.toString());
    } else if (dsar.request_type === 'erasure') {
      const user = (req as any).user;
      result = await eraseUserData(dsar.requester_email, dsar.tenant_id.toString(), user._id?.toString() || user.id);
    }

    dsar.status = 'completed';
    dsar.completed_at = new Date();
    await dsar.save();

    res.json({ dsar, result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute DSAR' });
  }
});

export default router;
