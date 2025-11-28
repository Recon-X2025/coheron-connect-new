import { apiService } from './apiService';

// ============================================
// TYPES
// ============================================

export interface POSSession {
  id: number;
  name: string;
  session_number: string;
  store_id: number;
  store_name?: string;
  terminal_id: number;
  terminal_name?: string;
  user_id: number;
  user_name?: string;
  opening_balance: number;
  closing_balance?: number;
  expected_balance?: number;
  difference?: number;
  total_orders: number;
  total_sales: number;
  total_cash: number;
  total_card: number;
  total_upi: number;
  total_other: number;
  state: 'opening' | 'opened' | 'closing' | 'closed';
  start_at: string;
  stop_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface POSTerminal {
  id: number;
  name: string;
  code: string;
  store_id: number;
  store_name?: string;
  is_active: boolean;
  printer_id?: number;
  cash_drawer_enabled: boolean;
  barcode_scanner_enabled: boolean;
  hardware_config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface POSPayment {
  id: number;
  order_id: number;
  payment_method: string;
  amount: number;
  currency: string;
  gateway_transaction_id?: string;
  gateway_response?: Record<string, any>;
  payment_status: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  card_last4?: string;
  card_type?: string;
  created_at?: string;
  processed_at?: string;
}

export interface POSReturn {
  id: number;
  original_order_id: number;
  return_order_id?: number;
  return_type: 'full' | 'partial' | 'exchange';
  return_reason?: string;
  refund_method: 'cash' | 'card' | 'store_credit' | 'original_method';
  amount_returned: number;
  amount_refunded: number;
  amount_store_credit: number;
  requires_approval: boolean;
  approved_by?: number;
  approved_at?: string;
  created_at?: string;
  processed_at?: string;
}

// ============================================
// SERVICE
// ============================================

class POSService {
  // POS Sessions
  async getSessions(params?: {
    store_id?: number;
    terminal_id?: number;
    state?: string;
  }): Promise<POSSession[]> {
    return apiService.get<POSSession>('/pos/sessions', params);
  }

  async getSession(id: number): Promise<POSSession> {
    return apiService.getById<POSSession>('/pos/sessions', id);
  }

  async createSession(data: Partial<POSSession>): Promise<POSSession> {
    return apiService.create<POSSession>('/pos/sessions', data);
  }

  async openSession(id: number, openingBalance: number): Promise<POSSession> {
    return apiService.getAxiosInstance().post(`/pos/sessions/${id}/open`, { opening_balance: openingBalance });
  }

  async closeSession(id: number, closingBalance: number): Promise<POSSession> {
    return apiService.getAxiosInstance().post(`/pos/sessions/${id}/close`, { closing_balance: closingBalance });
  }

  // POS Terminals
  async getTerminals(params?: {
    store_id?: number;
    is_active?: boolean;
  }): Promise<POSTerminal[]> {
    return apiService.get<POSTerminal>('/pos/terminals', params);
  }

  async getTerminal(id: number): Promise<POSTerminal> {
    return apiService.getById<POSTerminal>('/pos/terminals', id);
  }

  async createTerminal(data: Partial<POSTerminal>): Promise<POSTerminal> {
    return apiService.create<POSTerminal>('/pos/terminals', data);
  }

  async updateTerminal(id: number, data: Partial<POSTerminal>): Promise<POSTerminal> {
    return apiService.update<POSTerminal>('/pos/terminals', id, data);
  }

  // POS Payments
  async getPayments(params?: {
    order_id?: number;
    payment_status?: string;
  }): Promise<POSPayment[]> {
    return apiService.get<POSPayment>('/pos/payments', params);
  }

  async createPayment(data: Partial<POSPayment>): Promise<POSPayment> {
    return apiService.create<POSPayment>('/pos/payments', data);
  }

  async refundPayment(id: number, amount: number): Promise<POSPayment> {
    return apiService.getAxiosInstance().post(`/pos/payments/${id}/refund`, { amount });
  }

  // POS Returns
  async getReturns(params?: {
    original_order_id?: number;
  }): Promise<POSReturn[]> {
    return apiService.get<POSReturn>('/pos/returns', params);
  }

  async createReturn(data: Partial<POSReturn>): Promise<POSReturn> {
    return apiService.create<POSReturn>('/pos/returns', data);
  }

  async approveReturn(id: number): Promise<POSReturn> {
    return apiService.getAxiosInstance().post(`/pos/returns/${id}/approve`);
  }
}

export const posService = new POSService();

