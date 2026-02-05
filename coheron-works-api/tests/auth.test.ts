import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerUser } from './helpers.js';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user and return token', async () => {
      const res = await registerUser();
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@coheron.com');
      expect(res.body.user.name).toBe('Test User');
    });

    it('should reject duplicate email', async () => {
      await registerUser();
      const res = await registerUser();
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      await registerUser();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@coheron.com', password: 'Test@Pass123!' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@coheron.com');
    });

    it('should return 401 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'Test@Pass123!' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      await registerUser();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@coheron.com', password: 'Wrong@Pass999!' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('Protected routes', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/leads');
      expect(res.status).toBe(401);
    });
  });
});
