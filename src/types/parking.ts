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

// Parking Session DTO (old / staff view)
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

// New ParkingSessionResponse from /api/staff/parking-sessions
export interface ParkingSessionResponse {
  id: number;
  ticketCode: string;
  status: string;
  vehicleId: number;
  licensePlate?: string;
  vehicleTypeName?: string;
  slotId: number;
  slotCode?: string;
  zoneName?: string;
  entryTime?: string | null;
  exitTime?: string | null;
  parkingFee?: number | null;
  penaltyFee?: number | null;
  lostTicketFee?: number | null;
  totalFee?: number | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
  entryStaffId?: number | null;
  exitStaffId?: number | null;
}

// Current parking session response (for user portal)
export interface CurrentParkingSessionResponse {
  sessionId: number;
  ticketCode: string;
  status: string;
  slotCode?: string;
  zoneName?: string;
  vehicleTypeName?: string;
  licensePlate?: string;
  entryTime?: string;
  estimatedFee?: number;
  additionalServices?: { serviceId: number; serviceName: string; price: number }[];
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

// ======== MANAGEMENT DTOs (from ManagementDtos.java) ========

export interface BuildingView {
  id: number;
  name: string;
  address?: string;
  status?: string;
}

export interface BuildingRequest {
  name: string;
  address?: string;
  status?: string;
}

export interface FloorView {
  id: number;
  buildingId: number;
  buildingName?: string;
  floorName: string;
  floorNumber: number;
}

export interface FloorRequest {
  buildingId: number;
  floorName: string;
  floorNumber: number;
}

export interface VehicleTypeView {
  id: number;
  name: string;
  description?: string;
  defaultHourlyFee?: number;
}

export interface VehicleTypeRequest {
  name: string;
  description?: string;
  defaultHourlyFee?: number;
}

export interface ZoneView {
  id: number;
  floorId: number;
  floorName?: string;
  vehicleTypeId: number;
  vehicleTypeName?: string;
  zoneName: string;
}

export interface ZoneRequest {
  floorId: number;
  vehicleTypeId: number;
  zoneName: string;
}

export interface SlotView {
  id: number;
  zoneId: number;
  zoneName?: string;
  vehicleTypeId?: number;
  vehicleTypeName?: string;
  slotCode: string;
  status: string;
}

export interface SlotRequest {
  zoneId: number;
  slotCode: string;
  status?: string;
}

export interface SlotStatusUpdateRequest {
  status: string;
}

export interface PricingView {
  id: number;
  vehicleTypeId: number;
  vehicleTypeName?: string;
  policyName: string;
  hourlyRate?: number;
  dailyRate?: number;
  monthlyRate?: number;
  fixedSurcharge?: number;
  lostTicketFee?: number;
  overtimeFee?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
}

export interface PricingRequest {
  vehicleTypeId: number;
  policyName: string;
  hourlyRate?: number;
  dailyRate?: number;
  monthlyRate?: number;
  fixedSurcharge?: number;
  lostTicketFee?: number;
  overtimeFee?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
}

// ======== FEEDBACK DTOs ========

export interface FeedbackCreateRequest {
  sessionId?: number;
  category?: string;
  rating?: number;
  content: string;
}

export interface FeedbackResponse {
  id: number;
  userId?: number;
  userFullName?: string;
  sessionId?: number;
  category?: string;
  rating?: number;
  content: string;
  createdAt?: string;
  status?: string;
}

// ======== USER PORTAL DTOs ========

export interface VehicleView {
  id: number;
  vehicleTypeId: number;
  vehicleTypeName?: string;
  plateNumber: string;
  brand?: string;
  color?: string;
  status?: string;
}

export interface VehicleRequest {
  vehicleTypeId: number;
  plateNumber: string;
  brand?: string;
  color?: string;
}

export interface ReservationCreateRequest {
  userId?: number;
  vehicleId: number;
  zoneId: number;
  startTime: string;
  endTime: string;
}

export interface ReservationResponse {
  id: number;
  userId?: number;
  vehicleId?: number;
  licensePlate?: string;
  zoneId?: number;
  zoneName?: string;
  startTime?: string;
  endTime?: string;
  status: string;
  createdAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ======== INCIDENT DTOs ========

export interface IncidentRequest {
  sessionId?: number;
  licensePlate?: string;
  incidentType: string; // LOST_TICKET | WRONG_PLATE | WRONG_ZONE | OVERTIME | UNPAID
  description?: string;
}

export interface IncidentResponse {
  id: number;
  sessionId?: number;
  licensePlate?: string;
  incidentType: string;
  description?: string;
  status: string; // OPEN | RESOLVED | BYPASSED
  createdAt?: string;
  resolvedAt?: string;
  resolvedByName?: string;
}

// ======== ADMIN DTOs ========

export interface UserView {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
  role: string;
}

export interface AdminUserCreateRequest {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
}

export interface UserUpdateRequest {
  fullName?: string;
  phone?: string;
  status?: string;
  role?: string;
  newPassword?: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

export interface SettingRequest {
  value: string;
  description?: string;
}

export interface SystemDevice {
  id: number;
  deviceCode: string;
  deviceType: string;
  laneCode?: string;
  status: string;
  configurationJson?: string;
}

export interface DeviceRequest {
  deviceCode: string;
  deviceType: string;
  laneCode?: string;
  status?: string;
  configurationJson?: string;
}

// ======== SYSTEM OPERATIONS DTOs ========

export interface SystemOperationalStatusResponse {
  overallStatus?: string;
  activeSessionCount?: number;
  availableSlots?: number;
  uptime?: string;
  lastChecked?: string;
}

export interface BackupResponse {
  id?: number;
  backupType?: string;
  filePath?: string;
  status?: string;
  createdAt?: string;
  createdByName?: string;
}

export interface RecoveryStatusResponse {
  status?: string;
  lastRecoveryAt?: string;
  message?: string;
}

// ======== AUDIT LOG ========

export interface AuditLogResponse {
  id: number;
  timestamp?: string;
  operatorEmail?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  details?: string;
}

// Check-in request for staff
export interface SessionCheckInRequest {
  vehicleId?: number;
  licensePlate?: string;
  slotId?: number;
  reservationId?: number;
}

export interface SessionCheckoutRequest {
  lostTicket?: boolean;
  overtimeMinutes?: number;
}

// ======== PAYMENT GATEWAY DTOs ========

export interface PaymentGatewayRequest {
  sessionId: number;
  amount: number;
  returnUrl?: string;
  orderInfo?: string;
}

export interface PaymentResponse {
  id: number;
  sessionId: number;
  amount: number;
  paymentMethod: string;
  paymentTime: string | null;
  status: string;
}

export interface PaymentGatewayResponse {
  gateway: string;
  paymentId: number;
  referenceCode: string;
  status: string;
  paymentUrl: string | null;
  qrContent: string | null;
  message: string | null;
  payment: PaymentResponse | null;
  exitDeadline: string | null;
}

