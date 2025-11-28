import express from 'express';
import pool from '../database/connection.js';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getUserRoles, getUserPermissions } from '../utils/permissions.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user roles and permissions
    const roles = await getUserRoles(user.id);
    const permissions = await getUserPermissions(user.id);

    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const token = jwt.sign(
      { 
        userId: user.id, 
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
        id: user.id,
        uid: user.uid,
        name: user.name,
        email: user.email,
        roles,
        permissions
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    // Get next UID
    const uidResult = await pool.query(
      'SELECT COALESCE(MAX(uid), 0) + 1 as next_uid FROM users'
    );
    const nextUid = uidResult.rows[0].next_uid;

    const result = await pool.query(
      `INSERT INTO users (uid, name, email, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, uid, name, email`,
      [nextUid, name, email, hashedPassword]
    );

    const user = result.rows[0];
    
    // Get user roles and permissions (new user will have empty arrays)
    const roles = await getUserRoles(user.id);
    const permissions = await getUserPermissions(user.id);

    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const token = jwt.sign(
      { 
        userId: user.id, 
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
        id: user.id,
        uid: user.uid,
        name: user.name,
        email: user.email,
        roles,
        permissions
      },
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

