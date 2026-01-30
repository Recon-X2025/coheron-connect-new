import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getUserRoles, getUserPermissions } from '../utils/permissions.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Login
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
  const token = jwt.sign(
    {
      userId: user._id.toString(),
      uid: user.uid,
      email: user.email,
      roles,
      permissions
    },
    jwtSecret,
    { expiresIn } as SignOptions
  );

  res.json({
    token,
    user: {
      id: user._id,
      uid: user.uid,
      name: user.name,
      email: user.email,
      roles,
      permissions
    },
  });
}));

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  // Get next UID
  const lastUser = await User.findOne().sort({ uid: -1 });
  const nextUid = (lastUser?.uid || 0) + 1;

  const user = await User.create({
    uid: nextUid,
    name,
    email,
    password_hash: hashedPassword,
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
      roles,
      permissions
    },
  });
}));

export default router;
