import api from './api';
import type {
  ParkingSession,
  DashboardOverviewResponse,
  ManagerReportResponse,
  BuildingView,
  BuildingRequest,
  FloorView,
  FloorRequest,
  VehicleTypeView,
  VehicleView,
  VehicleTypeRequest,
  ZoneView,
  ZoneRequest,
  SlotView,
  SlotRequest,
  SlotStatusUpdateRequest,
  PricingView,
  PricingRequest,
  PricingRuleSettings,
  FeedbackResponse,
  IncidentRequest,
  IncidentResponse,
  ParkingSessionResponse,
  FloorOccupancyResponse,
  SessionCheckInRequest,
  SessionCheckoutRequest,
  SystemOperationalStatusResponse,
  BackupResponse,
  RecoveryStatusResponse,
  AuditLogResponse,
  ReservationResponse,
  PageResponse,
  PaymentGatewayRequest,
  PaymentGatewayResponse,
  ParkingFacilityInfoResponse,
} from '../types/parking';

const toAbsoluteAssetUrl = (url?: string | null) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${api.defaults.baseURL || 'http://localhost:8080'}${url}`;
};

export const parkingService = {
  // ========== DASHBOARD ==========
  getOverviewReport: async (): Promise<DashboardOverviewResponse> => {
    const response = await api.get<DashboardOverviewResponse>('/api/dashboard/overview');
    return response.data;
  },

  getManagerReport: async (params?: { from?: string; to?: string }): Promise<ManagerReportResponse> => {
    const response = await api.get<ManagerReportResponse>('/api/manager/reports', { params });
    return response.data;
  },

  // ========== PARKING SESSIONS (legacy - used by old pages) ==========
  getAllSessions: async (): Promise<ParkingSession[]> => {
    const response = await api.get<ParkingSession[]>('/api/parking-sessions');
    return response.data;
  },

  getSessionById: async (id: number): Promise<ParkingSession> => {
    const response = await api.get<ParkingSession>(`/api/parking-sessions/${id}`);
    return response.data;
  },

  getSessionsByStatus: async (status: string): Promise<ParkingSession[]> => {
    const response = await api.get<ParkingSession[]>(`/api/parking-sessions/status/${status}`);
    return response.data;
  },

  checkIn: async (payload: Partial<ParkingSession>): Promise<ParkingSession> => {
    const response = await api.post<ParkingSession>('/api/parking-sessions/check-in', payload);
    return response.data;
  },

  checkOut: async (id: number, payload?: { lostTicket?: boolean; overtimeMinutes?: number }): Promise<ParkingSession> => {
    const response = await api.post<ParkingSession>(`/api/parking-sessions/${id}/checkout`, payload || {});
    return response.data;
  },

  // ========== STAFF PARKING SESSIONS (new endpoint) ==========
  staffGetSessionById: async (id: number): Promise<ParkingSessionResponse> => {
    const response = await api.get<ParkingSessionResponse>(`/api/staff/parking-sessions/${id}`);
    return response.data;
  },

  staffCheckIn: async (entryGateCode: string, payload: SessionCheckInRequest): Promise<ParkingSessionResponse> => {
    const response = await api.post<ParkingSessionResponse>(
      `/api/staff/parking-sessions/check-in?entryGateCode=${encodeURIComponent(entryGateCode)}`,
      payload
    );
    return response.data;
  },

  staffCheckout: async (id: number, payload?: SessionCheckoutRequest): Promise<ParkingSessionResponse> => {
    const response = await api.post<ParkingSessionResponse>(
      `/api/staff/parking-sessions/${id}/checkout`,
      payload || {}
    );
    return response.data;
  },

  staffCompleteExit: async (id: number, exitGateCode: string): Promise<ParkingSessionResponse> => {
    const response = await api.post<ParkingSessionResponse>(
      `/api/staff/parking-sessions/${id}/complete-exit?exitGateCode=${encodeURIComponent(exitGateCode)}`
    );
    return response.data;
  },

  staffGetSessions: async (status?: string): Promise<ParkingSessionResponse[]> => {
    const response = await api.get<ParkingSessionResponse[]>('/api/staff/parking-sessions', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  staffLookupSession: async (query: string): Promise<ParkingSessionResponse> => {
    const response = await api.get<ParkingSessionResponse>('/api/staff/parking-sessions/lookup', {
      params: { query },
    });
    return response.data;
  },

  staffGetFloorOccupancy: async (): Promise<FloorOccupancyResponse[]> => {
    const response = await api.get<FloorOccupancyResponse[]>('/api/staff/parking-sessions/floor-occupancy');
    return response.data;
  },

  // ========== PAYMENT GATEWAYS ==========
  createVnpayPayment: async (payload: PaymentGatewayRequest): Promise<PaymentGatewayResponse> => {
    const response = await api.post<PaymentGatewayResponse>('/api/payment-gateways/vnpay', payload);
    return response.data;
  },

  createCashPayment: async (payload: PaymentGatewayRequest): Promise<PaymentGatewayResponse> => {
    const response = await api.post<PaymentGatewayResponse>('/api/payment-gateways/cash', payload);
    return response.data;
  },

  createPersonalQrPayment: async (payload: PaymentGatewayRequest): Promise<PaymentGatewayResponse> => {
    const response = await api.post<PaymentGatewayResponse>('/api/payment-gateways/personal-qr', payload);
    return {
      ...response.data,
      qrImageUrl: toAbsoluteAssetUrl(response.data.qrImageUrl || '/payment/vnpay-personal-qr.png'),
    };
  },

  getPaymentCheckoutStatus: async (sessionId: number): Promise<any> => {
    const response = await api.get(`/api/payment-checkout/sessions/${sessionId}/status`);
    return response.data;
  },

  confirmManualPayment: async (paymentId: number, payload: { gateway?: string; referenceCode?: string }): Promise<any> => {
    const response = await api.patch(`/api/payments/${paymentId}/status`, {
      status: 'COMPLETED',
      gateway: payload.gateway || 'PERSONAL_QR',
      referenceCode: payload.referenceCode,
    });
    return response.data;
  },

  // ========== RESERVATIONS ==========
  searchReservations: async (params?: {
    userId?: number;
    vehicleId?: number;
    zoneId?: number;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<ReservationResponse>> => {
    const response = await api.get<PageResponse<ReservationResponse>>('/api/reservations', { params });
    return response.data;
  },

  getReservationsList: async (): Promise<ReservationResponse[]> => {
    const response = await api.get<any>('/api/reservations');
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.content)) {
      return response.data.content;
    }
    return [];
  },

  getReservationById: async (id: number): Promise<ReservationResponse> => {
    const response = await api.get<ReservationResponse>(`/api/reservations/${id}`);
    return response.data;
  },

  createReservation: async (payload: {
    userId?: number;
    vehicleId: number;
    zoneId: number;
    slotId?: number;
    startTime: string;
    endTime: string;
  }): Promise<ReservationResponse> => {
    const response = await api.post<ReservationResponse>('/api/reservations', payload);
    return response.data;
  },

  approveReservation: async (id: number): Promise<ReservationResponse> => {
    const response = await api.patch<ReservationResponse>(`/api/reservations/${id}/approve`);
    return response.data;
  },

  cancelReservation: async (id: number): Promise<ReservationResponse> => {
    const response = await api.patch<ReservationResponse>(`/api/reservations/${id}/cancel`);
    return response.data;
  },

  // ========== MANAGER - BUILDINGS ==========
  getBuildings: async (): Promise<BuildingView[]> => {
    const response = await api.get<BuildingView[]>('/api/manager/buildings');
    return response.data;
  },

  createBuilding: async (payload: BuildingRequest): Promise<BuildingView> => {
    const response = await api.post<BuildingView>('/api/manager/buildings', payload);
    return response.data;
  },

  updateBuilding: async (id: number, payload: BuildingRequest): Promise<BuildingView> => {
    const response = await api.put<BuildingView>(`/api/manager/buildings/${id}`, payload);
    return response.data;
  },

  deleteBuilding: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/buildings/${id}`);
  },

  // ========== MANAGER - FLOORS ==========
  getFloors: async (buildingId?: number): Promise<FloorView[]> => {
    const response = await api.get<FloorView[]>('/api/manager/floors', {
      params: buildingId ? { buildingId } : undefined,
    });
    return response.data;
  },

  createFloor: async (payload: FloorRequest): Promise<FloorView> => {
    const response = await api.post<FloorView>('/api/manager/floors', payload);
    return response.data;
  },

  updateFloor: async (id: number, payload: FloorRequest): Promise<FloorView> => {
    const response = await api.put<FloorView>(`/api/manager/floors/${id}`, payload);
    return response.data;
  },

  deleteFloor: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/floors/${id}`);
  },

  // ========== MANAGER - ZONES ==========
  getZones: async (floorId?: number): Promise<ZoneView[]> => {
    const response = await api.get<ZoneView[]>('/api/manager/zones', {
      params: floorId ? { floorId } : undefined,
    });
    return response.data;
  },

  getManagementZones: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/api/management/zones');
    return response.data;
  },

  getManagementSlots: async (status?: string): Promise<SlotView[]> => {
    const response = await api.get<SlotView[]>('/api/management/slots', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  getReservationsByKeyword: async (keyword: string): Promise<ReservationResponse[]> => {
    const response = await api.get<any>('/api/reservations', {
      params: { keyword }
    });
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.content)) {
      return response.data.content;
    }
    return [];
  },

  createZone: async (payload: ZoneRequest): Promise<ZoneView> => {
    const response = await api.post<ZoneView>('/api/manager/zones', payload);
    return response.data;
  },

  updateZone: async (id: number, payload: ZoneRequest): Promise<ZoneView> => {
    const response = await api.put<ZoneView>(`/api/manager/zones/${id}`, payload);
    return response.data;
  },

  deleteZone: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/zones/${id}`);
  },

  // ========== MANAGER - SLOTS ==========
  getSlots: async (zoneId?: number): Promise<SlotView[]> => {
    const response = await api.get<SlotView[]>('/api/manager/slots', {
      params: zoneId ? { zoneId } : undefined,
    });
    return response.data;
  },

  createSlot: async (payload: SlotRequest): Promise<SlotView> => {
    const response = await api.post<SlotView>('/api/manager/slots', payload);
    return response.data;
  },

  updateSlot: async (id: number, payload: SlotRequest): Promise<SlotView> => {
    const response = await api.put<SlotView>(`/api/manager/slots/${id}`, payload);
    return response.data;
  },

  updateSlotStatus: async (id: number, payload: SlotStatusUpdateRequest): Promise<SlotView> => {
    try {
      const response = await api.patch<SlotView>(`/api/manager/slots/${id}/status?status=${encodeURIComponent(payload.status)}`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 405) {
        const fallback = await api.put<SlotView>(`/api/manager/slots/${id}/status`, payload);
        return fallback.data;
      }
      throw error;
    }
  },

  deleteSlot: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/slots/${id}`);
  },

  // ========== MANAGER - PRICING POLICIES ==========
  getPricingPolicies: async (): Promise<PricingView[]> => {
    const response = await api.get<PricingView[]>('/api/manager/pricing-policies');
    return response.data;
  },

  createPricingPolicy: async (payload: PricingRequest): Promise<PricingView> => {
    const response = await api.post<PricingView>('/api/manager/pricing-policies', payload);
    return response.data;
  },

  updatePricingPolicy: async (id: number, payload: PricingRequest): Promise<PricingView> => {
    const response = await api.put<PricingView>(`/api/manager/pricing-policies/${id}`, payload);
    return response.data;
  },

  deletePricingPolicy: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/pricing-policies/${id}`);
  },

  getPricingRules: async (): Promise<PricingRuleSettings> => {
    const response = await api.get<PricingRuleSettings>('/api/manager/pricing-rules');
    return response.data;
  },

  updatePricingRules: async (payload: PricingRuleSettings): Promise<PricingRuleSettings> => {
    const response = await api.put<PricingRuleSettings>('/api/manager/pricing-rules', payload);
    return response.data;
  },

  // ========== MANAGER - VEHICLE TYPES ==========
  getVehicleTypes: async (): Promise<VehicleTypeView[]> => {
    const response = await api.get<VehicleTypeView[]>('/api/manager/vehicle-types');
    return response.data;
  },

  createVehicleType: async (payload: VehicleTypeRequest): Promise<VehicleTypeView> => {
    const response = await api.post<VehicleTypeView>('/api/manager/vehicle-types', payload);
    return response.data;
  },

  updateVehicleType: async (id: number, payload: VehicleTypeRequest): Promise<VehicleTypeView> => {
    const response = await api.put<VehicleTypeView>(`/api/manager/vehicle-types/${id}`, payload);
    return response.data;
  },

  // ========== FEEDBACK ==========
  submitFeedback: async (payload: { sessionId?: number; category?: string; feedbackType?: string; rating?: number; content: string }): Promise<FeedbackResponse> => {
    const { category, feedbackType, ...rest } = payload;
    const response = await api.post<FeedbackResponse>('/api/feedback', {
      ...rest,
      feedbackType: feedbackType || category || 'OTHER',
    });
    return response.data;
  },

  getAllFeedbacks: async (): Promise<FeedbackResponse[]> => {
    const response = await api.get<FeedbackResponse[]>('/api/feedback');
    return response.data;
  },

  getMyFeedbacks: async (): Promise<FeedbackResponse[]> => {
    const response = await api.get<FeedbackResponse[]>('/api/feedback/my');
    return response.data;
  },

  getFeedbacksBySession: async (sessionId: number): Promise<FeedbackResponse[]> => {
    const response = await api.get<FeedbackResponse[]>(`/api/feedback/session/${sessionId}`);
    return response.data;
  },

  // ========== INCIDENTS ==========
  getIncidents: async (status?: string): Promise<IncidentResponse[]> => {
    const response = await api.get<IncidentResponse[]>('/api/staff/incidents', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  createIncident: async (payload: IncidentRequest): Promise<IncidentResponse> => {
    const response = await api.post<IncidentResponse>('/api/staff/incidents', payload);
    return response.data;
  },

  resolveIncident: async (id: number): Promise<IncidentResponse> => {
    const response = await api.patch<IncidentResponse>(`/api/staff/incidents/${id}/resolve`);
    return response.data;
  },

  // ========== SYSTEM OPERATIONS ==========
  getSystemOperations: async (): Promise<SystemOperationalStatusResponse> => {
    const response = await api.get<SystemOperationalStatusResponse>('/api/system/operations');
    return response.data;
  },

  getRecoveryStatus: async (): Promise<RecoveryStatusResponse> => {
    const response = await api.get<RecoveryStatusResponse>('/api/system/recovery');
    return response.data;
  },

  getLatestBackup: async (): Promise<BackupResponse> => {
    const response = await api.get<BackupResponse>('/api/system/backups/latest');
    return response.data;
  },

  createBackup: async (): Promise<BackupResponse> => {
    const response = await api.post<BackupResponse>('/api/system/backups');
    return response.data;
  },

  // ========== AUDIT LOGS ==========
  getAuditLogs: async (): Promise<AuditLogResponse[]> => {
    const response = await api.get<AuditLogResponse[]>('/api/audit-logs');
    return response.data;
  },

  // ========== STAFF CHECK-OUT NEW ENDPOINTS ==========
  prepareCheckout: async (payload: { licensePlate: string }): Promise<any> => {
    const response = await api.post<any>('/api/payment-checkout/prepare', payload);
    return response.data;
  },

  confirmCashPayment: async (payload: { sessionId: number; amount: number }): Promise<any> => {
    const response = await api.post<any>('/api/payment-gateways/cash', payload);
    return response.data;
  },

  validateExit: async (payload: { licensePlate: string }): Promise<any> => {
    const response = await api.post<any>('/api/payment-checkout/validate-exit', payload);
    return response.data;
  },

  // ========== ADMIN - DASHBOARD OVERVIEW & INFRASTRUCTURE CRUD ==========
  getAdminDashboardOverview: async (): Promise<{
    totalActiveSessions: number;
    occupiedSlots: number;
    reservedSlots: number;
    availableSlots: number;
    todayRevenue: number;
    pendingPaymentsCount: number;
  }> => {
    const response = await api.get<any>('/api/dashboard/overview');
    return response.data;
  },

  getManagementBuildings: async (): Promise<BuildingView[]> => {
    const response = await api.get<BuildingView[]>('/api/manager/buildings');
    return response.data;
  },

  createManagementBuilding: async (payload: BuildingRequest): Promise<BuildingView> => {
    const response = await api.post<BuildingView>('/api/manager/buildings', payload);
    return response.data;
  },

  deleteManagementBuilding: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/buildings/${id}`);
  },

  getManagementFloors: async (buildingId?: number): Promise<FloorView[]> => {
    const response = await api.get<FloorView[]>('/api/manager/floors', {
      params: buildingId ? { buildingId } : undefined,
    });
    return response.data;
  },

  createManagementFloor: async (payload: FloorRequest): Promise<FloorView> => {
    const response = await api.post<FloorView>('/api/manager/floors', payload);
    return response.data;
  },

  deleteManagementFloor: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/floors/${id}`);
  },

  getManagementZonesAllowed: async (): Promise<ZoneView[]> => {
    const response = await api.get<ZoneView[]>('/api/manager/zones');
    return response.data;
  },

  createManagementZone: async (payload: ZoneRequest): Promise<ZoneView> => {
    const response = await api.post<ZoneView>('/api/manager/zones', payload);
    return response.data;
  },

  deleteManagementZone: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/zones/${id}`);
  },

  getManagementSlotsList: async (): Promise<SlotView[]> => {
    const response = await api.get<SlotView[]>('/api/manager/slots');
    return response.data;
  },

  patchManagementSlotStatus: async (id: number, status: string): Promise<SlotView> => {
    try {
      const response = await api.patch<SlotView>(`/api/manager/slots/${id}/status?status=${encodeURIComponent(status)}`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 405) {
        const fallback = await api.put<SlotView>(`/api/manager/slots/${id}/status`, { status });
        return fallback.data;
      }
      throw error;
    }
  },

  // ========== ADMIN - PRICING POLICIES NEW ENDPOINTS ==========
  getManagementPolicies: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/api/manager/pricing-policies');
    return response.data;
  },

  createManagementPolicy: async (payload: any): Promise<any> => {
    const response = await api.post<any>('/api/manager/pricing-policies', payload);
    return response.data;
  },

  deleteManagementPolicy: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/pricing-policies/${id}`);
  },

  // ========== VEHICLES (ALL REGISTERED) ==========
  getManagementVehicles: async (): Promise<VehicleView[]> => {
    const response = await api.get<VehicleView[]>('/api/manager/vehicles');
    return response.data;
  },

  deleteVehicleType: async (id: number): Promise<void> => {
    await api.delete(`/api/manager/vehicle-types/${id}`);
  },

  // ========== PUBLIC PARKING FACILITY INFO ==========
  getFacilityInfo: async (): Promise<ParkingFacilityInfoResponse> => {
    const response = await api.get<ParkingFacilityInfoResponse>('/api/parking-info');
    return response.data;
  },

  // ========== MANAGER - MONTHLY PASSES ==========
  getManagerMonthlyPasses: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/api/manager/monthly-passes');
    return response.data;
  },

  confirmManagerMonthlyPassPayment: async (id: number, payload?: { paymentMethod: string; referenceCode: string }): Promise<any> => {
    const response = await api.post<any>(`/api/manager/monthly-passes/${id}/confirm-payment`, payload || {});
    return response.data;
  },

  confirmManagerMonthlyPassPaymentByQr: async (payload: { qrContent: string; paymentMethod: string; referenceCode: string }): Promise<any> => {
    const response = await api.post<any>('/api/manager/monthly-passes/confirm-payment/scan', payload);
    return response.data;
  },

  cancelManagerMonthlyPass: async (id: number): Promise<any> => {
    const response = await api.post<any>(`/api/manager/monthly-passes/${id}/cancel`);
    return response.data;
  },
};

