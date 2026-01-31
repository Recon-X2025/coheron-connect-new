import crypto from 'node:crypto';
import express from 'express';
import User from '../../../shared/models/User.js';
import { TwoFactorAuth } from '../../../shared/models/TwoFactorAuth.js';
import { TokenBlacklist } from '../../../shared/models/TokenBlacklist.js';
import { Session } from '../../../shared/models/Session.js';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getUserRoles, getUserPermissions } from '../../../shared/utils/permissions.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { generateOTP, sendEmailOTP, sendSmsOTP } from '../services/twoFactorService.js';
import {
  getJwtSecret,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  validatePassword,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  PASSWORD_HISTORY_COUNT,
} from '../../../shared/utils/auth-config.js';

const router = express.Router();

/**
 * Helper: generate access + refresh token pair
 */
function generateTokenPair(payload: Record<string, any>) {
  const jti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();

  const accessToken = jwt.sign(
    { ...payload, jti },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY } as SignOptions,
  );

  const refreshToken = jwt.sign(
    { ...payload, jti: refreshJti, type: 'refresh' },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY } as SignOptions,
  );

  return { accessToken, refreshToken, jti, refreshJti };
}

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
 *       423:
 *         description: Account locked
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check account lockout
  if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
    return res.status(423).json({
      error: 'Account is locked due to too many failed login attempts. Please try again later.',
      locked_until: user.account_locked_until,
    });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    // Increment failed attempts
    const attempts = (user.failed_login_attempts || 0) + 1;
    const updateFields: Record<string, any> = { failed_login_attempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      updateFields.account_locked_until = lockUntil;
    }
    await User.findByIdAndUpdate(user._id, updateFields);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Successful password check — reset failed attempts
  await User.findByIdAndUpdate(user._id, {
    failed_login_attempts: 0,
    account_locked_until: null,
    last_login_at: new Date(),
    last_login_ip: req.ip,
    last_login_user_agent: req.headers['user-agent'] || '',
  });

  const roles = await getUserRoles(user._id.toString());
  const permissions = await getUserPermissions(user._id.toString());

  const tokenPayload = {
    userId: user._id.toString(),
    uid: user.uid,
    email: user.email,
    tenant_id: user.tenant_id?.toString(),
    roles,
    permissions,
  };

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
        getJwtSecret(),
        { expiresIn: '5m' } as SignOptions
      );

      return res.json({
        requiresTwoFactor: true,
        method: tfa.method,
        partialToken,
      });
    }
  }

  const { accessToken, refreshToken, jti } = generateTokenPair(tokenPayload);

  // Create session record (best-effort — don't block login)
  try {
    if (user.tenant_id) {
      await Session.create({
        user_id: user._id,
        tenant_id: user.tenant_id,
        jti,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        is_active: true,
      });
    }
  } catch (_) { /* session tracking is non-critical */ }

  res.json({
    token: accessToken,
    refresh_token: refreshToken,
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
 *         description: Duplicate email or invalid password
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, tenant_id } = req.body;

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: 'Password does not meet requirements', errors: passwordValidation.errors });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Get next UID
  const lastUser = await User.findOne().sort({ uid: -1 });
  const nextUid = (lastUser?.uid || 0) + 1;

  const user = await User.create({
    uid: nextUid,
    name,
    email,
    password_hash: hashedPassword,
    password_history: [hashedPassword],
    password_changed_at: new Date(),
    tenant_id: tenant_id || undefined,
  });

  const roles = await getUserRoles(user._id.toString());
  const permissions = await getUserPermissions(user._id.toString());

  const tokenPayload = {
    userId: user._id.toString(),
    uid: user.uid,
    email: user.email,
    tenant_id: user.tenant_id?.toString(),
    roles,
    permissions,
  };

  const { accessToken, refreshToken, jti } = generateTokenPair(tokenPayload);

  // Create session record (best-effort)
  try {
    if (user.tenant_id) {
      await Session.create({
        user_id: user._id,
        tenant_id: user.tenant_id,
        jti,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        is_active: true,
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(201).json({
    token: accessToken,
    refresh_token: refreshToken,
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
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200:
 *         description: New token pair
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(refresh_token, getJwtSecret());
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  if (decoded.type !== 'refresh') {
    return res.status(401).json({ error: 'Token is not a refresh token' });
  }

  // Check if blacklisted
  const blacklisted = await TokenBlacklist.findOne({ jti: decoded.jti });
  if (blacklisted) {
    return res.status(401).json({ error: 'Refresh token has been revoked' });
  }

  // Blacklist old refresh token
  await TokenBlacklist.create({
    jti: decoded.jti,
    user_id: decoded.userId,
    reason: 'refresh_rotation',
    expires_at: new Date(decoded.exp * 1000),
  });

  // Build new payload (strip jwt internal fields)
  const { iat, exp, jti: _oldJti, type: _type, ...payload } = decoded;

  const { accessToken, refreshToken: newRefreshToken, jti } = generateTokenPair(payload);

  // Create new session (best-effort)
  try {
    if (decoded.tenant_id) {
      await Session.create({
        user_id: decoded.userId,
        tenant_id: decoded.tenant_id,
        jti,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        is_active: true,
      });
    }
  } catch (_) { /* non-critical */ }

  res.json({ token: accessToken, refresh_token: newRefreshToken });
}));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate current token
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Blacklist the token
  await TokenBlacklist.create({
    jti: decoded.jti,
    user_id: decoded.userId,
    reason: 'logout',
    expires_at: new Date(decoded.exp * 1000),
  });

  // Deactivate session
  await Session.findOneAndUpdate({ jti: decoded.jti }, { is_active: false, ended_at: new Date() });

  res.json({ message: 'Logged out successfully' });
}));

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     tags: [Auth]
 *     summary: List active sessions for current user
 *     responses:
 *       200:
 *         description: List of active sessions
 */
router.get('/sessions', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const sessions = await Session.find({ user_id: decoded.userId, is_active: true }).sort({ createdAt: -1 });
  res.json({ sessions });
}));

/**
 * @swagger
 * /auth/sessions/{id}:
 *   delete:
 *     tags: [Auth]
 *     summary: Deactivate a specific session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session deactivated
 */
router.delete('/sessions/:id', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const session = await Session.findOne({ _id: req.params.id, user_id: decoded.userId });
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Blacklist the session's token
  await TokenBlacklist.create({
    jti: session.jti,
    user_id: decoded.userId,
    reason: 'session_revoked',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // fallback expiry
  });

  session.is_active = false;
  await session.save();

  res.json({ message: 'Session deactivated' });
}));

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change current user password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string }
 *               new_password: { type: string }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 */
router.post('/change-password', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify current password
  const currentValid = await bcrypt.compare(current_password, user.password_hash);
  if (!currentValid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  // Validate new password strength
  const passwordValidation = validatePassword(new_password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: 'New password does not meet requirements', errors: passwordValidation.errors });
  }

  // Check against password history
  const history: string[] = (user as any).password_history || [];
  for (const oldHash of history.slice(0, PASSWORD_HISTORY_COUNT)) {
    const reused = await bcrypt.compare(new_password, oldHash);
    if (reused) {
      return res.status(400).json({ error: `New password must not match any of your last ${PASSWORD_HISTORY_COUNT} passwords` });
    }
  }

  const newHash = await bcrypt.hash(new_password, 10);
  const updatedHistory = [user.password_hash, ...history].slice(0, PASSWORD_HISTORY_COUNT);

  // Update user
  await User.findByIdAndUpdate(user._id, {
    password_hash: newHash,
    password_history: updatedHistory,
    password_changed_at: new Date(),
  });

  // Blacklist all active sessions' tokens
  const activeSessions = await Session.find({ user_id: user._id, is_active: true });
  for (const session of activeSessions) {
    await TokenBlacklist.create({
      jti: session.jti,
      user_id: user._id.toString(),
      reason: 'password_change',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }

  // Deactivate all sessions
  await Session.updateMany({ user_id: user._id, is_active: true }, { is_active: false, ended_at: new Date() });

  res.json({ message: 'Password changed successfully. All sessions have been invalidated. Please log in again.' });
}));

export default router;
