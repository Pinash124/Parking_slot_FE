import api from './api';
import type {
  ParkingSession,
  DashboardOverviewResponse
} from '../types/parking';

export const parkingService = {
  // 1. Dashboard Overview
  getOverviewReport: async (): Promise<DashboardOverviewResponse> => {
    const response = await api.get<DashboardOverviewResponse>('/api/dashboard/overview');
    return response.data;
  },

  // 2. Parking Sessions
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
  }
};
