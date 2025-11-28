import { apiService } from './apiService';

// ============================================
// TYPES
// ============================================

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  warehouse_type: 'internal' | 'vendor' | 'customer' | 'transit' | 'production';
  partner_id?: number;
  partner_name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  manager_id?: number;
  manager_name?: string;
  active: boolean;
  temperature_controlled?: boolean;
  humidity_controlled?: boolean;
  security_level?: string;
  operating_hours?: string;
  capacity_cubic_meters?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockLocation {
  id: number;
  name: string;
  complete_name?: string;
  location_id?: number;
  warehouse_id: number;
  usage: 'supplier' | 'view' | 'internal' | 'customer' | 'inventory' | 'production' | 'transit';
  active: boolean;
  scrap_location?: boolean;
  return_location?: boolean;
  posx?: number;
  posy?: number;
  posz?: number;
  removal_strategy?: 'fifo' | 'lifo' | 'fefo' | 'closest' | 'least_packages';
  barcode?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockQuant {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  location_id: number;
  location_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity?: number;
  lot_id?: number;
  lot_name?: string;
  in_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockSummary {
  product_id: number;
  product_name: string;
  product_code: string;
  total_qty: number;
  total_reserved: number;
  available_qty: number;
  location_count: number;
}

export interface GRN {
  id: number;
  grn_number: string;
  picking_id?: number;
  purchase_order_id?: number;
  partner_id: number;
  partner_name?: string;
  warehouse_id: number;
  warehouse_name?: string;
  grn_date: string;
  expected_date?: string;
  state: 'draft' | 'received' | 'qc_pending' | 'qc_passed' | 'qc_failed' | 'done' | 'cancel';
  qc_status?: 'pending' | 'passed' | 'failed' | 'partial';
  qc_inspector_id?: number;
  qc_inspector_name?: string;
  qc_date?: string;
  qc_remarks?: string;
  received_by?: number;
  received_by_name?: string;
  approved_by?: number;
  approved_by_name?: string;
  delivery_challan_number?: string;
  supplier_invoice_number?: string;
  document_attachments?: string[];
  notes?: string;
  lines?: GRNLine[];
  created_at?: string;
  updated_at?: string;
}

export interface GRNLine {
  id: number;
  grn_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  purchase_line_id?: number;
  product_uom_id?: number;
  ordered_qty: number;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  unit_price?: number;
  landed_cost?: number;
  freight_cost?: number;
  handling_cost?: number;
  duty_cost?: number;
  insurance_cost?: number;
  qc_status?: 'pending' | 'passed' | 'failed' | 'partial';
  qc_remarks?: string;
  notes?: string;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  picking_id?: number;
  from_warehouse_id: number;
  from_warehouse_name?: string;
  to_warehouse_id: number;
  to_warehouse_name?: string;
  from_location_id?: number;
  to_location_id?: number;
  transfer_date: string;
  expected_delivery_date?: string;
  state: 'draft' | 'initiated' | 'in_transit' | 'received' | 'rejected' | 'done' | 'cancel';
  transfer_type: 'warehouse_to_warehouse' | 'bin_to_bin' | 'inter_company' | 'branch';
  initiated_by?: number;
  initiated_by_name?: string;
  received_by?: number;
  received_by_name?: string;
  approved_by?: number;
  transporter_name?: string;
  vehicle_number?: string;
  tracking_number?: string;
  notes?: string;
  lines?: StockTransferLine[];
  created_at?: string;
  updated_at?: string;
}

export interface StockTransferLine {
  id: number;
  transfer_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  product_uom_id?: number;
  quantity: number;
  quantity_done: number;
  lot_id?: number;
  unit_cost?: number;
  notes?: string;
}

export interface StockAdjustment {
  id: number;
  adjustment_number: string;
  warehouse_id: number;
  warehouse_name?: string;
  location_id?: number;
  adjustment_date: string;
  adjustment_type: 'gain' | 'loss' | 'damage' | 'expiry' | 'spoilage' | 'theft' | 'write_off' | 'revaluation';
  state: 'draft' | 'pending_approval' | 'approved' | 'done' | 'cancel';
  reason_code?: string;
  reason_description?: string;
  adjusted_by?: number;
  adjusted_by_name?: string;
  approved_by?: number;
  approved_by_name?: string;
  approval_threshold?: number;
  total_value: number;
  document_attachments?: string[];
  notes?: string;
  lines?: StockAdjustmentLine[];
  created_at?: string;
  updated_at?: string;
}

export interface StockAdjustmentLine {
  id: number;
  adjustment_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  product_uom_id?: number;
  system_qty: number;
  physical_qty: number;
  adjustment_qty: number;
  lot_id?: number;
  unit_cost?: number;
  adjustment_value: number;
  reason_code?: string;
  notes?: string;
}

export interface StockLot {
  id: number;
  name: string;
  product_id: number;
  product_name?: string;
  product_code?: string;
  ref?: string;
  company_id?: number;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockSerial {
  id: number;
  name: string;
  product_id: number;
  product_name?: string;
  product_code?: string;
  lot_id?: number;
  lot_name?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  notes?: string;
  state?: 'available' | 'reserved' | 'in_use' | 'scrapped';
  created_at?: string;
  updated_at?: string;
}

export interface ReorderSuggestion {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  warehouse_id: number;
  warehouse_name?: string;
  current_qty: number;
  min_qty: number;
  max_qty: number;
  suggested_qty: number;
  reorder_point?: number;
  safety_stock?: number;
  forecasted_demand?: number;
  lead_time_days?: number;
  suggestion_type: 'min_max' | 'reorder_point' | 'forecast' | 'mrp';
  state: 'new' | 'approved' | 'purchase_requisition_created' | 'purchase_order_created' | 'done' | 'cancel';
  purchase_requisition_id?: number;
  purchase_order_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockIssue {
  id: number;
  issue_number: string;
  issue_type: 'production' | 'project' | 'job' | 'work_order' | 'ad_hoc' | 'sample' | 'internal_consumption';
  from_warehouse_id: number;
  from_warehouse_name?: string;
  from_location_id?: number;
  to_production_id?: number;
  to_project_id?: number;
  to_job_id?: number;
  to_work_order_id?: number;
  to_reference?: string;
  issue_date: string;
  state: 'draft' | 'pending_approval' | 'approved' | 'issued' | 'done' | 'cancel';
  issued_by?: number;
  issued_by_name?: string;
  approved_by?: number;
  approved_by_name?: string;
  picking_strategy?: 'fifo' | 'lifo' | 'fefo' | 'closest' | 'least_packages';
  notes?: string;
  lines?: StockIssueLine[];
  created_at?: string;
  updated_at?: string;
}

export interface StockIssueLine {
  id: number;
  issue_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  product_uom_id?: number;
  quantity: number;
  quantity_done: number;
  lot_id?: number;
  lot_name?: string;
  serial_numbers?: string[];
  unit_cost?: number;
  notes?: string;
}

export interface StockReturn {
  id: number;
  return_number: string;
  return_type: 'purchase_return' | 'sales_return' | 'internal_return';
  original_transaction_type: 'grn' | 'sale' | 'transfer' | 'issue';
  original_transaction_id: number;
  original_transaction_ref?: string;
  warehouse_id: number;
  warehouse_name?: string;
  location_id?: number;
  return_date: string;
  state: 'draft' | 'pending_approval' | 'approved' | 'received' | 'qc_pending' | 'qc_passed' | 'qc_failed' | 'restocked' | 'done' | 'cancel';
  return_reason: string;
  restocking_rule?: 'original_location' | 'quarantine' | 'damage_area';
  qc_status?: 'pending' | 'passed' | 'failed' | 'partial';
  qc_inspector_id?: number;
  qc_inspector_name?: string;
  qc_date?: string;
  qc_remarks?: string;
  returned_by?: number;
  returned_by_name?: string;
  approved_by?: number;
  approved_by_name?: string;
  credit_note_id?: number;
  credit_note_number?: string;
  notes?: string;
  lines?: StockReturnLine[];
  created_at?: string;
  updated_at?: string;
}

export interface StockReturnLine {
  id: number;
  return_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  product_uom_id?: number;
  quantity: number;
  quantity_received: number;
  quantity_restocked: number;
  lot_id?: number;
  lot_name?: string;
  serial_numbers?: string[];
  unit_cost?: number;
  return_reason?: string;
  notes?: string;
}

export interface StockLedger {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  location_id: number;
  location_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  transaction_date: string;
  transaction_type: string;
  transaction_id?: number;
  reference?: string;
  in_qty: number;
  out_qty: number;
  balance_qty: number;
  in_value: number;
  out_value: number;
  balance_value: number;
  unit_cost?: number;
  lot_id?: number;
  partner_id?: number;
  user_id?: number;
  created_at?: string;
}

// ============================================
// SERVICE
// ============================================

class InventoryService {
  // Warehouses
  async getWarehouses(params?: { search?: string; active?: boolean }): Promise<Warehouse[]> {
    return apiService.get<Warehouse>('/inventory/warehouses', params);
  }

  async getWarehouse(id: number): Promise<Warehouse> {
    return apiService.getById<Warehouse>('/inventory/warehouses', id);
  }

  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    return apiService.create<Warehouse>('/inventory/warehouses', data);
  }

  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse> {
    return apiService.update<Warehouse>('/inventory/warehouses', id, data);
  }

  // Stock Locations
  async getLocations(warehouseId: number): Promise<StockLocation[]> {
    return apiService.get<StockLocation>(`/inventory/warehouses/${warehouseId}/locations`);
  }

  async createLocation(data: Partial<StockLocation>): Promise<StockLocation> {
    return apiService.create<StockLocation>('/inventory/locations', data);
  }

  // Stock Quantity
  async getStockQuant(params?: {
    product_id?: number;
    location_id?: number;
    warehouse_id?: number;
  }): Promise<StockQuant[]> {
    return apiService.get<StockQuant>('/inventory/stock-quant', params);
  }

  async getStockSummary(params?: {
    product_id?: number;
    warehouse_id?: number;
  }): Promise<StockSummary[]> {
    return apiService.get<StockSummary>('/inventory/stock-summary', params);
  }

  // GRN
  async getGRNs(params?: {
    state?: string;
    partner_id?: number;
    warehouse_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<GRN[]> {
    return apiService.get<GRN>('/inventory/grn', params);
  }

  async getGRN(id: number): Promise<GRN> {
    return apiService.getById<GRN>('/inventory/grn', id);
  }

  async createGRN(data: Partial<GRN>): Promise<GRN> {
    return apiService.create<GRN>('/inventory/grn', data);
  }

  async updateGRN(id: number, data: Partial<GRN>): Promise<GRN> {
    return apiService.update<GRN>('/inventory/grn', id, data);
  }

  // Stock Transfers
  async getTransfers(params?: {
    state?: string;
    from_warehouse_id?: number;
    to_warehouse_id?: number;
  }): Promise<StockTransfer[]> {
    return apiService.get<StockTransfer>('/inventory/transfers', params);
  }

  async createTransfer(data: Partial<StockTransfer>): Promise<StockTransfer> {
    return apiService.create<StockTransfer>('/inventory/transfers', data);
  }

  // Stock Adjustments
  async getAdjustments(params?: {
    state?: string;
    warehouse_id?: number;
    adjustment_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<StockAdjustment[]> {
    return apiService.get<StockAdjustment>('/inventory/adjustments', params);
  }

  async createAdjustment(data: Partial<StockAdjustment>): Promise<StockAdjustment> {
    return apiService.create<StockAdjustment>('/inventory/adjustments', data);
  }

  // Lots
  async getLots(params?: { product_id?: number; name?: string }): Promise<StockLot[]> {
    return apiService.get<StockLot>('/inventory/lots', params);
  }

  async createLot(data: Partial<StockLot>): Promise<StockLot> {
    return apiService.create<StockLot>('/inventory/lots', data);
  }

  async updateLot(id: number, data: Partial<StockLot>): Promise<StockLot> {
    return apiService.update<StockLot>('/inventory/lots', id, data);
  }

  async deleteLot(id: number): Promise<void> {
    return apiService.delete('/inventory/lots', id);
  }

  async getSerials(params?: { product_id?: number; name?: string }): Promise<StockSerial[]> {
    return apiService.get<StockSerial>('/inventory/serials', params);
  }

  async createSerial(data: Partial<StockSerial>): Promise<StockSerial> {
    return apiService.create<StockSerial>('/inventory/serials', data);
  }

  async updateSerial(id: number, data: Partial<StockSerial>): Promise<StockSerial> {
    return apiService.update<StockSerial>('/inventory/serials', id, data);
  }

  async deleteSerial(id: number): Promise<void> {
    return apiService.delete('/inventory/serials', id);
  }

  // Reorder Suggestions
  async getReorderSuggestions(params?: {
    warehouse_id?: number;
    state?: string;
  }): Promise<ReorderSuggestion[]> {
    return apiService.get<ReorderSuggestion>('/inventory/reorder-suggestions', params);
  }

  // Stock Issues
  async getStockIssues(params?: {
    state?: string;
    issue_type?: string;
    from_warehouse_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<StockIssue[]> {
    return apiService.get<StockIssue>('/inventory/stock-issues', params);
  }

  async getStockIssue(id: number): Promise<StockIssue> {
    return apiService.getById<StockIssue>('/inventory/stock-issues', id);
  }

  async createStockIssue(data: Partial<StockIssue>): Promise<StockIssue> {
    return apiService.create<StockIssue>('/inventory/stock-issues', data);
  }

  async updateStockIssue(id: number, data: Partial<StockIssue>): Promise<StockIssue> {
    return apiService.update<StockIssue>('/inventory/stock-issues', id, data);
  }

  async approveStockIssue(id: number): Promise<StockIssue> {
    return apiService.getAxiosInstance().post(`/inventory/stock-issues/${id}/approve`);
  }

  async issueStockIssue(id: number): Promise<StockIssue> {
    return apiService.getAxiosInstance().post(`/inventory/stock-issues/${id}/issue`);
  }

  async deleteStockIssue(id: number): Promise<void> {
    return apiService.delete('/inventory/stock-issues', id);
  }

  // Stock Returns
  async getStockReturns(params?: {
    state?: string;
    return_type?: string;
    warehouse_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<StockReturn[]> {
    return apiService.get<StockReturn>('/inventory/stock-returns', params);
  }

  async getStockReturn(id: number): Promise<StockReturn> {
    return apiService.getById<StockReturn>('/inventory/stock-returns', id);
  }

  async createStockReturn(data: Partial<StockReturn>): Promise<StockReturn> {
    return apiService.create<StockReturn>('/inventory/stock-returns', data);
  }

  async updateStockReturn(id: number, data: Partial<StockReturn>): Promise<StockReturn> {
    return apiService.update<StockReturn>('/inventory/stock-returns', id, data);
  }

  async approveStockReturn(id: number): Promise<StockReturn> {
    return apiService.getAxiosInstance().post(`/inventory/stock-returns/${id}/approve`);
  }

  async receiveStockReturn(id: number): Promise<StockReturn> {
    return apiService.getAxiosInstance().post(`/inventory/stock-returns/${id}/receive`);
  }

  async qcStockReturn(id: number, qcData: { status: string; remarks?: string }): Promise<StockReturn> {
    return apiService.getAxiosInstance().post(`/inventory/stock-returns/${id}/qc`, qcData);
  }

  async restockStockReturn(id: number): Promise<StockReturn> {
    return apiService.getAxiosInstance().post(`/inventory/stock-returns/${id}/restock`);
  }

  async deleteStockReturn(id: number): Promise<void> {
    return apiService.delete('/inventory/stock-returns', id);
  }

  // Stock Ledger
  async getStockLedger(params?: {
    product_id?: number;
    location_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<StockLedger[]> {
    return apiService.get<StockLedger>('/inventory/stock-ledger', params);
  }
}

export const inventoryService = new InventoryService();

