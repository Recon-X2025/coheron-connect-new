import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, getAuthToken } from './helpers.js';
import { SaleOrder } from '../src/models/SaleOrder.js';
import { DeliveryOrder, ShipmentTracking, FreightCharge } from '../src/models/DeliveryOrder.js';

describe('Sales – Delivery Orders API', () => {
  let token: string;
  const fakeId = '507f1f77bcf86cd799439011';
  const warehouseId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    token = await getAuthToken('delivery-test@coheron.com', 'Test@Pass123!');
  });

  // The delivery route POST requires an existing SaleOrder (it does SaleOrder.findById).
  // Delivery routes lack authenticate middleware, so auth guard tests check a different endpoint.
  // We create a SaleOrder via model to enable delivery creation.

  async function createSaleOrderAndDelivery() {
    const so = await SaleOrder.create({
      name: `SO-DEL-${Date.now()}`,
      partner_id: new mongoose.Types.ObjectId(),
      order_line: [{ product_id: new mongoose.Types.ObjectId(), product_uom_qty: 5, price_unit: 100 }],
    });
    const res = await request(app)
      .post('/api/sales/delivery')
      .set('Authorization', `Bearer ${token}`)
      .send({ sale_order_id: so._id.toString(), warehouse_id: warehouseId });
    return res;
  }

  describe('POST /api/sales/delivery', () => {
    it('should create a delivery order', async () => {
      const res = await createSaleOrderAndDelivery();
      expect(res.status).toBe(201);
      expect(res.body.delivery_number).toBeDefined();
    });
  });

  describe('GET /api/sales/delivery', () => {
    it('should return paginated delivery orders', async () => {
      const res = await request(app).get('/api/sales/delivery').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/sales/delivery/:id', () => {
    it('should return a delivery order by ID', async () => {
      const created = await createSaleOrderAndDelivery();
      const res = await request(app).get(`/api/sales/delivery/${created.body._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent delivery', async () => {
      const res = await request(app).get(`/api/sales/delivery/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/sales/delivery/:id/tracking', () => {
    it('should add a tracking event', async () => {
      const created = await createSaleOrderAndDelivery();
      const res = await request(app)
        .post(`/api/sales/delivery/${created.body._id}/tracking`)
        .set('Authorization', `Bearer ${token}`)
        .send({ tracking_event: 'shipped', location: 'Mumbai Hub' });
      expect(res.status).toBe(201);
    });
  });

  describe('POST /api/sales/delivery/:id/freight', () => {
    it('should add a freight charge', async () => {
      const created = await createSaleOrderAndDelivery();
      const res = await request(app)
        .post(`/api/sales/delivery/${created.body._id}/freight`)
        .set('Authorization', `Bearer ${token}`)
        .send({ charge_type: 'shipping', amount: 250, description: 'Standard delivery' });
      expect(res.status).toBe(201);
    });
  });

  describe('PUT /api/sales/delivery/:id/status', () => {
    it('should update delivery status', async () => {
      const created = await createSaleOrderAndDelivery();
      const res = await request(app)
        .put(`/api/sales/delivery/${created.body._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'shipped' });
      expect(res.status).toBe(200);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/sales/delivery');
      expect(res.status).toBe(401);
    });
  });
});
