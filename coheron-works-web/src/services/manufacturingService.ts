import { apiService } from './apiService';

// ============================================
// TYPES
// ============================================

export interface ManufacturingOrder {
  id: number;
  name: string;
  mo_number?: string;
  product_id: number;
  product_name?: string;
  product_qty: number;
  qty_produced?: number;
  qty_scrapped?: number;
  state: 'draft' | 'confirmed' | 'progress' | 'to_close' | 'done' | 'cancel';
  mo_type?: 'make_to_stock' | 'make_to_order';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  date_planned_start?: string;
  date_planned_finished?: string;
  date_start?: string;
  date_finished?: string;
  user_id?: number;
  user_name?: string;
  bom_id?: number;
  routing_id?: number;
  sale_order_id?: number;
  sale_order_name?: string;
  project_id?: number;
  warehouse_id?: number;
  origin?: string;
  workorder_count?: number;
  work_orders?: WorkOrder[];
  material_consumption?: MaterialConsumption[];
  material_reservations?: MaterialReservation[];
  finished_goods?: FinishedGood[];
  quality_inspections?: QualityInspection[];
  costing?: Costing[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BOM {
  id: number;
  name: string;
  code?: string;
  product_id: number;
  product_name?: string;
  product_qty: number;
  product_uom_id?: number;
  type?: 'normal' | 'phantom' | 'subcontract';
  active?: boolean;
  version?: number;
  date_start?: string;
  date_stop?: string;
  sequence?: number;
  ready_to_produce?: 'all_available' | 'asap';
  user_id?: number;
  notes?: string;
  lines?: BOMLine[];
  created_at?: string;
  updated_at?: string;
}

export interface BOMLine {
  id: number;
  bom_id: number;
  product_id: number;
  product_name?: string;
  default_code?: string;
  product_qty: number;
  product_uom_id?: number;
  sequence?: number;
  operation_id?: number;
  type?: 'normal' | 'phantom' | 'subcontract';
  date_start?: string;
  date_stop?: string;
  notes?: string;
}

export interface Routing {
  id: number;
  name: string;
  code?: string;
  active?: boolean;
  company_id?: number;
  location_id?: number;
  note?: string;
  operations?: RoutingOperation[];
  created_at?: string;
  updated_at?: string;
}

export interface RoutingOperation {
  id: number;
  routing_id: number;
  name: string;
  sequence: number;
  workcenter_id?: number;
  workcenter_name?: string;
  workcenter_code?: string;
  time_mode?: 'auto' | 'manual';
  time_cycle_manual?: number;
  time_cycle?: number;
  time_mode_batch?: number;
  batch_size?: number;
  time_start?: number;
  time_stop?: number;
  worksheet_type?: string;
  note?: string;
}

export interface WorkCenter {
  id: number;
  name: string;
  code?: string;
  active?: boolean;
  workcenter_type?: string;
  capacity?: number;
  time_efficiency?: number;
  time_start?: number;
  time_stop?: number;
  costs_hour?: number;
  costs_cycle?: number;
  oee_target?: number;
  location_id?: number;
  resource_calendar_id?: number;
  company_id?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkOrder {
  id: number;
  name: string;
  mo_id: number;
  mo_name?: string;
  mo_number?: string;
  operation_id?: number;
  operation_name?: string;
  workcenter_id?: number;
  workcenter_name?: string;
  state: 'pending' | 'ready' | 'progress' | 'done' | 'cancel';
  sequence: number;
  date_planned_start?: string;
  date_planned_finished?: string;
  date_start?: string;
  date_finished?: string;
  duration_expected?: number;
  duration?: number;
  duration_unit?: number;
  qty_produced?: number;
  qty_producing?: number;
  qty_scrapped?: number;
  is_user_working?: boolean;
  user_id?: number;
  user_name?: string;
  employee_ids?: number[];
  worksheet_type?: string;
  worksheet_page?: number;
  note?: string;
  activities?: OperatorActivity[];
  created_at?: string;
  updated_at?: string;
}

export interface OperatorActivity {
  id: number;
  workorder_id: number;
  operator_id: number;
  operator_name?: string;
  activity_type: 'start' | 'pause' | 'resume' | 'stop' | 'complete' | 'scrap';
  qty_produced?: number;
  qty_scrapped?: number;
  downtime_reason?: string;
  downtime_duration?: number;
  notes?: string;
  timestamp?: string;
}

export interface MaterialConsumption {
  id: number;
  mo_id: number;
  product_id: number;
  bom_line_id?: number;
  workorder_id?: number;
  product_uom_qty: number;
  product_uom_id?: number;
  state?: 'draft' | 'done' | 'cancel';
  date_expected?: string;
  date_planned?: string;
  date_actual?: string;
  location_id?: number;
  lot_id?: number;
  tracking?: 'none' | 'lot' | 'serial';
  backflush_mode?: 'manual' | 'auto' | 'start';
  notes?: string;
}

export interface MaterialReservation {
  id: number;
  mo_id: number;
  product_id: number;
  bom_line_id?: number;
  product_uom_qty: number;
  product_uom_id?: number;
  location_id?: number;
  lot_id?: number;
  state?: 'draft' | 'assigned' | 'done' | 'cancel';
  date_expected?: string;
  date_planned?: string;
}

export interface FinishedGood {
  id: number;
  mo_id: number;
  product_id: number;
  product_uom_qty: number;
  product_uom_id?: number;
  location_id?: number;
  lot_id?: number;
  serial_number?: string;
  state?: 'draft' | 'done' | 'cancel';
  date_planned?: string;
  date_actual?: string;
  quality_state?: 'none' | 'pass' | 'fail' | 'pending';
  notes?: string;
}

export interface QualityInspection {
  id: number;
  mo_id?: number;
  mo_name?: string;
  mo_number?: string;
  workorder_id?: number;
  workorder_name?: string;
  inspection_type: 'in_process' | 'final' | 'sample';
  product_id?: number;
  product_name?: string;
  qty_to_inspect?: number;
  qty_inspected?: number;
  qty_passed?: number;
  qty_failed?: number;
  state?: 'draft' | 'in_progress' | 'done' | 'cancel';
  inspector_id?: number;
  inspector_name?: string;
  inspection_date?: string;
  notes?: string;
  checklist?: QualityChecklistItem[];
}

export interface QualityChecklistItem {
  id: number;
  inspection_id: number;
  checklist_item: string;
  specification?: string;
  actual_value?: string;
  tolerance_min?: number;
  tolerance_max?: number;
  result?: 'pass' | 'fail' | 'pending';
  notes?: string;
}

export interface NonConformance {
  id: number;
  mo_id?: number;
  mo_name?: string;
  mo_number?: string;
  workorder_id?: number;
  workorder_name?: string;
  inspection_id?: number;
  ncr_number: string;
  product_id?: number;
  product_name?: string;
  qty_non_conforming?: number;
  severity?: 'minor' | 'major' | 'critical';
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  state?: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: number;
  assigned_to_name?: string;
  resolution_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReworkOrder {
  id: number;
  mo_id?: number;
  mo_name?: string;
  mo_number?: string;
  ncr_id?: number;
  ncr_number?: string;
  name: string;
  product_id: number;
  product_name?: string;
  qty_to_rework: number;
  workorder_id?: number;
  state?: 'draft' | 'confirmed' | 'progress' | 'done' | 'cancel';
  date_planned_start?: string;
  date_planned_finished?: string;
  notes?: string;
}

export interface Costing {
  id: number;
  mo_id: number;
  cost_type: 'material' | 'labor' | 'overhead' | 'subcontract' | 'scrap' | 'total';
  standard_cost?: number;
  actual_cost?: number;
  variance?: number;
  variance_percent?: number;
  currency?: string;
  cost_account_id?: number;
  notes?: string;
}

export interface MaterialAvailability {
  available: boolean;
  missing_materials?: Array<{
    product_id: number;
    required_qty: number;
    available_qty: number;
  }>;
}

// ============================================
// MANUFACTURING ORDERS SERVICE
// ============================================

class ManufacturingService {
  // Manufacturing Orders
  async getManufacturingOrders(params?: {
    state?: string;
    mo_type?: string;
    search?: string;
    product_id?: number;
    sale_order_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<ManufacturingOrder[]> {
    return apiService.get<ManufacturingOrder>('/manufacturing', params);
  }

  async getManufacturingOrder(id: number): Promise<ManufacturingOrder> {
    return apiService.getById<ManufacturingOrder>('/manufacturing', id);
  }

  async createManufacturingOrder(data: Partial<ManufacturingOrder>): Promise<ManufacturingOrder> {
    return apiService.create<ManufacturingOrder>('/manufacturing', data);
  }

  async updateManufacturingOrder(
    id: number,
    data: Partial<ManufacturingOrder>
  ): Promise<ManufacturingOrder> {
    return apiService.update<ManufacturingOrder>('/manufacturing', id, data);
  }

  async deleteManufacturingOrder(id: number): Promise<void> {
    return apiService.delete('/manufacturing', id);
  }

  // MO Lifecycle Actions
  async confirmMO(id: number): Promise<ManufacturingOrder> {
    return apiService.create<ManufacturingOrder>(`/manufacturing/${id}/confirm`, {});
  }

  async startMO(id: number): Promise<ManufacturingOrder> {
    return apiService.create<ManufacturingOrder>(`/manufacturing/${id}/start`, {});
  }

  async completeMO(id: number, qty_produced?: number): Promise<ManufacturingOrder> {
    return apiService.create<ManufacturingOrder>(`/manufacturing/${id}/complete`, {
      qty_produced,
    });
  }

  async cancelMO(id: number): Promise<ManufacturingOrder> {
    return apiService.create<ManufacturingOrder>(`/manufacturing/${id}/cancel`, {});
  }

  async splitMO(id: number, split_qty: number, reason?: string): Promise<ManufacturingOrder> {
    return apiService.create<ManufacturingOrder>(`/manufacturing/${id}/split`, {
      split_qty,
      reason,
    });
  }

  async checkAvailability(id: number): Promise<MaterialAvailability> {
    const axiosInstance = apiService.getAxiosInstance();
    const response = await axiosInstance.get<any>(`/manufacturing/${id}/availability`);
    return response.data;
  }

  // BOM
  async getBOMs(params?: {
    product_id?: number;
    active?: boolean;
    search?: string;
  }): Promise<BOM[]> {
    return apiService.get<BOM>('/manufacturing/bom', params);
  }

  async getBOM(id: number): Promise<BOM> {
    return apiService.getById<BOM>('/manufacturing/bom', id);
  }

  async createBOM(data: Partial<BOM>): Promise<BOM> {
    return apiService.create<BOM>('/manufacturing/bom', data);
  }

  async updateBOM(id: number, data: Partial<BOM>): Promise<BOM> {
    return apiService.update<BOM>('/manufacturing/bom', id, data);
  }

  async deleteBOM(id: number): Promise<void> {
    return apiService.delete('/manufacturing/bom', id);
  }

  // BOM Lines
  async getBOMLines(bom_id: number): Promise<BOMLine[]> {
    return apiService.get<BOMLine>(`/manufacturing/bom/${bom_id}/lines`);
  }

  async addBOMLine(bom_id: number, data: Partial<BOMLine>): Promise<BOMLine> {
    return apiService.create<BOMLine>(`/manufacturing/bom/${bom_id}/lines`, data);
  }

  async updateBOMLine(id: number, data: Partial<BOMLine>): Promise<BOMLine> {
    return apiService.update<BOMLine>('/manufacturing/bom/lines', id, data);
  }

  async deleteBOMLine(id: number): Promise<void> {
    return apiService.delete('/manufacturing/bom/lines', id);
  }

  // Routing
  async getRoutings(params?: { active?: boolean; search?: string }): Promise<Routing[]> {
    return apiService.get<Routing>('/manufacturing/routing', params);
  }

  async getRouting(id: number): Promise<Routing> {
    return apiService.getById<Routing>('/manufacturing/routing', id);
  }

  async createRouting(data: Partial<Routing>): Promise<Routing> {
    return apiService.create<Routing>('/manufacturing/routing', data);
  }

  async updateRouting(id: number, data: Partial<Routing>): Promise<Routing> {
    return apiService.update<Routing>('/manufacturing/routing', id, data);
  }

  async deleteRouting(id: number): Promise<void> {
    return apiService.delete('/manufacturing/routing', id);
  }

  // Routing Operations
  async getRoutingOperations(routing_id: number): Promise<RoutingOperation[]> {
    return apiService.get<RoutingOperation>(`/manufacturing/routing/${routing_id}/operations`);
  }

  async addRoutingOperation(
    routing_id: number,
    data: Partial<RoutingOperation>
  ): Promise<RoutingOperation> {
    return apiService.create<RoutingOperation>(
      `/manufacturing/routing/${routing_id}/operations`,
      data
    );
  }

  async updateRoutingOperation(id: number, data: Partial<RoutingOperation>): Promise<RoutingOperation> {
    return apiService.update<RoutingOperation>('/manufacturing/routing/operations', id, data);
  }

  async deleteRoutingOperation(id: number): Promise<void> {
    return apiService.delete('/manufacturing/routing/operations', id);
  }

  // Work Centers
  async getWorkCenters(params?: { active?: boolean; search?: string }): Promise<WorkCenter[]> {
    return apiService.get<WorkCenter>('/manufacturing/routing/workcenters', params);
  }

  async getWorkCenter(id: number): Promise<WorkCenter> {
    return apiService.getById<WorkCenter>('/manufacturing/routing/workcenters', id);
  }

  async createWorkCenter(data: Partial<WorkCenter>): Promise<WorkCenter> {
    return apiService.create<WorkCenter>('/manufacturing/routing/workcenters', data);
  }

  async updateWorkCenter(id: number, data: Partial<WorkCenter>): Promise<WorkCenter> {
    return apiService.update<WorkCenter>('/manufacturing/routing/workcenters', id, data);
  }

  async deleteWorkCenter(id: number): Promise<void> {
    return apiService.delete('/manufacturing/routing/workcenters', id);
  }

  // Work Orders
  async getWorkOrders(params?: {
    mo_id?: number;
    state?: string;
    workcenter_id?: number;
    search?: string;
  }): Promise<WorkOrder[]> {
    return apiService.get<WorkOrder>('/manufacturing/work-orders', params);
  }

  async getWorkOrder(id: number): Promise<WorkOrder> {
    return apiService.getById<WorkOrder>('/manufacturing/work-orders', id);
  }

  async updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<WorkOrder> {
    return apiService.update<WorkOrder>('/manufacturing/work-orders', id, data);
  }

  // Shop Floor Operations
  async startWorkOrder(id: number, operator_id?: number): Promise<WorkOrder> {
    return apiService.create<WorkOrder>(`/manufacturing/work-orders/${id}/start`, {
      operator_id,
    });
  }

  async pauseWorkOrder(
    id: number,
    operator_id?: number,
    downtime_reason?: string,
    downtime_duration?: number
  ): Promise<WorkOrder> {
    return apiService.create<WorkOrder>(`/manufacturing/work-orders/${id}/pause`, {
      operator_id,
      downtime_reason,
      downtime_duration,
    });
  }

  async resumeWorkOrder(id: number, operator_id?: number): Promise<WorkOrder> {
    return apiService.create<WorkOrder>(`/manufacturing/work-orders/${id}/resume`, {
      operator_id,
    });
  }

  async completeWorkOrder(
    id: number,
    operator_id?: number,
    qty_produced?: number,
    qty_scrapped?: number
  ): Promise<WorkOrder> {
    return apiService.create<WorkOrder>(`/manufacturing/work-orders/${id}/complete`, {
      operator_id,
      qty_produced,
      qty_scrapped,
    });
  }

  async recordScrap(
    id: number,
    operator_id: number,
    qty_scrapped: number,
    reason?: string
  ): Promise<void> {
    return apiService.create<void>(`/manufacturing/work-orders/${id}/scrap`, {
      operator_id,
      qty_scrapped,
      reason,
    });
  }

  async getShopFloorDashboard(workcenter_id?: number): Promise<any> {
    return apiService.get<any>('/manufacturing/work-orders/shop-floor/dashboard', {
      workcenter_id,
    });
  }

  // Quality Inspections
  async getQualityInspections(params?: {
    mo_id?: number;
    workorder_id?: number;
    inspection_type?: string;
    state?: string;
    search?: string;
  }): Promise<QualityInspection[]> {
    return apiService.get<QualityInspection>('/manufacturing/quality', params);
  }

  async getQualityInspection(id: number): Promise<QualityInspection> {
    return apiService.getById<QualityInspection>('/manufacturing/quality', id);
  }

  async createQualityInspection(data: Partial<QualityInspection>): Promise<QualityInspection> {
    return apiService.create<QualityInspection>('/manufacturing/quality', data);
  }

  async updateQualityInspection(
    id: number,
    data: Partial<QualityInspection>
  ): Promise<QualityInspection> {
    return apiService.update<QualityInspection>('/manufacturing/quality', id, data);
  }

  async completeInspection(
    id: number,
    qty_passed: number,
    qty_failed: number,
    checklist_results?: Partial<QualityChecklistItem>[]
  ): Promise<QualityInspection> {
    return apiService.create<QualityInspection>(`/manufacturing/quality/${id}/complete`, {
      qty_passed,
      qty_failed,
      checklist_results,
    });
  }

  // Quality Checklist
  async addChecklistItem(
    inspection_id: number,
    data: Partial<QualityChecklistItem>
  ): Promise<QualityChecklistItem> {
    return apiService.create<QualityChecklistItem>(
      `/manufacturing/quality/${inspection_id}/checklist`,
      data
    );
  }

  async updateChecklistItem(
    id: number,
    data: Partial<QualityChecklistItem>
  ): Promise<QualityChecklistItem> {
    return apiService.update<QualityChecklistItem>('/manufacturing/quality/checklist', id, data);
  }

  // Non-Conformance Reports
  async getNCRs(params?: {
    mo_id?: number;
    state?: string;
    severity?: string;
    search?: string;
  }): Promise<NonConformance[]> {
    return apiService.get<NonConformance>('/manufacturing/quality/ncr', params);
  }

  async getNCR(id: number): Promise<NonConformance> {
    return apiService.getById<NonConformance>('/manufacturing/quality/ncr', id);
  }

  async updateNCR(id: number, data: Partial<NonConformance>): Promise<NonConformance> {
    return apiService.update<NonConformance>('/manufacturing/quality/ncr', id, data);
  }

  // Rework Orders
  async getReworkOrders(params?: {
    mo_id?: number;
    ncr_id?: number;
    state?: string;
  }): Promise<ReworkOrder[]> {
    return apiService.get<ReworkOrder>('/manufacturing/quality/rework', params);
  }

  async createReworkOrder(ncr_id: number, data: Partial<ReworkOrder>): Promise<ReworkOrder> {
    return apiService.create<ReworkOrder>(`/manufacturing/quality/ncr/${ncr_id}/rework`, data);
  }

  // Costing
  async getCosting(mo_id: number): Promise<{ costs: Costing[]; totals: any; variance_percent: number }> {
    const axiosInstance = apiService.getAxiosInstance();
    const response = await axiosInstance.get<any>(`/manufacturing/costing/${mo_id}`);
    return response.data;
  }

  async calculateCosting(mo_id: number): Promise<{ message: string; total_cost: number }> {
    return apiService.create<any>(`/manufacturing/costing/${mo_id}/calculate`, {});
  }

  async getCostingAnalytics(params?: {
    date_from?: string;
    date_to?: string;
    product_id?: number;
  }): Promise<any> {
    return apiService.get<any>('/manufacturing/costing/analytics/summary', params);
  }

  async getOEETracking(params?: {
    workcenter_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<any> {
    return apiService.get<any>('/manufacturing/costing/oee/tracking', params);
  }

  async getKPISummary(mo_id: number): Promise<any[]> {
    const axiosInstance = apiService.getAxiosInstance();
    const response = await axiosInstance.get<any>(`/manufacturing/costing/kpi/${mo_id}`);
    return response.data;
  }
}

export const manufacturingService = new ManufacturingService();

