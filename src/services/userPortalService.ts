import api from './api';
import type {
  VehicleView,
  VehicleRequest,
  ReservationResponse,
  ReservationCreateRequest,
  CurrentParkingSessionResponse,
  ParkingSessionResponse,
  PageResponse,
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
};
