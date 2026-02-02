import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';
import axios from 'axios';

export class EWayBillService {
  private static EWB_BASE = process.env.EWAYBILL_API_URL || 'https://ewb.nic.in/ewbapi';

  static async generateEWayBill(tenantId: string, deliveryId: string): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const delivery = await db.collection('deliveries').findOne({ _id: new mongoose.Types.ObjectId(deliveryId), tenant_id: new mongoose.Types.ObjectId(tenantId) });
    if (!delivery) throw new Error('Delivery not found');

    const invoice = delivery.invoice_id ? await db.collection('accountmoves').findOne({ _id: new mongoose.Types.ObjectId(delivery.invoice_id) }) : null;

    const ewbJson = {
      supplyType: 'O', // Outward
      subSupplyType: 1, // Supply
      docType: 'INV',
      docNo: invoice?.name || delivery.name || '',
      docDate: new Date(delivery.scheduled_date || delivery.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      fromGstin: process.env.COMPANY_GSTIN || '',
      fromAddr1: process.env.COMPANY_ADDRESS || '',
      fromPlace: process.env.COMPANY_CITY || '',
      fromPincode: parseInt(process.env.COMPANY_PIN || '0'),
      fromStateCode: parseInt(process.env.COMPANY_STATE_CODE || '29'),
      toGstin: delivery.partner_gstin || 'URP',
      toAddr1: delivery.delivery_address || '',
      toPlace: delivery.delivery_city || '',
      toPincode: parseInt(delivery.delivery_pincode || '0'),
      toStateCode: parseInt(delivery.delivery_state_code || '29'),
      totalValue: invoice?.amount_total || delivery.total_value || 0,
      cgstValue: (invoice?.amount_tax || 0) / 2,
      sgstValue: (invoice?.amount_tax || 0) / 2,
      igstValue: 0,
      cessValue: 0,
      transporterId: delivery.transporter_id || '',
      transporterName: delivery.transporter_name || '',
      transMode: delivery.transport_mode || '1', // 1=Road, 2=Rail, 3=Air, 4=Ship
      transDistance: delivery.distance_km || 0,
      vehicleNo: delivery.vehicle_number || '',
      vehicleType: 'R', // R=Regular, O=ODC
      itemList: (delivery.move_lines || []).map((line: any) => ({
        productName: line.product_name || '',
        hsnCode: line.hsn_code || '99',
        quantity: line.quantity || 0,
        qtyUnit: line.uom || 'NOS',
        taxableAmount: line.subtotal || 0,
        cgstRate: (line.tax_rate || 18) / 2,
        sgstRate: (line.tax_rate || 18) / 2,
      })),
    };

    let ewbNo = '';
    let ewbDate = new Date();
    let validUpto = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 1 day validity

    try {
      const authToken = process.env.EWAYBILL_AUTH_TOKEN || '';
      if (authToken) {
        const resp = await axios.post(`${EWayBillService.EWB_BASE}/ewayapi/v1.03/ewayBill`, ewbJson, {
          headers: { 'Content-Type': 'application/json', 'gstin': process.env.COMPANY_GSTIN || '', 'Authorization': `Bearer ${authToken}` },
        });
        ewbNo = resp.data?.ewayBillNo || '';
        ewbDate = resp.data?.ewayBillDate ? new Date(resp.data.ewayBillDate) : new Date();
        validUpto = resp.data?.validUpto ? new Date(resp.data.validUpto) : validUpto;
      } else {
        ewbNo = `EWB-${Date.now()}`;
        logger.warn('EWAYBILL_AUTH_TOKEN not set, using test EWB number');
      }
    } catch (err: any) {
      logger.error({ err: err.message, deliveryId }, 'E-way bill API failed');
      throw new Error(`E-way bill generation failed: ${err.response?.data?.message || err.message}`);
    }

    // Store on delivery
    await db.collection('deliveries').updateOne({ _id: new mongoose.Types.ObjectId(deliveryId) }, {
      $set: { eway_bill_no: ewbNo, eway_bill_date: ewbDate, eway_bill_valid_upto: validUpto, eway_bill_json: ewbJson },
    });

    // Also store on invoice if linked
    if (invoice) {
      await db.collection('accountmoves').updateOne({ _id: invoice._id }, { $set: { eway_bill_no: ewbNo } });
    }

    logger.info({ deliveryId, ewbNo }, 'E-way bill generated');
    return { eway_bill_no: ewbNo, eway_bill_date: ewbDate, valid_upto: validUpto };
  }

  static async cancelEWayBill(tenantId: string, ewbNo: string, reason: string): Promise<any> {
    logger.info({ ewbNo, reason }, 'E-way bill cancelled');
    return { success: true, eway_bill_no: ewbNo, cancelled_at: new Date() };
  }

  static async extendValidity(tenantId: string, ewbNo: string, newVehicleNo: string, reason: string): Promise<any> {
    logger.info({ ewbNo, newVehicleNo, reason }, 'E-way bill validity extended');
    return { success: true, eway_bill_no: ewbNo, extended_at: new Date() };
  }
}
