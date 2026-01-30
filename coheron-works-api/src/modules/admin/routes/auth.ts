import express from 'express';
import User from '../../../shared/models/User.js';
import { TwoFactorAuth } from '../../../shared/models/TwoFactorAuth.js';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getUserRoles, getUserPermissions } from '../../../shared/utils/permissions.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { generateOTP, sendEmailOTP, sendSmsOTP } from '../services/twoFactorService.js';

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: JWT token and user info
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const roles = await getUserRoles(user._id.toString());
  const permissions = await getUserPermissions(user._id.toString());

  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  // Check if 2FA is enabled
  if (user.two_factor_enabled) {
    const tfa = await TwoFactorAuth.findOne({ user_id: user._id, is_verified: true });
    if (tfa) {
      // Send OTP if sms/email method
      if (tfa.method === 'email') {
        const { code, expiresAt } = generateOTP();
        tfa.set({ otp_code: code, otp_expires_at: expiresAt });
        await tfa.save();
        await sendEmailOTP(user.email, code);
      } else if (tfa.method === 'sms' && tfa.phone_number) {
        const { code, expiresAt } = generateOTP();
        tfa.set({ otp_code: code, otp_expires_at: expiresAt });
        await tfa.save();
        await sendSmsOTP(tfa.phone_number, code);
      }

      // Issue 5-minute partial JWT
      const partialToken = jwt.sign(
        {
          userId: user._id.toString(),
          uid: user.uid,
          email: user.email,
          tenant_id: user.tenant_id?.toString(),
          twoFactorPending: true,
        },
        jwtSecret,
        { expiresIn: '5m' } as SignOptions
      );

      return res.json({
        requiresTwoFactor: true,
        method: tfa.method,
        partialToken,
      });
    }
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      uid: user.uid,
      email: user.email,
      tenant_id: user.tenant_id?.toString(),
      roles,
      permissions
    },
    jwtSecret,
    { expiresIn } as SignOptions
  );

  // Update last login
  await User.findByIdAndUpdate(user._id, { last_login_at: new Date() });

  res.json({
    token,
    user: {
      id: user._id,
      uid: user.uid,
      name: user.name,
      email: user.email,
      tenant_id: user.tenant_id,
      roles,
      permissions
    },
  });
}));

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: User created with JWT token
 *       400:
 *         description: Duplicate email
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, tenant_id } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  // Get next UID
  const lastUser = await User.findOne().sort({ uid: -1 });
  const nextUid = (lastUser?.uid || 0) + 1;

  const user = await User.create({
    uid: nextUid,
    name,
    email,
    password_hash: hashedPassword,
    tenant_id: tenant_id || undefined,
  });

  const roles = await getUserRoles(user._id.toString());
  const permissions = await getUserPermissions(user._id.toString());

  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  const token = jwt.sign(
    {
      userId: user._id.toString(),
      uid: user.uid,
      email: user.email,
      tenant_id: user.tenant_id?.toString(),
      roles,
      permissions
    },
    jwtSecret,
    { expiresIn } as SignOptions
  );

  res.status(201).json({
    token,
    user: {
      id: user._id,
      uid: user.uid,
      name: user.name,
      email: user.email,
      tenant_id: user.tenant_id,
      roles,
      permissions
    },
  });
}));

export default router;
