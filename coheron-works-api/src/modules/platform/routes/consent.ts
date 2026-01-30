import express from 'express';
import Consent from '../../../shared/models/Consent.js';

const router = express.Router();

// List all consents for current user
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const consents = await Consent.find({ user_id: user._id, tenant_id: user.tenant_id });
    res.json(consents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

// Grant consent
router.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const { purpose, version, source } = req.body;
    const consent = await Consent.create({
      user_id: user._id,
      tenant_id: user.tenant_id,
      purpose,
      version,
      source,
      granted: true,
      granted_at: new Date(),
      ip_address: req.ip,
    });
    res.status(201).json(consent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to grant consent' });
  }
});

// Withdraw consent
router.put('/:id/withdraw', async (req, res) => {
  try {
    const consent = await Consent.findByIdAndUpdate(
      req.params.id,
      { granted: false, withdrawn_at: new Date() },
      { new: true }
    );
    if (!consent) return res.status(404).json({ error: 'Consent not found' });
    res.json(consent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
});

// Check if user has active consent for a purpose
router.get('/check/:purpose', async (req, res) => {
  try {
    const user = (req as any).user;
    const consent = await Consent.findOne({
      user_id: user._id,
      tenant_id: user.tenant_id,
      purpose: req.params.purpose,
      granted: true,
    });
    res.json({ hasConsent: !!consent, consent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check consent' });
  }
});

export default router;
