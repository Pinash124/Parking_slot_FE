export interface ManagerDashboardResponse {

  utilizationRate: number;

  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;

  todayRevenue: number;

  hourlyRevenue: HourlyRevenue[];

  zoneRevenue: ZoneRevenue[];

  zoneDistribution: ZoneDistribution[];

  vehicleStatistics: VehicleStatistic[];

  issues: IssueReport[];
}

export interface HourlyRevenue {
  hour: string;
  revenue: number;
}

export interface ZoneRevenue {
  zoneName: string;
  revenue: number;
}

export interface ZoneDistribution {
  zoneName: string;
  occupied: number;
  available: number;
}

export interface VehicleStatistic {
  type: string;
  count: number;
}

export interface IssueReport {
  id: number;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}