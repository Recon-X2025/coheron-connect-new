import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

export class CreditLimitService {
  async checkCreditLimit(tenantId: string, partnerId: string, additionalAmount: number, session?: mongoose.ClientSession): Promise<{ allowed: boolean; credit_limit: number; current_used: number; available: number }> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const partner = await db.collection('partners').findOne(
      {
        _id: new mongoose.Types.ObjectId(partnerId),
        tenant_id: new mongoose.Types.ObjectId(tenantId),
      },
      ...(session ? [{ session }] : []) as any
    );

    if (!partner) throw new NotFoundError('Partner');

    const creditLimit = partner.credit_limit || 0;
    if (creditLimit === 0) {
      // No credit limit set = unlimited
      return { allowed: true, credit_limit: 0, current_used: partner.current_credit_used || 0, available: Infinity };
    }

    const currentUsed = partner.current_credit_used || 0;
    const available = creditLimit - currentUsed;

    return {
      allowed: additionalAmount <= available,
      credit_limit: creditLimit,
      current_used: currentUsed,
      available: Math.max(0, available),
    };
  }

  async updateCreditUsed(tenantId: string, partnerId: string, amount: number, session?: mongoose.ClientSession): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    await db.collection('partners').updateOne(
      { _id: new mongoose.Types.ObjectId(partnerId), tenant_id: new mongoose.Types.ObjectId(tenantId) },
      { $inc: { current_credit_used: amount } },
      ...(session ? [{ session }] : []) as any
    );
  }

  async releaseCreditUsed(tenantId: string, partnerId: string, amount: number, session?: mongoose.ClientSession): Promise<void> {
    await this.updateCreditUsed(tenantId, partnerId, -amount, session);
  }
}

export const creditLimitService = new CreditLimitService();
export default creditLimitService;
