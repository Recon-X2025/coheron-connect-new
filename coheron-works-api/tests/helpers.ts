import request from 'supertest';
import app from '../src/app.js';

export { app };

export async function registerUser(data = {
  name: 'Test User',
  email: 'test@coheron.com',
  password: 'Test@Pass123!',
}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send(data);
  return res;
}

export async function getAuthToken(email = 'test@coheron.com', password = 'Test@Pass123!') {
  // Register first, then login
  await registerUser({ name: 'Test User', email, password });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.token as string;
}
