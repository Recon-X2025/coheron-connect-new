import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, getAuthToken } from './helpers.js';

describe('Products API', () => {
  let token: string;
  const sampleProduct = {
    name: 'Test Widget',
    default_code: 'TW-001',
    list_price: 29.99,
    standard_price: 15.00,
    qty_available: 100,
    type: 'product',
  };

  beforeAll(async () => {
    token = await getAuthToken('products-test@coheron.com', 'Test@Pass123!');
  });

  describe('POST /api/products', () => {
    it('should create a product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleProduct);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Widget');
      expect(res.body.list_price).toBe(29.99);
    });
  });

  describe('GET /api/products', () => {
    it('should return paginated products', async () => {
      await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send(sampleProduct);
      await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({ ...sampleProduct, name: 'Widget 2', default_code: 'TW-002' });

      const res = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by search', async () => {
      await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send(sampleProduct);
      await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({ ...sampleProduct, name: 'Other Item', default_code: 'OI-001' });

      const res = await request(app).get('/api/products?search=Widget').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Test Widget');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a product by ID', async () => {
      const created = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send(sampleProduct);
      const res = await request(app).get(`/api/products/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Widget');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/api/products/507f1f77bcf86cd799439011').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product', async () => {
      const created = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send(sampleProduct);
      const res = await request(app)
        .put(`/api/products/${created.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Widget', list_price: 39.99 });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Widget');
      expect(res.body.list_price).toBe(39.99);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      const created = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send(sampleProduct);
      const res = await request(app).delete(`/api/products/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const check = await request(app).get(`/api/products/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(check.status).toBe(404);
    });
  });
});
