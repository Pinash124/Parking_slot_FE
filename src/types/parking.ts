// Authentication DTOs
export interface AuthLoginRequest {
  usernameOrEmail: string;
  password?: string;
}

export interface AuthResponse {
  message: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthRegistrationRequest {
  fullName: string;
  username: string;
  email: string;
  phone?: string | null;
  password?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
  resetLink?: string | null;
}

export interface ResetPasswordRequest {
  token: string;
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

// Parking Session DTO
export interface ParkingSession {
  sessionId?: number;
  reservationId?: number | null;
  vehicleId: number;
  slotId: number;
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
  status: 'CREATED' | 'ACTIVE' | 'OVERDUE' | 'VIOLATION' | 'CANCELLED' | 'PAYMENT_PENDING' | 'COMPLETED' | 'CLOSED';
}

// Parking Slot
export interface ParkingSlot {
  slotId: number;
  slotNumber: string;
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
