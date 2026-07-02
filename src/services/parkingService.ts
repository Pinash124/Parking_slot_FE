import api from './api';
import type {
  PageResponse,
  DashboardOverviewResponse,
  RevenueTrendResponse,
  ReservationCreateRequest,
  ReservationResponse,
  SessionCheckInRequest,
  ParkingSessionResponse,
  PaymentCheckoutPrepareRequest,
  PaymentCheckoutResponse,
  PaymentExitValidationRequest,
  PaymentExitValidationResponse,
  PaymentGatewayRequest,
  PaymentGatewayResponse,
  PaymentGatewayConfirmRequest,
  TransactionHistoryResponse,
  TransactionHistorySummaryResponse,
} from '../types/parking';

export const parkingService = {
  // 1. Dashboard Overview
  getOverview: async (): Promise<DashboardOverviewResponse> => {
    const response = await api.get<DashboardOverviewResponse>('/api/dashboard/overview');
    return response.data;
  },

  getDailyRevenueTrend: async (days = 14): Promise<RevenueTrendResponse> => {
    const response = await api.get<RevenueTrendResponse>('/api/dashboard/revenue/daily', {
      params: { days }
    });
    return response.data;
  },

  getMonthlyRevenueTrend: async (months = 12): Promise<RevenueTrendResponse> => {
    const response = await api.get<RevenueTrendResponse>('/api/dashboard/revenue/monthly', {
      params: { months }
    });
    return response.data;
  },

  // 2. Reservations
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

  createReservation: async (payload: ReservationCreateRequest): Promise<ReservationResponse> => {
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

  // 3. Parking Sessions
  getSessionById: async (id: number): Promise<ParkingSessionResponse> => {
    const response = await api.get<ParkingSessionResponse>(`/api/parking-sessions/${id}`);
    return response.data;
  },

  checkIn: async (payload: SessionCheckInRequest): Promise<ParkingSessionResponse> => {
    const response = await api.post<ParkingSessionResponse>('/api/parking-sessions/check-in', payload);
    return response.data;
  },

  checkout: async (id: number): Promise<ParkingSessionResponse> => {
    const response = await api.post<ParkingSessionResponse>(`/api/parking-sessions/${id}/checkout`);
    return response.data;
  },

  // 4. Payment Checkout & Exit Barrier
  prepareCheckout: async (payload: PaymentCheckoutPrepareRequest): Promise<PaymentCheckoutResponse> => {
    const response = await api.post<PaymentCheckoutResponse>('/api/payment-checkout/prepare', payload);
    return response.data;
  },

  validateExit: async (payload: PaymentExitValidationRequest): Promise<PaymentExitValidationResponse> => {
    const response = await api.post<PaymentExitValidationResponse>('/api/payment-checkout/validate-exit', payload);
    return response.data;
  },

  // 5. Payment Gateways
  payCash: async (payload: PaymentGatewayRequest): Promise<PaymentGatewayResponse> => {
    const response = await api.post<PaymentGatewayResponse>('/api/payment-gateways/cash', payload);
    return response.data;
  },

  payMomo: async (payload: PaymentGatewayRequest): Promise<PaymentGatewayResponse> => {
    const response = await api.post<PaymentGatewayResponse>('/api/payment-gateways/momo', payload);
    return response.data;
  },

  payVnpay: async (payload: PaymentGatewayRequest): Promise<PaymentGatewayResponse> => {
    const response = await api.post<PaymentGatewayResponse>('/api/payment-gateways/vnpay', payload);
    return response.data;
  },

  confirmPayment: async (gateway: 'cash' | 'momo' | 'vnpay', payload: PaymentGatewayConfirmRequest): Promise<any> => {
    const response = await api.post<any>(`/api/payment-gateways/${gateway}/confirm`, payload);
    return response.data;
  },

  // 6. Transaction History
  searchTransactions: async (params?: {
    keyword?: string;
    status?: string;
    paymentMethod?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<TransactionHistoryResponse>> => {
    const response = await api.get<PageResponse<TransactionHistoryResponse>>('/api/transaction-history', { params });
    return response.data;
  },

  getTransactionSummary: async (): Promise<TransactionHistorySummaryResponse> => {
    const response = await api.get<TransactionHistorySummaryResponse>('/api/transaction-history/summary');
    return response.data;
  },

  getRecentTransactions: async (): Promise<TransactionHistoryResponse[]> => {
    const response = await api.get<TransactionHistoryResponse[]>('/api/transaction-history/recent');
    return response.data;
  }
};
