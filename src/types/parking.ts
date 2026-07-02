// Generic Page Response wrapper from Spring Page
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
}

// Authentication DTOs
export interface AuthLoginRequest {
  email: string;
  password?: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string; // LocalDateTime as string
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

export interface AuthRegistrationRequest {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  username?: string;
}

export interface AuthRegistrationResponse {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  role: string;
  message: string;
}

export interface AuthLogoutResponse {
  success: boolean;
  message: string;
}

// Dashboard DTOs
export interface DashboardOverviewResponse {
  totalReservations: number;
  pendingReservations: number;
  approvedReservations: number;
  activeSessions: number;
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  pendingPayments: number;
  completedPayments: number;
  todayRevenue: number;
  monthRevenue: number;
  totalTransactions: number;
}

export interface RevenueTrendPoint {
  key: string;
  label: string;
  revenue: number;
  payments: number;
}

export interface RevenueTrendResponse {
  period: 'DAILY' | 'MONTHLY' | string;
  startDate: string;
  endDate: string;
  points: RevenueTrendPoint[];
}

// Reservation DTOs
export interface ReservationCreateRequest {
  userId: number;
  vehicleId: number;
  zoneId: number;
  startTime: string; // ISO LocalDateTime format
  endTime: string;   // ISO LocalDateTime format
}

export interface ReservationResponse {
  id: number;
  reservationCode: string;
  userId: number;
  userFullName: string;
  vehicleId: number;
  licensePlate: string;
  zoneId: number;
  zoneName: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  createdAt: string;
}

// Parking Session DTOs
export interface SessionCheckInRequest {
  reservationId?: number | null;
  vehicleId: number;
  slotId: number;
  ticketCode: string;
  entryTime: string; // ISO LocalDateTime format
}

export interface ParkingSessionResponse {
  id: number;
  ticketCode: string;
  reservationId?: number | null;
  vehicleId: number;
  licensePlate: string;
  slotId: number;
  slotNumber: string;
  entryTime: string;
  exitTime?: string | null;
  parkingFee?: number | null;
  penaltyFee?: number | null;
  totalFee?: number | null;
  status: 'ACTIVE' | 'CHECKED_OUT' | 'CANCELLED';
}

// Checkout & Barrier DTOs
export interface PaymentCheckoutPrepareRequest {
  licensePlate: string;
  exitTime: string;
  lostTicket: boolean;
  overtimeMinutes?: number | null;
}

export interface PaymentCheckoutResponse {
  sessionId: number;
  licensePlate: string;
  entryTime: string;
  exitTime: string;
  parkingFee: number;
  penaltyFee: number;
  totalFee: number;
  sessionStatus: string;
  paymentId?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  paid: boolean;
  paidAt?: string | null;
  exitDeadline?: string | null;
  exitWindowMinutes: number;
}

export interface PaymentExitValidationRequest {
  licensePlate: string;
  detectedAt: string;
}

export interface PaymentExitValidationResponse {
  sessionId: number;
  licensePlate: string;
  paymentId?: number | null;
  paymentStatus?: string | null;
  paidAt?: string | null;
  exitDeadline?: string | null;
  remainingSeconds: number;
  openBarrier: boolean;
  decision: 'OPEN_PAYMENT_VERIFIED' | 'DENY_PAYMENT_REQUIRED' | 'DENY_EXIT_WINDOW_EXPIRED';
}

// Payment Gateway DTOs
export interface PaymentGatewayRequest {
  sessionId: number;
  amount: number;
  returnUrl: string;
  orderInfo: string;
}

export interface PaymentGatewayResponse {
  paymentId: number;
  referenceCode: string;
  paymentUrl: string;
  qrContent: string;
  status: string;
  amount: number;
}

export interface PaymentGatewayConfirmRequest {
  referenceCode: string;
  status: 'SUCCESS' | 'FAILED';
  transactionNo: string;
  message: string;
}

// Transaction History DTOs
export interface TransactionHistoryResponse {
  id: number;
  paymentId: number;
  amount: number;
  paymentMethod: 'CASH' | 'MOMO' | 'VNPAY';
  referenceCode: string;
  transactionNo?: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paymentTime?: string | null;
  licensePlate?: string | null;
  reservationCode?: string | null;
  userFullName?: string | null;
}

export interface TransactionHistorySummaryResponse {
  totalCount: number;
  totalAmount: number;
  successCount: number;
  successAmount: number;
  failedCount: number;
  failedAmount: number;
  pendingCount: number;
  pendingAmount: number;
}
