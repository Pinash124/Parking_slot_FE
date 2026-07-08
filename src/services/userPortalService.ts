import api from './api';
import type {
  VehicleView,
  VehicleRequest,
  ReservationResponse,
  ReservationCreateRequest,
  CurrentParkingSessionResponse,
  ParkingSessionResponse,
  PageResponse,
  VehicleTypeView,
  PricingView,
  BuildingView,
  FloorView,
  ZoneView,
} from '../types/parking';

export const userPortalService = {
  // ========== VEHICLES ==========
  getMyVehicles: async (): Promise<VehicleView[]> => {
    const response = await api.get<VehicleView[]>('/api/user/vehicles');
    return response.data;
  },

  createVehicle: async (payload: VehicleRequest): Promise<VehicleView> => {
    const response = await api.post<VehicleView>('/api/user/vehicles', payload);
    return response.data;
  },

  updateVehicle: async (id: number, payload: VehicleRequest): Promise<VehicleView> => {
    const response = await api.put<VehicleView>(`/api/user/vehicles/${id}`, payload);
    return response.data;
  },

  deleteVehicle: async (id: number): Promise<void> => {
    await api.delete(`/api/user/vehicles/${id}`);
  },

  // ========== USER PORTAL VEHICLES (NEW) ==========
  getUserPortalVehicles: async (): Promise<VehicleView[]> => {
    const response = await api.get<VehicleView[]>('/api/user/vehicles');
    return response.data;
  },

  createUserPortalVehicle: async (payload: VehicleRequest): Promise<VehicleView> => {
    const response = await api.post<VehicleView>('/api/user/vehicles', payload);
    return response.data;
  },

  deleteUserPortalVehicle: async (id: number): Promise<void> => {
    await api.delete(`/api/user/vehicles/${id}`);
  },

  getVehicleTypes: async (): Promise<VehicleTypeView[]> => {
    const response = await api.get<VehicleTypeView[]>('/api/user/vehicle-types');
    return response.data;
  },

  getPricingPolicies: async (): Promise<PricingView[]> => {
    const response = await api.get<PricingView[]>('/api/user/pricing-policies');
    return response.data;
  },

  // ========== USER GEOGRAPHY PORTAL (NEW) ==========
  getUserBuildings: async (): Promise<BuildingView[]> => {
    const response = await api.get<BuildingView[]>('/api/user/buildings');
    return response.data;
  },

  getUserFloors: async (buildingId?: number): Promise<FloorView[]> => {
    const response = await api.get<FloorView[]>('/api/user/floors', {
      params: buildingId ? { buildingId } : undefined,
    });
    return response.data;
  },

  getUserZones: async (floorId?: number, purpose = 'RESERVATION'): Promise<ZoneView[]> => {
    const response = await api.get<ZoneView[]>('/api/user/zones', {
      params: { floorId, purpose },
    });
    return response.data;
  },

  getAvailableSlots: async (zoneId?: number, vehicleTypeId?: number, purpose = 'PARKING'): Promise<any[]> => {
    const response = await api.get<any[]>('/api/parking-info/available-slots', {
      params: { zoneId, vehicleTypeId, purpose },
    });
    return response.data;
  },

  // ========== RESERVATIONS ==========
  createReservation: async (payload: ReservationCreateRequest): Promise<ReservationResponse> => {
    const response = await api.post<ReservationResponse>('/api/user/reservations', payload);
    return response.data;
  },

  getMyReservations: async (page = 0, size = 20): Promise<PageResponse<ReservationResponse>> => {
    const response = await api.get<PageResponse<ReservationResponse>>('/api/user/reservations', {
      params: { page, size },
    });
    return response.data;
  },

  cancelReservation: async (id: number): Promise<ReservationResponse> => {
    const response = await api.patch<ReservationResponse>(`/api/user/reservations/${id}/cancel`);
    return response.data;
  },

  // ========== PARKING SESSIONS ==========
  getCurrentSession: async (): Promise<CurrentParkingSessionResponse> => {
    const response = await api.get<CurrentParkingSessionResponse>('/api/user/parking-sessions/current');
    return response.data;
  },

  getSessionHistory: async (): Promise<ParkingSessionResponse[]> => {
    const response = await api.get<ParkingSessionResponse[]>('/api/user/parking-sessions/history');
    return response.data;
  },

  addAdditionalService: async (
    sessionId: number,
    payload: { serviceId: number }
  ): Promise<CurrentParkingSessionResponse> => {
    const response = await api.post<CurrentParkingSessionResponse>(
      `/api/user/parking-sessions/${sessionId}/additional-services`,
      payload
    );
    return response.data;
  },

  // ========== USER PORTAL NEW PAYMENTS & SERVICES ==========
  getUserPortalCurrentSession: async (): Promise<CurrentParkingSessionResponse[]> => {
    const response = await api.get<any[]>('/api/user/parking-sessions/current');
    return response.data.map(item => ({
      sessionId: item.session.id,
      ticketCode: item.session.ticketCode,
      status: item.session.status,
      slotCode: item.session.slotCode,
      zoneName: item.session.zoneName,
      vehicleTypeName: item.session.vehicleTypeName,
      licensePlate: item.session.licensePlate,
      entryTime: item.session.entryTime,
      estimatedFee: item.estimatedGrandTotal || (item.temporaryQuote?.totalFee) || 0,
      additionalServices: item.additionalServices?.map((svc: any) => ({
        serviceId: svc.serviceId,
        serviceName: svc.serviceName,
        price: svc.unitPrice || svc.price || 0,
      })) || [],
    }));
  },

  addUserPortalService: async (payload: { sessionId: number; serviceId: number }): Promise<CurrentParkingSessionResponse> => {
    const response = await api.post<CurrentParkingSessionResponse>(
      `/api/user/parking-sessions/${payload.sessionId}/additional-services`,
      { serviceId: payload.serviceId }
    );
    return response.data;
  },

  createPersonalQrPayment: async (payload: { sessionId: number; amount: number }): Promise<{ qrCodeUrl: string; transferDescription: string; amount: number }> => {
    const response = await api.post<any>('/api/payment-gateways/personal-qr', {
      sessionId: payload.sessionId,
      amount: payload.amount,
    });
    const data = response.data;
    const qrImageUrl = data.qrImageUrl || '';
    const absoluteQrUrl = qrImageUrl.startsWith('http') ? qrImageUrl : `${api.defaults.baseURL || 'http://localhost:8080'}${qrImageUrl}`;
    return {
      qrCodeUrl: absoluteQrUrl,
      transferDescription: data.transferContent || data.referenceCode || '',
      amount: data.amount,
    };
  },

  verifyVnpayReturn: async (queryString: string): Promise<{ success: boolean; amount: number; message?: string; transactionId?: string; exitDeadline?: string | null; referenceCode?: string }> => {
    const response = await api.get<any>(`/api/payment-gateways/vnpay/return?${queryString}`);
    const data = response.data;
    const success = data.status === 'COMPLETED' || data.status === 'SUCCESS' || data.payment?.status === 'COMPLETED';
    return {
      success,
      amount: data.amount || 0,
      message: data.message,
      transactionId: data.paymentId?.toString() || data.referenceCode,
      exitDeadline: data.exitDeadline,
      referenceCode: data.referenceCode,
    };
  },

  // ========== MONTHLY PASSES ==========
  monthlyPasses: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/api/user/monthly-passes');
    return response.data;
  },

  registerMonthlyPass: async (payload: { vehicleId: number; slotId: number; startDate: string; months: number; note: string }) => {
    const response = await api.post<any>('/api/user/monthly-passes', payload);
    return response.data;
  },

  prepareMonthlyPassOnlinePayment: async (id: number): Promise<any> => {
    const response = await api.post<any>(`/api/user/monthly-passes/${id}/payment/online-qr`);
    return response.data;
  },

  prepareMonthlyPassVnpayPayment: async (id: number): Promise<{ paymentUrl: string }> => {
    const response = await api.post<any>(`/api/user/monthly-passes/${id}/payment/vnpay`);
    return response.data;
  },
};

