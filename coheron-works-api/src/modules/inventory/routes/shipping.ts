import express from 'express';
import { ShippingCarrier } from '../../../models/ShippingCarrier.js';
import { Shipment } from '../../../models/Shipment.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// GET /carriers - List configured carriers
router.get('/carriers', authenticate, asyncHandler(async (req: any, res: any) => {
  const { tenant_id, is_active } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  const carriers = await ShippingCarrier.find(filter).sort({ name: 1 }).lean();
  res.json(carriers);
}));

// POST /carriers - Configure a carrier
router.post('/carriers', authenticate, asyncHandler(async (req: any, res: any) => {
  const carrier = await ShippingCarrier.create(req.body);
  res.status(201).json(carrier);
}));

// PUT /carriers/:id - Update carrier config
router.put('/carriers/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const carrier = await ShippingCarrier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!carrier) return res.status(404).json({ error: 'Carrier not found' });
  res.json(carrier);
}));

// POST /shipments - Create shipment
router.post('/shipments', authenticate, asyncHandler(async (req: any, res: any) => {
  const shipment = await Shipment.create(req.body);
  res.status(201).json(shipment);
}));

// GET /shipments - List shipments with filters
router.get('/shipments', authenticate, asyncHandler(async (req: any, res: any) => {
  const { tenant_id, status, carrier_id, sale_order_id } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (status) filter.status = status;
  if (carrier_id) filter.carrier_id = carrier_id;
  if (sale_order_id) filter.sale_order_id = sale_order_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Shipment.find(filter).populate('carrier_id').sort({ created_at: -1 }).lean(),
    pagination, filter, Shipment
  );
  res.json(result);
}));

// GET /shipments/:id - Get shipment detail
router.get('/shipments/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const shipment = await Shipment.findById(req.params.id).populate('carrier_id').lean();
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  res.json(shipment);
}));

// PUT /shipments/:id/status - Update shipment status
router.put('/shipments/:id/status', authenticate, asyncHandler(async (req: any, res: any) => {
  const { status, actual_delivery } = req.body;
  const update: any = { status };
  if (status === 'delivered' && !actual_delivery) {
    update.actual_delivery = new Date();
  }
  if (actual_delivery) update.actual_delivery = actual_delivery;

  const shipment = await Shipment.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  res.json(shipment);
}));

// POST /shipments/:id/track - Get tracking info
router.post('/shipments/:id/track', authenticate, asyncHandler(async (req: any, res: any) => {
  const shipment = await Shipment.findById(req.params.id).populate('carrier_id').lean();
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

  let tracking_url = (shipment as any).tracking_url;
  if (!tracking_url && (shipment as any).carrier_id && (shipment as any).tracking_number) {
    const carrier = (shipment as any).carrier_id;
    if (carrier.tracking_url_template) {
      tracking_url = carrier.tracking_url_template.replace('{{tracking_number}}', (shipment as any).tracking_number);
    }
  }

  res.json({
    shipment_number: (shipment as any).shipment_number,
    tracking_number: (shipment as any).tracking_number,
    tracking_url,
    status: (shipment as any).status,
    estimated_delivery: (shipment as any).estimated_delivery,
    actual_delivery: (shipment as any).actual_delivery,
  });
}));

// GET /rates - Get shipping rates from carrier config
router.get('/rates', authenticate, asyncHandler(async (req: any, res: any) => {
  const { tenant_id, carrier_id, weight, destination_country } = req.query;
  const filter: any = { is_active: true };
  if (tenant_id) filter.tenant_id = tenant_id;
  if (carrier_id) filter._id = carrier_id;

  const carriers = await ShippingCarrier.find(filter).lean();
  const rates: any[] = [];

  for (const carrier of carriers) {
    for (const service of carrier.supported_services || []) {
      rates.push({
        carrier_id: carrier._id,
        carrier_name: carrier.name,
        carrier_code: carrier.code,
        service_code: service.service_code,
        service_name: service.service_name,
        estimated_days: service.estimated_days,
        weight_unit: carrier.weight_unit,
        destination_country: destination_country || 'N/A',
      });
    }
  }

  res.json(rates);
}));

export default router;
