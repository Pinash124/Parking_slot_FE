// Authentication DTOs
export interface AuthLoginRequest {
  email: string;
  password?: string;
}

export interface OtpResponse {
  email: string;
  message: string;
}

export interface AuthRegistrationRequest {
  fullName: string;
  email: string;
  phone?: string | null;
  password?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword?: string;
}

// Manager Overview Report
export interface ManagerOverviewReport {
  from: string;
  to: string;
  totalCheckIns: number;
  totalCheckOuts: number;
  revenue: number;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
  lockedSlots: number;
  occupancyRate: number;
  peakHours?: Record<string, number> | null;
}

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
  totalTransactions: number;
}

// Parking Session DTO
export interface ParkingSession {
  sessionId?: number;
  id?: number;
  reservationId?: number | null;
  vehicleId: number;
  licensePlate?: string;
  slotId: number;
  slotCode?: string;
  entryStaffId?: number | null;
  exitStaffId?: number | null;
  entryGateId?: number | null;
  exitGateId?: number | null;
  ticketCode: string;
  entryTime?: string | null;
  exitTime?: string | null;
  parkingFee?: number | null;
  penaltyFee?: number | null;
  totalFee?: number | null;
  status: 'CREATED' | 'ACTIVE' | 'OVERDUE' | 'VIOLATION' | 'CANCELLED' | 'PAYMENT_PENDING' | 'COMPLETED' | 'CLOSED' | 'CHECKED_OUT';
}

// Parking Slot
export interface ParkingSlot {
  slotId: number;
  slotCode: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'LOCKED';
  vehicleTypeId: number;
  zoneId?: number;
}

// Parking Zone
export interface ParkingZone {
  zoneId: number;
  zoneName: string;
  buildingId: number;
  vehicleTypeId: number;
  capacity: number;
}

// Parking Building
export interface ParkingBuilding {
  buildingId: number;
  buildingName: string;
  address?: string;
}

// Vehicle Type
export interface VehicleType {
  vehicleTypeId: number;
  typeName: string;
  description?: string;
}

// User Response
export interface UserResponse {
  userId: number;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
}
