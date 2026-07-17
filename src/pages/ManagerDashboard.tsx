import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { parkingService } from '../services/parkingService';
import { formatFeedbackTypeName, formatIncidentTypeName, formatSlotCodeName } from '../utils/vehicleDisplay';
import type {
  FloorRequest,
  ZoneRequest,
  SlotRequest,
  PricingRequest,
  VehicleTypeRequest,
} from '../types/parking';

const managerSubTabs = ['parking', 'vehicles', 'slots', 'rates', 'reports', 'exceptions', 'feedbacks'] as const;
type ManagerSubTab = typeof managerSubTabs[number];
const managerSubTabStorageKey = 'smartparking.manager.activeSubTab';

const isManagerSubTab = (value: string | null): value is ManagerSubTab =>
  !!value && managerSubTabs.includes(value as ManagerSubTab);

const getInitialManagerSubTab = (): ManagerSubTab => {
  if (typeof window === 'undefined') return 'parking';

  const urlTab = new URLSearchParams(window.location.search).get('tab');
  if (isManagerSubTab(urlTab)) return urlTab;

  const storedTab = window.localStorage.getItem(managerSubTabStorageKey);
  if (isManagerSubTab(storedTab)) return storedTab;

  return 'parking';
};

const toLocalDateParam = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMoney = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString('vi-VN')}đ`;

type RevenuePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

type RevenueTrendRow = {
  key: string;
  label: string;
  value: number;
};

const getRevenueRange = (period: RevenuePeriod, baseDate = new Date()) => {
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  if (period === 'day') {
    start.setDate(1);
  } else if (period === 'year') {
    start.setFullYear(start.getFullYear() - 4, 0, 1);
  } else {
    start.setMonth(0, 1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return {
    from: toLocalDateParam(start),
    to: toLocalDateParam(end),
  };
};

const dateKeysBetween = (from: string, to: string) => {
  const keys: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return keys;

  while (cursor <= end) {
    keys.push(toLocalDateParam(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

const getWeekStart = (date: Date) => {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay() || 7;
  monday.setDate(monday.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatShortDate = (date: Date) =>
  date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const buildRevenueTrendRows = (
  period: RevenuePeriod,
  from: string,
  to: string,
  revenueByDay: Record<string, number>
): RevenueTrendRow[] => {
  const dates = dateKeysBetween(from, to);

  if (period === 'day') {
    return dates.map((dateKey) => {
      const date = new Date(`${dateKey}T00:00:00`);
      return {
        key: dateKey,
        label: Number.isNaN(date.getTime()) ? dateKey : formatShortDate(date),
        value: Number(revenueByDay[dateKey] ?? 0),
      };
    });
  }

  const bucketMap = new Map<string, RevenueTrendRow>();

  dates.forEach((dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;

    let key = dateKey;
    let label = dateKey;

    if (period === 'week') {
      const weekStart = getWeekStart(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      key = toLocalDateParam(weekStart);
      label = `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)}`;
    } else if (period === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      label = `Tháng ${date.getMonth() + 1}`;
    } else if (period === 'quarter') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      key = `${date.getFullYear()}-Q${quarter}`;
      label = `Quý ${quarter}`;
    } else if (period === 'year') {
      key = String(date.getFullYear());
      label = key;
    }

    const current = bucketMap.get(key) || { key, label, value: 0 };
    current.value += Number(revenueByDay[dateKey] ?? 0);
    bucketMap.set(key, current);
  });

  return Array.from(bucketMap.values());
};

export default function ManagerDashboard() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<ManagerSubTab>(getInitialManagerSubTab);
  const [densityChartMode, setDensityChartMode] = useState<'bar' | 'line'>('bar');
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('day');

  useEffect(() => {
    window.localStorage.setItem(managerSubTabStorageKey, activeSubTab);

    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeSubTab);
    window.history.replaceState(null, '', url);
  }, [activeSubTab]);

  // Stats / Live Slots Query
  const { data: stats } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => parkingService.getOverviewReport(),
    refetchInterval: 15000,
  });

  const reportDate = toLocalDateParam();
  const { data: managerReport } = useQuery({
    queryKey: ['managerReport', reportDate],
    queryFn: () => parkingService.getManagerReport({ from: reportDate, to: reportDate }),
    refetchInterval: 15000,
  });

  const revenueRange = getRevenueRange(revenuePeriod);
  const { data: revenueTrendReport } = useQuery({
    queryKey: ['managerRevenueTrend', revenuePeriod, revenueRange.from, revenueRange.to],
    queryFn: () => parkingService.getManagerReport(revenueRange),
    refetchInterval: 15000,
  });

  // --- API QUERIES ---

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => parkingService.getFloors(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => parkingService.getBuildings(),
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => parkingService.getZones(),
  });

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => parkingService.getVehicleTypes(),
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: () => parkingService.getSlots(),
    refetchInterval: 10000,
  });

  const { data: pricingPolicies = [] } = useQuery({
    queryKey: ['managerPricingPolicies'],
    queryFn: () => parkingService.getPricingPolicies(),
  });

  const { data: pricingRules } = useQuery({
    queryKey: ['pricingRules'],
    queryFn: () => parkingService.getPricingRules(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => parkingService.getIncidents(),
    refetchInterval: 15000,
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: () => parkingService.getAllFeedbacks(),
  });

  // --- MUTATIONS ---
  const createZoneMutation = useMutation({
    mutationFn: (payload: ZoneRequest) => parkingService.createZone(payload),
    onSuccess: async (zone) => {
      const capacity = parseInt(newZoneCapacity, 10) || 0;
      const createdSlots: any[] = [];
      for (let i = 0; i < capacity; i += 1) {
        const slotCode = buildSlotCodeForZone(zone, [...slots, ...createdSlots]);
        const created = await parkingService.createSlot({
          zoneId: zone.id,
          slotCode,
          status: 'AVAILABLE',
        });
        createdSlots.push(created);
      }
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      alert('Đã tạo phân khu mới thành công!');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const createFloorMutation = useMutation({
    mutationFn: (payload: FloorRequest) => parkingService.createFloor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      alert('Đã tạo tầng mới thành công!');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const createVehicleTypeMutation = useMutation({
    mutationFn: (payload: VehicleTypeRequest) => parkingService.createVehicleType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] });
      alert('Đã thêm loại xe mới thành công!');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const createSlotMutation = useMutation({
    mutationFn: (payload: SlotRequest) => parkingService.createSlot(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      alert('Đã tạo ô đỗ mới thành công!');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const updateSlotStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      parkingService.updateSlotStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
    },
    onError: (err: any) => alert('Lỗi khi đổi trạng thái: ' + (err.response?.data?.message || err.message)),
  });

  const savePricingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PricingRequest }) =>
      parkingService.updatePricingPolicy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerPricingPolicies'] });
      queryClient.invalidateQueries({ queryKey: ['userPricingPolicies'] });
      alert('Đã cập nhật biểu phí thành công!');
    },
    onError: (err: any) => alert('Lỗi khi cập nhật biểu phí: ' + (err.response?.data?.message || err.message)),
  });

  const savePricingRulesMutation = useMutation({
    mutationFn: (payload: { dayStart: string; nightStart: string }) =>
      parkingService.updatePricingRules(payload),
    onSuccess: (rules) => {
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
      setPricingDayStart(rules.dayStart);
      setPricingNightStart(rules.nightStart);
      alert('Đã cập nhật khung giờ tính phí.');
    },
    onError: (err: any) => alert('Lỗi khi cập nhật khung giờ: ' + (err.response?.data?.message || err.message)),
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: (id: number) => parkingService.resolveIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      alert('Đã giải quyết sự cố thành công!');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  // --- STATE FOR FORMS & FILTERS ---
  const [parkingFormMode, setParkingFormMode] = useState<'floor' | 'zone'>('zone');
  const [newFloorBuildingId, setNewFloorBuildingId] = useState('');
  const [newFloorNumber, setNewFloorNumber] = useState('');
  const [newFloorName, setNewFloorName] = useState('');

  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFloorId, setNewZoneFloorId] = useState('');
  const [newZoneTypeId, setNewZoneTypeId] = useState('');
  const [newZoneCapacity, setNewZoneCapacity] = useState('50');

  const [pricingDayStart, setPricingDayStart] = useState('07:00');
  const [pricingNightStart, setPricingNightStart] = useState('22:00');
  
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeFee, setNewTypeFee] = useState('10000');

  const [newSlotCode, setNewSlotCode] = useState('');
  const [newSlotZoneId, setNewSlotZoneId] = useState('');

  const [slotFilterVehicleType, setSlotFilterVehicleType] = useState('ALL');
  const [slotFilterZone, setSlotFilterZone] = useState('ALL');
  const [slotFilterStatus, setSlotFilterStatus] = useState('ALL');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('ALL');
  const [zoneFilterFloor, setZoneFilterFloor] = useState('ALL');
  const [zoneFilterVehicleType, setZoneFilterVehicleType] = useState('ALL');
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingZoneDraft, setEditingZoneDraft] = useState({
    zoneName: '',
    floorId: '',
    capacity: '',
  });
  const [zoneSaving, setZoneSaving] = useState(false);

  useEffect(() => {
    if (!pricingRules) return;
    setPricingDayStart(pricingRules.dayStart || '07:00');
    setPricingNightStart(pricingRules.nightStart || '22:00');
  }, [pricingRules]);

  // Submit handlers
  const handleAddFloor = (e: React.FormEvent) => {
    e.preventDefault();
    const floorNumber = parseInt(newFloorNumber, 10);
    if (!newFloorBuildingId || !newFloorName.trim() || !Number.isFinite(floorNumber)) {
      alert('Vui lòng chọn tòa nhà và nhập thông tin tầng hợp lệ.');
      return;
    }
    createFloorMutation.mutate({
      buildingId: parseInt(newFloorBuildingId, 10),
      floorName: newFloorName.trim(),
      floorNumber,
    });
    setNewFloorBuildingId('');
    setNewFloorNumber('');
    setNewFloorName('');
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName || !newZoneFloorId || !newZoneTypeId) {
      alert('Vui lòng điền đầy đủ thông tin phân khu.');
      return;
    }
    createZoneMutation.mutate({
      floorId: parseInt(newZoneFloorId, 10),
      vehicleTypeId: parseInt(newZoneTypeId, 10),
      zoneName: newZoneName,
    });
    setNewZoneName('');
    setNewZoneCapacity('50');
  };

  const handleSavePricingRules = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingDayStart || !pricingNightStart || pricingDayStart === pricingNightStart) {
      alert('Vui lòng chọn 2 mốc giờ khác nhau.');
      return;
    }
    savePricingRulesMutation.mutate({
      dayStart: pricingDayStart,
      nightStart: pricingNightStart,
    });
  };

  const getZoneSlots = (zoneId: number) => slots.filter((slot) => slot.zoneId === zoneId);

  const buildSlotCodeForZone = (zone: any, existingSlots = slots) => {
    const rawPrefix = String(zone.zoneName || `ZONE-${zone.id}`)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `ZONE-${zone.id}`;
    const existingCodes = new Set(existingSlots.map((slot) => String(slot.slotCode || '').toUpperCase()));
    let index = existingSlots.filter((slot) => slot.zoneId === zone.id).length + 1;
    let nextCode = `${rawPrefix}-${String(index).padStart(3, '0')}`;
    while (existingCodes.has(nextCode)) {
      index += 1;
      nextCode = `${rawPrefix}-${String(index).padStart(3, '0')}`;
    }
    return nextCode;
  };

  const syncZoneCapacity = async (zone: any, targetCapacity: number) => {
    const currentZoneSlots = getZoneSlots(zone.id);
    const currentCapacity = currentZoneSlots.length;

    if (targetCapacity === currentCapacity) return;

    if (targetCapacity > currentCapacity) {
      const amountToAdd = targetCapacity - currentCapacity;
      const createdSlots: any[] = [];
      for (let i = 0; i < amountToAdd; i += 1) {
        const slotCode = buildSlotCodeForZone(zone, [...slots, ...createdSlots]);
        const created = await parkingService.createSlot({
          zoneId: zone.id,
          slotCode,
          status: 'AVAILABLE',
        });
        createdSlots.push(created);
      }
      return;
    }

    const amountToRemove = currentCapacity - targetCapacity;
    const removableSlots = currentZoneSlots
      .filter((slot) => String(slot.status || '').toUpperCase() === 'AVAILABLE')
      .sort((a, b) => String(b.slotCode || '').localeCompare(String(a.slotCode || '')))
      .slice(0, amountToRemove);

    if (removableSlots.length < amountToRemove) {
      throw new Error('Không đủ ô trống để giảm sức chứa. Chỉ có thể xóa ô đang Trống.');
    }

    for (const slot of removableSlots) {
      await parkingService.deleteSlot(slot.id);
    }
  };

  const startEditZone = (zone: any) => {
    setEditingZoneId(zone.id);
    setEditingZoneDraft({
      zoneName: zone.zoneName || '',
      floorId: String(zone.floorId || ''),
      capacity: String(getZoneSlots(zone.id).length),
    });
  };

  const cancelEditZone = () => {
    setEditingZoneId(null);
    setEditingZoneDraft({ zoneName: '', floorId: '', capacity: '' });
  };

  const handleSaveZone = async (zone: any) => {
    const targetCapacity = parseInt(editingZoneDraft.capacity, 10);
    if (!editingZoneDraft.zoneName.trim() || !editingZoneDraft.floorId || !Number.isFinite(targetCapacity) || targetCapacity < 0) {
      alert('Vui lòng nhập tên, tầng và sức chứa hợp lệ.');
      return;
    }

    setZoneSaving(true);
    try {
      const updatedZone = await parkingService.updateZone(zone.id, {
        floorId: parseInt(editingZoneDraft.floorId, 10),
        vehicleTypeId: zone.vehicleTypeId,
        zoneName: editingZoneDraft.zoneName.trim(),
        zoneType: zone.zoneType,
      });
      await syncZoneCapacity(updatedZone, targetCapacity);
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      cancelEditZone();
      alert('Đã cập nhật phân khu.');
    } catch (err: any) {
      alert('Lỗi khi cập nhật phân khu: ' + (err.response?.data?.message || err.message));
    } finally {
      setZoneSaving(false);
    }
  };

  const handleAddVehicleType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName) return;
    createVehicleTypeMutation.mutate({
      name: newTypeName,
      description: newTypeDesc,
      defaultHourlyFee: parseFloat(newTypeFee) || 10000,
    });
    setNewTypeName('');
    setNewTypeDesc('');
    setNewTypeFee('10000');
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotCode || !newSlotZoneId) return;
    createSlotMutation.mutate({
      zoneId: parseInt(newSlotZoneId, 10),
      slotCode: newSlotCode.toUpperCase().trim(),
      status: 'AVAILABLE',
    });
    setNewSlotCode('');
  };

  const getVehicleFilterGroup = (name?: string) => {
    const normalized = (name || '').toUpperCase();
    const ascii = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes('MOTOR') || normalized.includes('BIKE') || ascii.includes('XE 2') || ascii.includes('XE MAY') || ascii.includes('2 BANH')) return 'TWO_WHEEL';
    if (normalized.includes('CAR') || normalized.includes('AUTO') || normalized.includes('OTOMOBILE') || ascii.includes('O TO')) return 'FOUR_WHEEL';
    return 'OTHER';
  };

  const getSlotVehicleTypeName = (slot: any) => {
    if (slot.vehicleTypeName) return slot.vehicleTypeName;
    return zones.find((zone) => zone.id === slot.zoneId)?.vehicleTypeName || '';
  };

  const formatVehicleTypeLabel = (name?: string) => {
    const group = getVehicleFilterGroup(name);
    if (group === 'TWO_WHEEL') return 'Xe 2 bánh';
    if (group === 'FOUR_WHEEL') return 'Ô tô';
    return name || 'Khác';
  };

  const formatZoneName = (name?: string) => {
    const rawName = name || '';
    const normalized = rawName.toUpperCase();
    const floor = normalized.match(/^F\d+/)?.[0] || '';
    if (normalized.includes('MOTORBIKE')) return floor ? `${floor} - Xe 2 bánh` : 'Xe 2 bánh';
    if (normalized.includes('CAR-MONTHLY')) return floor ? `${floor} - Ô tô tháng` : 'Ô tô tháng';
    if (normalized.includes('CAR-NORMAL')) return floor ? `${floor} - Ô tô thường` : 'Ô tô thường';
    return rawName || 'Chưa rõ phân khu';
  };

  const formatZoneOptionLabel = (zone: any) => formatZoneName(zone.zoneName);

  const isTwoWheelSlot = (slot: any) => getVehicleFilterGroup(getSlotVehicleTypeName(slot)) === 'TWO_WHEEL';

  const formatFloorName = (name?: string) => {
    const rawName = name || '';
    return rawName.replace(/^Floor\s*(\d+)/i, 'T\u1ea7ng $1');
  };
  const zoneOptionsForSlotFilter = zones.filter((zone) =>
    getVehicleFilterGroup(zone.vehicleTypeName) !== 'TWO_WHEEL'
    && (slotFilterVehicleType === 'ALL' || getVehicleFilterGroup(zone.vehicleTypeName) === slotFilterVehicleType)
  );

  const getIssueType = (item: any) => String(item?.incidentType || item?.feedbackType || item?.category || '').toUpperCase();
  const isFeedbackOnlyType = (item: any) => ['COMPLAINT', 'SUGGESTION', 'OTHER'].includes(getIssueType(item));
  const isOperationalIncident = (item: any) => !isFeedbackOnlyType(item);
  const isCustomerFeedbackType = (item: any) => ['INCIDENT', 'COMPLAINT', 'SUGGESTION', 'OTHER'].includes(getIssueType(item));
  const visibleFeedbacks = feedbacks.filter((fb) => {
    const type = getIssueType(fb);
    return isCustomerFeedbackType(fb) && (feedbackTypeFilter === 'ALL' || type === feedbackTypeFilter);
  });
  // Filter slots
  const filteredSlots = slots.filter((s) => {
    if (isTwoWheelSlot(s)) return false;
    const vehicleTypeMatch = slotFilterVehicleType === 'ALL' || getVehicleFilterGroup(getSlotVehicleTypeName(s)) === slotFilterVehicleType;
    const zoneMatch = slotFilterZone === 'ALL' || String(s.zoneId) === slotFilterZone;
    const statusMatch = slotFilterStatus === 'ALL' || s.status === slotFilterStatus;
    return vehicleTypeMatch && zoneMatch && statusMatch;
  });

  const visibleZones = zones.filter((zone) => {
    const floorMatch = zoneFilterFloor === 'ALL' || String(zone.floorId) === zoneFilterFloor;
    const vehicleTypeMatch = zoneFilterVehicleType === 'ALL' || getVehicleFilterGroup(zone.vehicleTypeName) === zoneFilterVehicleType;
    return floorMatch && vehicleTypeMatch;
  });

  const reportRevenue = Number(managerReport?.revenue ?? stats?.todayRevenue ?? 0);
  const reportOccupancyRate = Math.round(Number(managerReport?.occupancyRate ?? 0));
  const vehicleRevenueRows = (managerReport?.byVehicleType ?? []).filter((item) =>
    Number(item.revenue ?? 0) > 0
  );
  const totalVehicleRevenue = vehicleRevenueRows.reduce((sum, item) => sum + Number(item.revenue ?? 0), 0);
  const revenueChartColors = ['#4f46e5', '#10b981', '#f59e0b', '#0ea5e9'];
  const revenuePieRadius = 46;
  const revenuePieCircumference = 2 * Math.PI * revenuePieRadius;
  let revenuePieOffset = 0;
  const revenuePieSlices = vehicleRevenueRows.map((item, index) => {
    const value = Number(item.revenue ?? 0);
    const length = totalVehicleRevenue > 0 ? (value / totalVehicleRevenue) * revenuePieCircumference : 0;
    const slice = {
      item,
      value,
      length,
      offset: revenuePieOffset,
      color: revenueChartColors[index % revenueChartColors.length],
      percent: totalVehicleRevenue > 0 ? Math.round((value * 100) / totalVehicleRevenue) : 0,
    };
    revenuePieOffset += length;
    return slice;
  });

  const peakHours = managerReport?.peakHours ?? {};
  const hourlyDensity = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: Number(peakHours[String(hour)] ?? 0),
  }));
  const maxHourlyDensity = Math.max(...hourlyDensity.map((item) => item.count), 1);
  const lineChartPoints = hourlyDensity.map((item, index) => {
    const x = 20 + index * (680 / 23);
    const y = 138 - (item.count / maxHourlyDensity) * 112;
    return { ...item, x, y };
  });
  const densityLinePath = lineChartPoints.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  const revenueByDay = revenueTrendReport?.revenueByDay ?? {};
  const revenueTrendRows = buildRevenueTrendRows(revenuePeriod, revenueRange.from, revenueRange.to, revenueByDay);
  const maxTrendRevenue = Math.max(...revenueTrendRows.map((item) => item.value), 1);
  const totalTrendRevenue = revenueTrendRows.reduce((sum, item) => sum + item.value, 0);
  const trendChartWidth = Math.max(720, revenueTrendRows.length * (revenuePeriod === 'day' ? 48 : 88));
  const trendLinePoints = revenueTrendRows.map((item, index) => {
    const x = revenueTrendRows.length <= 1 ? 32 : 32 + index * ((trendChartWidth - 64) / (revenueTrendRows.length - 1));
    const y = 164 - (item.value / maxTrendRevenue) * 118;
    return { ...item, x, y };
  });
  const trendLinePath = trendLinePoints.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page title */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Kênh Quản Lý Vận Hành (Manager Panel)</h2>
            <p className="text-slate-400 text-sm mt-0.5">Quản lý bãi xe, phân khu, ô đỗ, biểu phí và theo dõi sự cố vận hành.</p>
          </div>
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-xs font-bold text-slate-650 flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
            <span>Doanh thu hôm nay: <strong>{(stats?.todayRevenue ?? 0).toLocaleString('vi-VN')}đ</strong></span>
          </div>
        </div>

        {/* Sub tabs nav */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto space-x-2 pb-1 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('parking')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'parking' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Bãi Xe & Khu Vực
          </button>
          <button
            onClick={() => setActiveSubTab('vehicles')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'vehicles' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Loại Phương Tiện
          </button>
          <button
            onClick={() => setActiveSubTab('slots')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'slots' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Quản Lý Slot Đỗ
          </button>
          <button
            onClick={() => setActiveSubTab('rates')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'rates' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Bảng Giá Gửi Xe
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'reports' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Báo Cáo Thống Kê
          </button>
          <button
            onClick={() => setActiveSubTab('exceptions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer relative ${
              activeSubTab === 'exceptions' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Xử Lý Sự Cố
            {incidents.filter((i) => isOperationalIncident(i) && i.status === 'OPEN').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-rose-500 text-white rounded-full font-bold">
                {incidents.filter((i) => isOperationalIncident(i) && i.status === 'OPEN').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('feedbacks')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'feedbacks' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Ý Kiến Phản Hồi
          </button>
         </div>

        {/* Tab 1: Parking Lot & Zones */}
        {activeSubTab === 'parking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Thêm dữ liệu bãi xe</h3>

              {parkingFormMode === 'floor' ? (
                <form onSubmit={handleAddFloor} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Bạn muốn tạo</label>
                    <select
                      value={parkingFormMode}
                      onChange={(e) => setParkingFormMode(e.target.value as 'floor' | 'zone')}
                      className="w-full bg-indigo-50 border border-indigo-100 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-indigo-700 font-bold focus:outline-none"
                    >
                      <option value="zone">Phân khu mới</option>
                      <option value="floor">Tầng mới</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Tòa nhà</label>
                    <select
                      value={newFloorBuildingId}
                      onChange={(e) => setNewFloorBuildingId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                      required
                    >
                      <option value="">-- Chọn tòa nhà --</option>
                      {buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Số tầng</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Ví dụ: 7"
                      value={newFloorNumber}
                      onChange={(e) => setNewFloorNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Tên tầng</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Tầng 7"
                      value={newFloorName}
                      onChange={(e) => setNewFloorName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createFloorMutation.isPending}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm"
                  >
                    {createFloorMutation.isPending ? 'Đang tạo...' : 'Tạo tầng mới'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAddZone} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Bạn muốn tạo</label>
                    <select
                      value={parkingFormMode}
                      onChange={(e) => setParkingFormMode(e.target.value as 'floor' | 'zone')}
                      className="w-full bg-indigo-50 border border-indigo-100 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-indigo-700 font-bold focus:outline-none"
                    >
                      <option value="zone">Phân khu mới</option>
                      <option value="floor">Tầng mới</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Tên phân khu</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Khu D"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Chọn tầng</label>
                    <select
                      value={newZoneFloorId}
                      onChange={(e) => setNewZoneFloorId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-850 focus:outline-none"
                      required
                    >
                      <option value="">-- Chọn tầng --</option>
                      {floors.map((f) => (
                        <option key={f.id} value={f.id}>
                          {formatFloorName(f.floorName)} ({f.buildingName || `Tòa nhà #${f.buildingId}`})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Loại xe hỗ trợ</label>
                    <select
                      value={newZoneTypeId}
                      onChange={(e) => setNewZoneTypeId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                      required
                    >
                      <option value="">-- Chọn loại xe --</option>
                      {vehicleTypes.map((vt) => (
                        <option key={vt.id} value={vt.id}>
                          {formatVehicleTypeLabel(vt.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Sức chứa tối đa (chiếc)</label>
                    <input
                      type="number"
                      required
                      value={newZoneCapacity}
                      onChange={(e) => setNewZoneCapacity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createZoneMutation.isPending}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm"
                  >
                    {createZoneMutation.isPending ? 'Đang tạo...' : 'Tạo phân khu mới'}
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Danh Sách Tầng & Khu Vực Đỗ</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={zoneFilterFloor}
                    onChange={(e) => setZoneFilterFloor(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  >
                    <option value="ALL">Tất cả tầng</option>
                    {floors.map((floor) => (
                      <option key={floor.id} value={String(floor.id)}>
                        {formatFloorName(floor.floorName)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={zoneFilterVehicleType}
                    onChange={(e) => setZoneFilterVehicleType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  >
                    <option value="ALL">Tất cả loại xe</option>
                    <option value="TWO_WHEEL">Xe 2 bánh</option>
                    <option value="FOUR_WHEEL">Ô tô</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                      <th className="pb-3">Khu Vực</th>
                      <th className="pb-3">Vị Trí Tầng</th>
                      <th className="pb-3">Dành Cho Xe</th>
                      <th className="pb-3 text-right">Sức Chứa</th>
                      <th className="pb-3 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {visibleZones.map((zone) => {
                      const isEditing = editingZoneId === zone.id;
                      const capacity = zone.id ? getZoneSlots(zone.id).length : 0;

                      return (
                        <tr key={zone.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 pr-3 font-bold text-slate-800 min-w-[180px]">
                            {isEditing ? (
                              <input
                                value={editingZoneDraft.zoneName}
                                onChange={(e) => setEditingZoneDraft((draft) => ({ ...draft, zoneName: e.target.value }))}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                              />
                            ) : (
                              formatZoneName(zone.zoneName)
                            )}
                          </td>
                          <td className="py-3.5 pr-3 font-semibold text-slate-500 min-w-[140px]">
                            {isEditing ? (
                              <select
                                value={editingZoneDraft.floorId}
                                onChange={(e) => setEditingZoneDraft((draft) => ({ ...draft, floorId: e.target.value }))}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
                              >
                                {floors.map((floor) => (
                                  <option key={floor.id} value={String(floor.id)}>
                                    {formatFloorName(floor.floorName)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              formatFloorName(zone.floorName) || `Tầng #${zone.floorId}`
                            )}
                          </td>
                          <td className="py-3.5 pr-3 font-medium text-slate-650">
                            {formatVehicleTypeLabel(zone.vehicleTypeName) || `Type #${zone.vehicleTypeId}`}
                          </td>
                          <td className="py-3.5 text-right font-bold text-indigo-600 min-w-[120px]">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={editingZoneDraft.capacity}
                                onChange={(e) => setEditingZoneDraft((draft) => ({ ...draft, capacity: e.target.value }))}
                                className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-right text-slate-800 focus:border-indigo-500 focus:outline-none"
                              />
                            ) : (
                              `${capacity} chiếc`
                            )}
                          </td>
                          <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveZone(zone)}
                                  disabled={zoneSaving}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditZone}
                                  disabled={zoneSaving}
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 disabled:opacity-50"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditZone(zone)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-650 text-[10px] font-bold hover:bg-indigo-100"
                              >
                                Sửa
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {visibleZones.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 font-medium">Không có phân khu nào phù hợp với bộ lọc.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Vehicle Categories */}
        {activeSubTab === 'vehicles' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Thêm Loại Xe Mới</h3>
              <form onSubmit={handleAddVehicleType} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Tên loại xe</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Ô tô điện"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Mô tả chi tiết</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Xe ô tô chạy động cơ điện..."
                    value={newTypeDesc}
                    onChange={(e) => setNewTypeDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Qua đêm / giờ mặc định (VNĐ)</label>
                  <input
                    type="number"
                    required
                    value={newTypeFee}
                    onChange={(e) => setNewTypeFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm"
                >
                  Thêm loại xe
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Danh Mục Các Loại Phương Tiện</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                      <th className="pb-3">Tên Loại Xe</th>
                      <th className="pb-3">Mô tả</th>
                      <th className="pb-3 text-right">Phí Theo Giờ Mặc Định</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {vehicleTypes.map((vt) => (
                      <tr key={vt.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 font-bold text-slate-800">{vt.name}</td>
                        <td className="py-3.5 font-semibold text-slate-550">{vt.description || 'N/A'}</td>
                        <td className="py-3.5 text-right font-bold text-slate-850">{(vt.defaultHourlyFee ?? 0).toLocaleString('vi-VN')}đ</td>
                      </tr>
                    ))}
                    {vehicleTypes.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-slate-400 font-medium">Chưa có loại xe nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Slots Management */}
        {activeSubTab === 'slots' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Form & Filters */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Tạo Slot Đỗ Mới</h3>
                <form onSubmit={handleAddSlot} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Mã vị trí</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: A-106"
                      value={newSlotCode}
                      onChange={(e) => setNewSlotCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Phân khu</label>
                    <select
                      value={newSlotZoneId}
                      onChange={(e) => setNewSlotZoneId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-850 focus:outline-none font-bold"
                      required
                    >
                      <option value="">-- Chọn Phân Khu --</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {formatZoneOptionLabel(z)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm"
                  >
                    Tạo slot đỗ
                  </button>
                </form>
              </div>

              {/* Filters */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3.5">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Danh sách ô đỗ</h3>
                <div className="text-xs space-y-3">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Loại xe</label>
                    <select
                      value={slotFilterVehicleType}
                      onChange={(e) => {
                        setSlotFilterVehicleType(e.target.value);
                        setSlotFilterZone('ALL');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-semibold"
                    >
                      <option value="ALL">Tất cả loại xe</option>
                      <option value="FOUR_WHEEL">Ô tô</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Khu vực</label>
                    <select
                      value={slotFilterZone}
                      onChange={(e) => setSlotFilterZone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-semibold"
                    >
                      <option value="ALL">Tất cả khu vực</option>
                      {zoneOptionsForSlotFilter.map((z) => (
                        <option key={z.id} value={String(z.id)}>
                          {formatZoneOptionLabel(z)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Trạng thái</label>
                    <select
                      value={slotFilterStatus}
                      onChange={(e) => setSlotFilterStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-semibold"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="AVAILABLE">Trống</option>
                      <option value="OCCUPIED">Đang sử dụng</option>
                      <option value="RESERVED">Đã đặt trước</option>
                      <option value="MAINTENANCE">Bảo trì</option>
                      <option value="LOCKED">Locked</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Graphic Grid View */}
            <div className="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Sơ đồ trạng thái ô đỗ</h3>
                <span className="text-xs text-slate-400 font-semibold">Hiển thị {filteredSlots.length} ô đỗ</span>
              </div>

              {/* Chú thích trạng thái */}
              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500 mb-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200">
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-md mr-1.5"></span>Trống</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-rose-500 rounded-md mr-1.5"></span>Đang sử dụng</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-md mr-1.5"></span>Đã đặt trước</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-amber-500 rounded-md mr-1.5"></span>Bảo trì</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-slate-400 rounded-md mr-1.5"></span>Locked</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 items-stretch">
                {filteredSlots.map((slot) => {
                  let statusBg = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                  let badgeDot = 'bg-emerald-500';
                  if (slot.status === 'OCCUPIED') {
                    statusBg = 'bg-rose-50 border-rose-250 text-rose-800';
                    badgeDot = 'bg-rose-500';
                  } else if (slot.status === 'RESERVED') {
                    statusBg = 'bg-indigo-50 border-indigo-200 text-indigo-800';
                    badgeDot = 'bg-indigo-500';
                  } else if (slot.status === 'MAINTENANCE') {
                    statusBg = 'bg-amber-50 border-amber-200 text-amber-800';
                    badgeDot = 'bg-amber-500';
                  } else if (slot.status === 'LOCKED') {
                    statusBg = 'bg-slate-100 border-slate-200 text-slate-500';
                    badgeDot = 'bg-slate-400';
                  }

                  return (
                    <div key={slot.id} className={`border rounded-2xl p-3.5 min-h-[154px] flex flex-col justify-between transition relative ${statusBg}`}>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-sm tracking-tight leading-tight min-h-[34px] flex items-start break-words">{formatSlotCodeName(slot.slotCode)}</span>
                        <span className={`w-2 h-2 mt-1 rounded-full shrink-0 ${badgeDot}`}></span>
                      </div>
                      
                      <div className="text-[10px] space-y-0.5 opacity-90">
                        <p className="font-bold">Khu vực: {formatZoneName(slot.zoneName) || `Khu vực #${slot.zoneId}`}</p>
                        <p className="font-medium">Loại xe: {formatVehicleTypeLabel(slot.vehicleTypeName)}</p>
                      </div>

                      {/* Dropdown status toggler */}
                      <div className="pt-1.5 border-t border-slate-200/50 flex justify-end">
                        <select
                          value={slot.status}
                          onChange={(e) => updateSlotStatusMutation.mutate({ id: slot.id, status: e.target.value })}
                          className="bg-white hover:bg-slate-50 border border-slate-250 text-[10px] font-bold rounded-lg px-1.5 py-0.5 text-slate-700 cursor-pointer focus:outline-none"
                        >
                          <option value="AVAILABLE">Trống</option>
                          <option value="OCCUPIED">Đang sử dụng</option>
                          <option value="RESERVED">Đã đặt trước</option>
                          <option value="MAINTENANCE">Bảo trì</option>
                          <option value="LOCKED">Locked</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredSlots.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Không có ô đỗ phù hợp với bộ lọc.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Pricing Rates */}
        {activeSubTab === 'rates' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-2"></span>
              Cấu Hình Giá Đỗ Xe & Phí Sự Cố
            </h3>

            <form
              onSubmit={handleSavePricingRules}
              className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-500 mb-1">Ban ngày bắt đầu</label>
                <input
                  type="time"
                  value={pricingDayStart}
                  onChange={(e) => setPricingDayStart(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none"
                  required
                />
                <p className="mt-1 text-[10px] text-slate-500">Từ mốc này tính theo lượt ban ngày.</p>
              </div>
              <div>
                <label className="block font-bold text-slate-500 mb-1">Qua đêm bắt đầu</label>
                <input
                  type="time"
                  value={pricingNightStart}
                  onChange={(e) => setPricingNightStart(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none"
                  required
                />
                <p className="mt-1 text-[10px] text-slate-500">Từ mốc này tính theo giờ qua đêm.</p>
              </div>
              <div className="flex md:items-end">
                <button
                  type="submit"
                  disabled={savePricingRulesMutation.isPending}
                  className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                >
                  {savePricingRulesMutation.isPending ? 'Đang lưu...' : 'Lưu khung giờ'}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto text-xs">
              <table className="w-full min-w-[980px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="pb-3 pr-4 w-[130px]">Loại Xe</th>
                    <th className="pb-3 px-3 text-center whitespace-nowrap w-[290px]">Giá qua đêm</th>
                    <th className="pb-3 px-3 text-center whitespace-nowrap w-[290px]">Giá ban ngày</th>
                    <th className="pb-3 px-3 text-center whitespace-nowrap w-[150px]">Phí Vé Tháng</th>
                    <th className="pb-3 px-3 text-center whitespace-nowrap w-[150px]">Mất Vé / Phạt</th>
                    <th className="pb-3 pl-3 text-center whitespace-nowrap w-[120px]">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-755">
                  {pricingPolicies.map((policy) => (
                    <PricingRow
                      key={policy.id}
                      policy={policy}
                      onSave={(payload) => savePricingMutation.mutate({ id: policy.id, payload })}
                    />
                  ))}
                  {pricingPolicies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">Chưa cấu hình biểu phí nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 5: Reports Dashboard */}
        {activeSubTab === 'reports' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Tỷ lệ lấp đầy</p>
                <p className="text-3xl font-extrabold text-indigo-600 mt-1">
                  {reportOccupancyRate}%
                </p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-455 font-bold text-[10px] uppercase tracking-wider">Tổng Lượt Đặt Chỗ</p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats?.totalReservations ?? 0}</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Doanh Thu Hôm Nay</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{formatMoney(reportRevenue)}</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Tổng giao dịch</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats?.totalTransactions ?? 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Doanh thu theo loại xe hôm nay</h3>
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5 items-center pt-2">
                  {vehicleRevenueRows.length > 0 && (
                    <div className="relative mx-auto h-36 w-36">
                      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                        <circle cx="60" cy="60" r={revenuePieRadius} fill="none" stroke="#eef2ff" strokeWidth="18" />
                        {revenuePieSlices.map((slice) => (
                          <circle
                            key={slice.item.vehicleTypeId || slice.item.vehicleTypeName}
                            cx="60"
                            cy="60"
                            r={revenuePieRadius}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="18"
                            strokeLinecap="round"
                            strokeDasharray={`${slice.length} ${revenuePieCircumference - slice.length}`}
                            strokeDashoffset={-slice.offset}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng</span>
                        <span className="text-sm font-extrabold text-slate-800">{formatMoney(totalVehicleRevenue)}</span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3 text-xs">
                    {revenuePieSlices.map((slice) => (
                      <div key={slice.item.vehicleTypeId || slice.item.vehicleTypeName} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-bold text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }}></span>
                          {formatVehicleTypeLabel(slice.item.vehicleTypeName)}
                        </span>
                        <span className="font-extrabold text-slate-800 whitespace-nowrap">
                          {formatMoney(slice.value)} ({slice.percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                  {vehicleRevenueRows.length === 0 && (
                    <div className="sm:col-span-2 py-10 text-center text-xs font-semibold text-slate-400">
                      Chưa có doanh thu theo loại xe trong hôm nay.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800">Mật độ xe theo giờ hôm nay</h3>
                  <div className="flex rounded-xl bg-slate-100 p-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDensityChartMode('bar')}
                      className={`px-3 py-1.5 rounded-lg ${densityChartMode === 'bar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Cột
                    </button>
                    <button
                      type="button"
                      onClick={() => setDensityChartMode('line')}
                      className={`px-3 py-1.5 rounded-lg ${densityChartMode === 'line' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Đường
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {densityChartMode === 'bar' ? (
                    <div className="flex items-end justify-between gap-2 min-w-[760px] h-48 pt-4 px-1 border-b border-slate-200 text-[10px] text-slate-400 font-bold">
                      {hourlyDensity.map((item) => {
                        const active = item.count > 0 && item.count === maxHourlyDensity;
                        return (
                          <div key={item.hour} className="flex w-7 flex-col items-center justify-end gap-2" title={`${item.hour}h: ${item.count} lượt`}>
                            <span className="h-3 text-[9px] text-slate-400">{item.count > 0 ? item.count : ''}</span>
                            <div
                              className={`w-4 rounded-t-md transition ${active ? 'bg-indigo-600' : item.count > 0 ? 'bg-indigo-400' : 'bg-slate-200'}`}
                              style={{ height: `${Math.max(item.count > 0 ? 12 : 4, (item.count / maxHourlyDensity) * 120)}px` }}
                            ></div>
                            <span>{String(item.hour).padStart(2, '0')}h</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="min-w-[760px] h-48 border-b border-slate-200 pt-4">
                      <svg viewBox="0 0 720 160" className="h-40 w-full overflow-visible">
                        <path d={densityLinePath} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {lineChartPoints.map((point) => (
                          <g key={point.hour}>
                            <circle cx={point.x} cy={point.y} r={4} fill={point.count > 0 ? '#4f46e5' : '#cbd5e1'} />
                            {point.count > 0 && (
                              <text x={point.x} y={point.y - 9} textAnchor="middle" className="fill-slate-500 text-[9px] font-bold">
                                {point.count}
                              </text>
                            )}
                          </g>
                        ))}
                        {lineChartPoints.map((point) => (
                          <text key={`label-${point.hour}`} x={point.x} y={156} textAnchor="middle" className="fill-slate-400 text-[10px] font-bold">
                            {String(point.hour).padStart(2, '0')}h
                          </text>
                        ))}
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Doanh thu theo kỳ</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Tổng kỳ đang xem: <span className="text-emerald-600">{formatMoney(totalTrendRevenue)}</span>
                  </p>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1 text-[10px] font-bold">
                  {[
                    { value: 'day', label: 'Ngày' },
                    { value: 'week', label: 'Tuần' },
                    { value: 'month', label: 'Tháng' },
                    { value: 'quarter', label: 'Quý' },
                    { value: 'year', label: 'Năm' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRevenuePeriod(option.value as RevenuePeriod)}
                      className={`px-3 py-1.5 rounded-lg ${revenuePeriod === option.value ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${trendChartWidth} 220`}
                  className="h-72"
                  style={{ width: `${trendChartWidth}px`, minWidth: `${trendChartWidth}px` }}
                >
                  <line x1="16" y1="164" x2={trendChartWidth - 16} y2="164" stroke="#e2e8f0" strokeWidth="1" />

                  {revenueTrendRows.map((item, index) => {
                    const point = trendLinePoints[index];
                    const barHeight = Math.max(item.value > 0 ? 10 : 5, (item.value / maxTrendRevenue) * 118);
                    const active = item.value > 0 && item.value === maxTrendRevenue;
                    const barWidth = revenuePeriod === 'day' ? 22 : 32;
                    return (
                      <g key={item.key}>
                        {item.value > 0 && (
                          <text
                            x={point.x}
                            y={156 - barHeight}
                            textAnchor="middle"
                            className="fill-slate-400 text-[10px] font-bold"
                          >
                            {item.value.toLocaleString('vi-VN')}
                          </text>
                        )}
                        <rect
                          x={point.x - barWidth / 2}
                          y={164 - barHeight}
                          width={barWidth}
                          height={barHeight}
                          rx="6"
                          className={active ? 'fill-indigo-600' : item.value > 0 ? 'fill-indigo-300' : 'fill-slate-200'}
                        />
                        <text
                          x={point.x}
                          y="198"
                          textAnchor="middle"
                          className="fill-slate-400 text-[11px] font-bold"
                        >
                          {item.label}
                        </text>
                      </g>
                    );
                  })}

                  {trendLinePoints.length > 0 && (
                    <path d={trendLinePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {trendLinePoints.map((point) => (
                    <circle key={`line-${point.key}`} cx={point.x} cy={point.y} r={3.5} fill={point.value > 0 ? '#10b981' : '#cbd5e1'} />
                  ))}
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Exceptions Handler */}
        {activeSubTab === 'exceptions' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Phê Duyệt Xử Lý Sự Cố Khẩn Cấp</h3>
              <span className="text-xs text-slate-400 font-semibold">{incidents.filter(i => isOperationalIncident(i) && i.status === 'OPEN').length} sự cố chưa duyệt</span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="pb-3">Biển Số Xe</th>
                    <th className="pb-3">Loại Sự Cố</th>
                    <th className="pb-3">Chi tiết mô tả</th>
                    <th className="pb-3">Thời Gian Báo</th>
                    <th className="pb-3">Trạng Thái</th>
                    <th className="pb-3 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-755">
                  {incidents.filter((ex) => isOperationalIncident(ex)).map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 font-bold text-slate-800">{ex.licensePlate || 'Không có biển số'}</td>
                      <td className="py-4">
                        <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                          {formatIncidentTypeName(ex.incidentType)}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">{ex.description || 'N/A'}</td>
                      <td className="py-4 text-slate-450 font-medium">{ex.createdAt ? new Date(ex.createdAt).toLocaleString('vi-VN') : 'N/A'}</td>
                      <td className="py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ex.status === 'OPEN' ? 'bg-amber-50 border-amber-250 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {ex.status === 'OPEN' ? 'Đang chờ duyệt' : 'Đã giải quyết'}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {ex.status === 'OPEN' ? (
                          <button
                            onClick={() => resolveIncidentMutation.mutate(ex.id)}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer transition"
                          >
                            Xác nhận giải quyết
                          </button>
                        ) : (
                          <span className="text-slate-400 font-medium">Đã xử lý bởi {ex.resolvedByName || 'N/A'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {incidents.filter((ex) => isOperationalIncident(ex)).length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">Chưa có sự cố vận hành nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 7: Feedbacks */}
        {activeSubTab === 'feedbacks' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Ý kiến phản hồi từ khách hàng</h3>
              <label className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Lọc loại</span>
                <select
                  value={feedbackTypeFilter}
                  onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="INCIDENT">Báo cáo sự cố</option>
                  <option value="SUGGESTION">Góp ý</option>
                  <option value="COMPLAINT">Khiếu nại</option>
                  <option value="OTHER">Khác</option>
                </select>
              </label>
            </div>
            <div className="space-y-4 pt-2">
              {visibleFeedbacks.map((fb) => (
                <div key={fb.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{fb.userFullName || `Khách hàng #${fb.userId}`}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : 'N/A'}</p>
                    </div>
                    {(fb.feedbackType || fb.category) && (
                      <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">
                        {formatFeedbackTypeName(fb.feedbackType || fb.category)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-650 leading-relaxed font-semibold">{fb.content}</p>
                  {fb.rating && (
                    <div className="flex items-center text-amber-500 space-x-0.5 text-xs font-bold">
                      <span>Đánh giá: {fb.rating} / 5 sao</span>
                    </div>
                  )}
                </div>
              ))}
              {visibleFeedbacks.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">Chưa có ý kiến phản hồi nào.</div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// Subcomponent for pricing rows to handle local input changes
interface PricingRowProps {
  policy: any;
  onSave: (payload: PricingRequest) => void;
}
function PricingRow({ policy, onSave }: PricingRowProps) {
  const [hourlyRate, setHourlyRate] = useState(policy.hourlyRate || 0);
  const [hourlyBillingMode, setHourlyBillingMode] = useState(policy.hourlyBillingMode || 'PER_HOUR');
  const [hourlyBillingBlockHours, setHourlyBillingBlockHours] = useState(policy.hourlyBillingBlockHours || 1);
  const [dailyRate, setDailyRate] = useState(policy.dailyRate || 0);
  const [dailyBillingMode, setDailyBillingMode] = useState(policy.dailyBillingMode || 'PER_TURN');
  const [dailyBillingBlockHours, setDailyBillingBlockHours] = useState(policy.dailyBillingBlockHours || 1);
  const [monthlyRate, setMonthlyRate] = useState(policy.monthlyRate || 0);
  const [lostTicketFee, setLostTicketFee] = useState(policy.lostTicketFee || 0);

  return (
    <tr className="hover:bg-slate-50 transition align-middle">
      <td className="py-4 pr-4 align-middle"><span className="inline-flex max-w-full bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider truncate">{policy.vehicleTypeName}</span></td>
      <td className="py-4 px-3 font-semibold align-middle">
        <BillingModeControls
          amount={hourlyRate}
          mode={hourlyBillingMode}
          blockHours={hourlyBillingBlockHours}
          onAmountChange={setHourlyRate}
          onModeChange={setHourlyBillingMode}
          onBlockHoursChange={setHourlyBillingBlockHours}
        />
      </td>
      <td className="py-4 px-3 font-semibold align-middle">
        <BillingModeControls
          amount={dailyRate}
          mode={dailyBillingMode}
          blockHours={dailyBillingBlockHours}
          onAmountChange={setDailyRate}
          onModeChange={setDailyBillingMode}
          onBlockHoursChange={setDailyBillingBlockHours}
        />
      </td>
      <td className="py-4 px-3 font-semibold align-middle">
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-[96px] max-w-full text-center text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
            value={monthlyRate}
            onChange={(e) => setMonthlyRate(parseInt(e.target.value, 10) || 0)}
          />
          <span className="text-sm font-bold text-slate-800">đ</span>
        </div>
      </td>
      <td className="py-4 px-3 font-semibold align-middle">
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-[96px] max-w-full text-center text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
            value={lostTicketFee}
            onChange={(e) => setLostTicketFee(parseInt(e.target.value, 10) || 0)}
          />
          <span className="text-sm font-bold text-slate-800">đ</span>
        </div>
      </td>
      <td className="py-4 pl-4 text-center align-middle">
        <button
          onClick={() => onSave({
            vehicleTypeId: policy.vehicleTypeId,
            policyName: policy.policyName,
            hourlyRate,
            hourlyBillingMode,
            hourlyBillingBlockHours,
            dailyRate,
            dailyBillingMode,
            dailyBillingBlockHours,
            monthlyRate,
            lostTicketFee,
            overtimeFee: 0,
            status: policy.status,
          })}
          className="h-9 min-w-[92px] px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition shadow-sm"
        >
          Cập nhật
        </button>
      </td>
    </tr>
  );
}

interface BillingModeControlsProps {
  amount: number;
  mode: string;
  blockHours: number;
  onAmountChange: (value: number) => void;
  onModeChange: (value: string) => void;
  onBlockHoursChange: (value: number) => void;
}

function BillingModeControls({
  amount,
  mode,
  blockHours,
  onAmountChange,
  onModeChange,
  onBlockHoursChange,
}: BillingModeControlsProps) {
  const isPerTurn = mode === 'PER_TURN';
  const [hourDraft, setHourDraft] = useState(mode === 'PER_BLOCK' ? String(blockHours || 1) : '');

  useEffect(() => {
    setHourDraft(mode === 'PER_BLOCK' ? String(blockHours || 1) : '');
  }, [mode, blockHours]);

  const commitHourDraft = () => {
    if (isPerTurn) return;
    const trimmedValue = hourDraft.trim();
    if (!trimmedValue) {
      onModeChange('PER_HOUR');
      onBlockHoursChange(1);
      return;
    }

    const nextBlockHours = Math.min(Math.max(parseInt(trimmedValue, 10) || 1, 1), 24);
    if (nextBlockHours <= 1) {
      onModeChange('PER_HOUR');
      onBlockHoursChange(1);
      setHourDraft('');
      return;
    }

    onModeChange('PER_BLOCK');
    onBlockHoursChange(nextBlockHours);
    setHourDraft(String(nextBlockHours));
  };

  const handleUnitChange = (value: string) => {
    if (value === 'PER_TURN') {
      onModeChange('PER_TURN');
      setHourDraft('');
      return;
    }

    if (!hourDraft.trim()) {
      onModeChange('PER_HOUR');
      onBlockHoursChange(1);
      return;
    }

    commitHourDraft();
  };

  return (
    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
      <div className="flex items-center justify-center gap-1.5">
        <input
          type="number"
          min="0"
          className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-[84px] text-center text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
          value={amount}
          onChange={(e) => onAmountChange(parseInt(e.target.value, 10) || 0)}
        />
        <span className="text-sm font-bold text-slate-800">đ</span>
      </div>
      <span className="text-sm font-bold text-slate-800">/</span>
      {!isPerTurn && (
        <input
          type="number"
          min="1"
          max="24"
          value={hourDraft}
          onChange={(e) => setHourDraft(e.target.value)}
          onBlur={commitHourDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitHourDraft();
              e.currentTarget.blur();
            }
          }}
          className="h-9 w-12 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
          placeholder="1"
          title="Để trống mặc định là 1 giờ"
        />
      )}
      <select
        value={isPerTurn ? 'PER_TURN' : 'PER_HOUR'}
        onChange={(e) => handleUnitChange(e.target.value)}
        className="h-9 w-[72px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
      >
        <option value="PER_TURN">lượt</option>
        <option value="PER_HOUR">giờ</option>
      </select>
    </div>
  );
}
