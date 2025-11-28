import { apiService } from './apiService';

// ============================================
// TYPES
// ============================================

export interface PriceList {
  id: number;
  name: string;
  currency: string;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  is_default: boolean;
  products?: ProductPrice[];
}

export interface ProductPrice {
  id: number;
  price_list_id: number;
  product_id: number;
  price: number;
  min_quantity: number;
  product_name?: string;
}

export interface CustomerPrice {
  id: number;
  partner_id: number;
  product_id: number;
  price: number;
  valid_from?: string;
  valid_until?: string;
  product_name?: string;
}

export interface PricingRule {
  id: number;
  name: string;
  rule_type: 'volume' | 'tiered' | 'promotional' | 'contract' | 'region';
  conditions: any;
  discount_type: 'percentage' | 'fixed' | 'formula';
  discount_value: number;
  priority: number;
  is_active: boolean;
}

export interface Contract {
  id: number;
  contract_number: string;
  partner_id: number;
  contract_type: 'sales' | 'service' | 'subscription' | 'maintenance';
  start_date: string;
  end_date?: string;
  renewal_date?: string;
  auto_renew: boolean;
  billing_cycle: string;
  contract_value: number;
  currency: string;
  status: 'draft' | 'active' | 'expired' | 'cancelled' | 'renewed';
  contract_lines?: ContractLine[];
  slas?: SLA[];
}

export interface ContractLine {
  id: number;
  contract_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  billing_frequency?: string;
}

export interface SLA {
  id: number;
  name: string;
  contract_id: number;
  sla_type: string;
  target_value: number;
  unit?: string;
  penalty_per_violation: number;
  credit_per_violation: number;
}

export interface Subscription {
  id: number;
  subscription_number: string;
  contract_id?: number;
  partner_id: number;
  product_id?: number;
  subscription_plan?: string;
  billing_cycle: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  start_date: string;
  end_date?: string;
  next_billing_date?: string;
  status: 'active' | 'suspended' | 'cancelled' | 'expired';
  auto_renew: boolean;
}

export interface DeliveryOrder {
  id: number;
  delivery_number: string;
  sale_order_id?: number;
  warehouse_id?: number;
  delivery_date: string;
  delivery_address?: string;
  delivery_method?: string;
  carrier_name?: string;
  tracking_number?: string;
  status: 'draft' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
  delivery_lines?: DeliveryOrderLine[];
  tracking?: ShipmentTracking[];
  freight_charges?: FreightCharge[];
}

export interface DeliveryOrderLine {
  id: number;
  delivery_order_id: number;
  sale_order_line_id?: number;
  product_id: number;
  quantity_ordered: number;
  quantity_delivered: number;
  quantity_pending: number;
  product_name?: string;
}

export interface ShipmentTracking {
  id: number;
  delivery_order_id: number;
  tracking_event: string;
  location?: string;
  event_date: string;
  notes?: string;
}

export interface FreightCharge {
  id: number;
  delivery_order_id: number;
  charge_type: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface RMA {
  id: number;
  rma_number: string;
  sale_order_id?: number;
  delivery_order_id?: number;
  partner_id: number;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'processed' | 'completed' | 'cancelled';
  requested_date: string;
  refund_amount: number;
  rma_lines?: RMALine[];
}

export interface RMALine {
  id: number;
  rma_id: number;
  sale_order_line_id?: number;
  product_id: number;
  quantity_returned: number;
  condition: string;
  refund_amount: number;
  product_name?: string;
}

export interface SalesForecast {
  id: number;
  forecast_name: string;
  forecast_type: 'quantity' | 'revenue' | 'pipeline' | 'rep_level';
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  user_id?: number;
  territory_id?: number;
  forecasted_amount: number;
  forecasted_quantity?: number;
  actual_amount: number;
  actual_quantity?: number;
  confidence_level?: number;
  forecast_lines?: ForecastLine[];
}

export interface ForecastLine {
  id: number;
  forecast_id: number;
  product_id?: number;
  opportunity_id?: number;
  forecasted_amount: number;
  forecasted_quantity?: number;
  probability?: number;
}

export interface SalesTarget {
  id: number;
  target_name: string;
  user_id?: number;
  team_id?: number;
  territory_id?: number;
  product_id?: number;
  period_type: string;
  period_start: string;
  period_end: string;
  revenue_target: number;
  quantity_target?: number;
  deal_count_target?: number;
  achievement_revenue: number;
  achievement_quantity?: number;
  achievement_deal_count?: number;
}

export interface SalesTeam {
  id: number;
  name: string;
  code?: string;
  manager_id?: number;
  description?: string;
  is_active: boolean;
  team_members?: SalesTeamMember[];
}

export interface SalesTeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: string;
  joined_date: string;
  is_active: boolean;
}

export interface SalesIncentive {
  id: number;
  name: string;
  incentive_type: string;
  calculation_method: string;
  amount_percentage?: number;
  fixed_amount?: number;
  is_active: boolean;
}

export interface SalesActivityKPI {
  id: number;
  user_id: number;
  period_start: string;
  period_end: string;
  calls_made: number;
  emails_sent: number;
  meetings_held: number;
  leads_created: number;
  opportunities_created: number;
  quotes_sent: number;
  orders_won: number;
  orders_lost: number;
}

export interface SalesDashboard {
  period: { start: string; end: string };
  revenue: {
    total_revenue: number;
    total_orders: number;
    unique_customers: number;
  };
  conversion: {
    quotes_sent: number;
    quotes_converted: number;
    conversion_rate: number;
  };
  pipeline: {
    total_opportunities: number;
    total_pipeline_value: number;
    weighted_pipeline_value: number;
  };
  top_products: Array<{
    id: number;
    name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  top_customers: Array<{
    id: number;
    name: string;
    order_count: number;
    total_revenue: number;
  }>;
  pipeline_stages: Array<{
    stage: string;
    count: number;
    total_value: number;
  }>;
}

// ============================================
// PRICING SERVICE
// ============================================

export const pricingService = {
  getPriceLists: (params?: { is_active?: boolean; currency?: string }) =>
    apiService.get<PriceList>('/sales/pricing/price-lists', params),

  getPriceList: (id: number) =>
    apiService.getById<PriceList>('/sales/pricing/price-lists', id),

  createPriceList: (data: Partial<PriceList>) =>
    apiService.post<PriceList>('/sales/pricing/price-lists', data),

  updatePriceList: (id: number, data: Partial<PriceList>) =>
    apiService.put<PriceList>(`/sales/pricing/price-lists/${id}`, data),

  addProductPrice: (priceListId: number, data: Partial<ProductPrice>) =>
    apiService.post<ProductPrice>(`/sales/pricing/price-lists/${priceListId}/products`, data),

  getCustomerPrices: (partnerId: number) =>
    apiService.get<CustomerPrice>(`/sales/pricing/customer-prices/${partnerId}`),

  setCustomerPrice: (data: Partial<CustomerPrice>) =>
    apiService.post<CustomerPrice>('/sales/pricing/customer-prices', data),

  getPricingRules: (params?: { is_active?: boolean; rule_type?: string }) =>
    apiService.get<PricingRule>('/sales/pricing/pricing-rules', params),

  createPricingRule: (data: Partial<PricingRule>) =>
    apiService.post<PricingRule>('/sales/pricing/pricing-rules', data),

  calculatePrice: (data: { product_id: number; partner_id?: number; quantity: number; price_list_id?: number }) =>
    apiService.post<any>('/sales/pricing/calculate-price', data),

  getPromotions: (params?: { product_id?: number }) =>
    apiService.get<any>('/sales/pricing/promotions', params),

  createPromotion: (data: any) =>
    apiService.post<any>('/sales/pricing/promotions', data),
};

// ============================================
// CONTRACTS SERVICE
// ============================================

export const contractsService = {
  getContracts: (params?: { partner_id?: number; status?: string; contract_type?: string }) =>
    apiService.get<Contract>('/sales/contracts', params),

  getContract: (id: number) =>
    apiService.getById<Contract>('/sales/contracts', id),

  createContract: (data: Partial<Contract>) =>
    apiService.post<Contract>('/sales/contracts', data),

  updateContract: (id: number, data: Partial<Contract>) =>
    apiService.put<Contract>(`/sales/contracts/${id}`, data),

  renewContract: (id: number, data: { new_end_date: string; new_renewal_date?: string }) =>
    apiService.post<Contract>(`/sales/contracts/${id}/renew`, data),

  getSLAs: (contractId: number) =>
    apiService.get<SLA>(`/sales/contracts/${contractId}/slas`),

  createSLA: (contractId: number, data: Partial<SLA>) =>
    apiService.post<SLA>(`/sales/contracts/${contractId}/slas`, data),

  recordSLAPerformance: (slaId: number, data: any) =>
    apiService.post<any>(`/sales/contracts/slas/${slaId}/performance`, data),

  getSubscriptions: (params?: { partner_id?: number; status?: string }) =>
    apiService.get<Subscription>('/sales/contracts/subscriptions', params),

  createSubscription: (data: Partial<Subscription>) =>
    apiService.post<Subscription>('/sales/contracts/subscriptions', data),

  cancelSubscription: (id: number, data: { cancellation_reason?: string }) =>
    apiService.post<Subscription>(`/sales/contracts/subscriptions/${id}/cancel`, data),
};

// ============================================
// DELIVERY SERVICE
// ============================================

export const deliveryService = {
  getDeliveryOrders: (params?: { sale_order_id?: number; status?: string; warehouse_id?: number }) =>
    apiService.get<DeliveryOrder>('/sales/delivery', params),

  getDeliveryOrder: (id: number) =>
    apiService.getById<DeliveryOrder>('/sales/delivery', id),

  createDeliveryOrder: (data: Partial<DeliveryOrder>) =>
    apiService.post<DeliveryOrder>('/sales/delivery', data),

  updateDeliveryStatus: (id: number, data: { status: string; delivered_at?: string; tracking_number?: string; carrier_name?: string }) =>
    apiService.put<DeliveryOrder>(`/sales/delivery/${id}/status`, data),

  updateDeliveryLine: (id: number, lineId: number, data: { quantity_delivered: number }) =>
    apiService.put<DeliveryOrderLine>(`/sales/delivery/${id}/lines/${lineId}`, data),

  addTrackingEvent: (id: number, data: { tracking_event: string; location?: string; notes?: string }) =>
    apiService.post<ShipmentTracking>(`/sales/delivery/${id}/tracking`, data),

  getTracking: (id: number) =>
    apiService.get<ShipmentTracking>(`/sales/delivery/${id}/tracking`),

  addFreightCharge: (id: number, data: Partial<FreightCharge>) =>
    apiService.post<FreightCharge>(`/sales/delivery/${id}/freight`, data),
};

// ============================================
// RETURNS SERVICE
// ============================================

export const returnsService = {
  getRMAs: (params?: { partner_id?: number; sale_order_id?: number; status?: string }) =>
    apiService.get<RMA>('/sales/returns', params),

  getRMA: (id: number) =>
    apiService.getById<RMA>('/sales/returns', id),

  createRMA: (data: Partial<RMA>) =>
    apiService.post<RMA>('/sales/returns', data),

  updateRMAStatus: (id: number, data: any) =>
    apiService.put<RMA>(`/sales/returns/${id}/status`, data),

  getWarranties: (params?: { partner_id?: number; product_id?: number; status?: string }) =>
    apiService.get<any>('/sales/returns/warranties', params),

  createWarranty: (data: any) =>
    apiService.post<any>('/sales/returns/warranties', data),

  getRepairRequests: (params?: { partner_id?: number; status?: string }) =>
    apiService.get<any>('/sales/returns/repairs', params),

  createRepairRequest: (data: any) =>
    apiService.post<any>('/sales/returns/repairs', data),

  updateRepairStatus: (id: number, data: any) =>
    apiService.put<any>(`/sales/returns/repairs/${id}/status`, data),
};

// ============================================
// FORECASTING SERVICE
// ============================================

export const forecastingService = {
  getForecasts: (params?: any) =>
    apiService.get<SalesForecast>('/sales/forecasting/forecasts', params),

  getForecast: (id: number) =>
    apiService.getById<SalesForecast>('/sales/forecasting/forecasts', id),

  createForecast: (data: Partial<SalesForecast>) =>
    apiService.post<SalesForecast>('/sales/forecasting/forecasts', data),

  updateForecastActuals: (id: number, data: { actual_amount?: number; actual_quantity?: number }) =>
    apiService.put<SalesForecast>(`/sales/forecasting/forecasts/${id}/actuals`, data),

  generatePipelineForecast: (data: { period_start: string; period_end: string; user_id?: number; territory_id?: number }) =>
    apiService.post<any>('/sales/forecasting/forecasts/pipeline', data),

  getTargets: (params?: any) =>
    apiService.get<SalesTarget>('/sales/forecasting/targets', params),

  createTarget: (data: Partial<SalesTarget>) =>
    apiService.post<SalesTarget>('/sales/forecasting/targets', data),

  updateTargetAchievements: (id: number, data: any) =>
    apiService.put<SalesTarget>(`/sales/forecasting/targets/${id}/achievements`, data),

  calculateAchievements: (id: number) =>
    apiService.post<SalesTarget>(`/sales/forecasting/targets/${id}/calculate-achievements`, {}),
};

// ============================================
// SALES TEAM SERVICE
// ============================================

export const salesTeamService = {
  getTeams: (params?: { is_active?: boolean }) =>
    apiService.get<SalesTeam>('/sales/team/teams', params),

  createTeam: (data: Partial<SalesTeam>) =>
    apiService.post<SalesTeam>('/sales/team/teams', data),

  addTeamMember: (teamId: number, data: { user_id: number; role?: string }) =>
    apiService.post<SalesTeamMember>(`/sales/team/teams/${teamId}/members`, data),

  getIncentives: (params?: { is_active?: boolean }) =>
    apiService.get<SalesIncentive>('/sales/team/incentives', params),

  createIncentive: (data: Partial<SalesIncentive>) =>
    apiService.post<SalesIncentive>('/sales/team/incentives', data),

  calculateIncentive: (data: { sale_order_id: number; user_id: number }) =>
    apiService.post<any>('/sales/team/incentives/calculate', data),

  recordIncentivePayment: (data: any) =>
    apiService.post<any>('/sales/team/incentive-payments', data),

  getActivityKPIs: (params: { user_id: number; period_start: string; period_end: string }) =>
    apiService.get<SalesActivityKPI>('/sales/team/activity-kpis', params),

  updateActivityKPIs: (data: Partial<SalesActivityKPI>) =>
    apiService.post<SalesActivityKPI>('/sales/team/activity-kpis', data),
};

// ============================================
// ANALYTICS SERVICE
// ============================================

export const salesAnalyticsService = {
  getDashboard: async (params?: { period_start?: string; period_end?: string; user_id?: number; territory_id?: number }) => {
    const response = await apiService.getAxiosInstance().get<SalesDashboard>('/sales/analytics/dashboard', { params });
    return response.data;
  },

  getPerformance: (params?: { period_start?: string; period_end?: string; user_id?: number; group_by?: string }) =>
    apiService.get<any>('/sales/analytics/performance', params),

  getProductSales: (params?: { period_start?: string; period_end?: string; product_id?: number; category_id?: number }) =>
    apiService.get<any>('/sales/analytics/products', params),

  getCustomerSales: (params?: { period_start?: string; period_end?: string; partner_id?: number }) =>
    apiService.get<any>('/sales/analytics/customers', params),

  getSalesCycle: (params?: { period_start?: string; period_end?: string }) =>
    apiService.get<any>('/sales/analytics/sales-cycle', params),

  getWinLoss: (params?: { period_start?: string; period_end?: string; user_id?: number }) =>
    apiService.get<any>('/sales/analytics/win-loss', params),
};

// Export all services
export const salesService = {
  pricing: pricingService,
  contracts: contractsService,
  delivery: deliveryService,
  returns: returnsService,
  forecasting: forecastingService,
  team: salesTeamService,
  analytics: salesAnalyticsService,
};

