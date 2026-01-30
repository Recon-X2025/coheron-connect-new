import express from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { TwoFactorAuth } from '../../../shared/models/TwoFactorAuth.js';
import User from '../../../shared/models/User.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  generateOTP,
  sendEmailOTP,
  sendSmsOTP,
  generateBackupCodes,
  verifyBackupCode,
} from '../services/twoFactorService.js';
import { getUserRoles, getUserPermissions } from '../../../shared/utils/permissions.js';

const router = express.Router();

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'secret';
}

function requireAuth(req: express.Request, res: express.Response): any | null {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'No token provided' }); return null; }
  try {
    return jwt.verify(token, getJwtSecret()) as any;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

// POST /setup — initiate 2FA setup
router.post('/setup', asyncHandler(async (req, res) => {
  const decoded = requireAuth(req, res);
  if (!decoded) return;

  const { method } = req.body; // 'totp' | 'sms' | 'email'
  if (!method || !['totp', 'sms', 'email'].includes(method)) {
    return res.status(400).json({ error: 'Invalid method. Must be totp, sms, or email.' });
  }

  const user = await User.findById(decoded.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Remove existing unverified setup
  await TwoFactorAuth.deleteOne({ user_id: user._id, is_verified: false });

  if (method === 'totp') {
    const { secret, otpauth_url } = generateTOTPSecret(user.email);
    const qrCode = await generateQRCode(otpauth_url);

    await TwoFactorAuth.create({
      user_id: user._id,
      method: 'totp',
      secret,
      is_verified: false,
    });

    return res.json({ method: 'totp', qr_code: qrCode, secret });
  }

  // SMS or Email OTP
  const { code, expiresAt } = generateOTP();

  await TwoFactorAuth.create({
    user_id: user._id,
    method,
    otp_code: code,
    otp_expires_at: expiresAt,
    is_verified: false,
    phone_number: method === 'sms' ? req.body.phone_number : undefined,
    email: method === 'email' ? user.email : undefined,
  });

  if (method === 'email') {
    await sendEmailOTP(user.email, code);
  } else {
    await sendSmsOTP(req.body.phone_number, code);
  }

  return res.json({ method, message: `OTP sent via ${method}` });
}));

// POST /verify-setup — confirm setup with code, enable 2FA
router.post('/verify-setup', asyncHandler(async (req, res) => {
  const decoded = requireAuth(req, res);
  if (!decoded) return;

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const tfa = await TwoFactorAuth.findOne({ user_id: decoded.userId, is_verified: false });
  if (!tfa) return res.status(404).json({ error: 'No pending 2FA setup found' });

  let valid = false;

  if (tfa.method === 'totp') {
    valid = verifyTOTP(tfa.secret!, code);
  } else {
    // OTP-based
    valid = (tfa as any).otp_code === code && new Date() < new Date((tfa as any).otp_expires_at);
  }

  if (!valid) return res.status(400).json({ error: 'Invalid or expired code' });

  const { plain, hashed } = await generateBackupCodes();

  tfa.is_verified = true;
  tfa.verified_at = new Date();
  tfa.backup_codes = hashed as any;
  await tfa.save();

  await User.findByIdAndUpdate(decoded.userId, {
    two_factor_enabled: true,
    two_factor_method: tfa.method,
  });

  return res.json({ enabled: true, backup_codes: plain });
}));

// POST /verify — verify 2FA during login (partial JWT)
router.post('/verify', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtSecret()) as any;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (!decoded.twoFactorPending) {
    return res.status(400).json({ error: 'This token is not a 2FA pending token' });
  }

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const tfa = await TwoFactorAuth.findOne({ user_id: decoded.userId, is_verified: true });
  if (!tfa) return res.status(404).json({ error: '2FA not configured' });

  let valid = false;

  if (tfa.method === 'totp') {
    valid = verifyTOTP(tfa.secret!, code);
  } else {
    valid = (tfa as any).otp_code === code && new Date() < new Date((tfa as any).otp_expires_at);
  }

  if (!valid) return res.status(400).json({ error: 'Invalid or expired code' });

  tfa.last_used_at = new Date();
  await tfa.save();

  // Issue full JWT
  const roles = await getUserRoles(decoded.userId);
  const permissions = await getUserPermissions(decoded.userId);
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  const fullToken = jwt.sign(
    {
      userId: decoded.userId,
      uid: decoded.uid,
      email: decoded.email,
      tenant_id: decoded.tenant_id,
      roles,
      permissions,
    },
    getJwtSecret(),
    { expiresIn } as SignOptions
  );

  return res.json({ token: fullToken });
}));

// POST /backup — use backup code to complete login
router.post('/backup', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtSecret()) as any;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (!decoded.twoFactorPending) {
    return res.status(400).json({ error: 'This token is not a 2FA pending token' });
  }

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Backup code is required' });

  const tfa = await TwoFactorAuth.findOne({ user_id: decoded.userId, is_verified: true });
  if (!tfa) return res.status(404).json({ error: '2FA not configured' });

  const idx = await verifyBackupCode(code, tfa.backup_codes as any);
  if (idx === -1) return res.status(400).json({ error: 'Invalid backup code' });

  // Mark code as used
  tfa.backup_codes[idx].used = true;
  tfa.backup_codes[idx].used_at = new Date();
  tfa.last_used_at = new Date();
  await tfa.save();

  // Issue full JWT
  const roles = await getUserRoles(decoded.userId);
  const permissions = await getUserPermissions(decoded.userId);
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  const fullToken = jwt.sign(
    {
      userId: decoded.userId,
      uid: decoded.uid,
      email: decoded.email,
      tenant_id: decoded.tenant_id,
      roles,
      permissions,
    },
    getJwtSecret(),
    { expiresIn } as SignOptions
  );

  return res.json({ token: fullToken });
}));

// DELETE / — disable 2FA
router.delete('/', asyncHandler(async (req, res) => {
  const decoded = requireAuth(req, res);
  if (!decoded) return;

  await TwoFactorAuth.deleteOne({ user_id: decoded.userId });
  await User.findByIdAndUpdate(decoded.userId, {
    two_factor_enabled: false,
    two_factor_method: undefined,
  });

  return res.json({ disabled: true });
}));

export default router;
