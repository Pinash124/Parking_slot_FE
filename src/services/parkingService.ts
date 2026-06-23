import api from './api';
import type {
  ParkingSession,
  ManagerOverviewReport,
  ParkingSlot
} from '../types/parking';

export const parkingService = {
  // 1. Dashboard Overview
  getOverviewReport: async (params?: { from?: string; to?: string }): Promise<ManagerOverviewReport> => {
    const response = await api.get<ManagerOverviewReport>('/api/manager/reports/overview', { params });
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

  checkIn: async (payload: ParkingSession): Promise<ParkingSession> => {
    const response = await api.post<ParkingSession>('/api/parking-sessions/check-in', payload);
    return response.data;
  },

  checkOut: async (id: number, exitStaffId: number, exitGateId: number): Promise<ParkingSession> => {
    const response = await api.put<ParkingSession>(`/api/parking-sessions/${id}/check-out`, null, {
      params: {
        exitStaffId,
        exitGateId
      }
    });
    return response.data;
  },

  // 3. Slots Management
  getSlots: async (): Promise<ParkingSlot[]> => {
    const response = await api.get<ParkingSlot[]>('/api/manager/slots');
    return response.data;
  }
};
