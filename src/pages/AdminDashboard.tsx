import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { adminService } from '../services/adminService';
import { parkingService } from '../services/parkingService';
import type {
  AdminUserCreateRequest,
  UserUpdateRequest,
  DeviceRequest,
  SettingRequest,
  BuildingRequest,
  FloorRequest,
  ZoneRequest,
} from '../types/parking';

type ActiveSubTabType = 
  | 'overview' 
  | 'buildings' 
  | 'floors' 
  | 'zones' 
  | 'slots' 
  | 'accounts' 
  | 'hardware' 
  | 'settings' 
  | 'logs';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTabType>('overview');

  // --- API QUERIES ---
  const { data: overviewData } = useQuery({
    queryKey: ['adminOverview'],
    queryFn: () => parkingService.getAdminDashboardOverview(),
    refetchInterval: 15000,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['managementBuildings'],
    queryFn: () => parkingService.getManagementBuildings(),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['managementFloors'],
    queryFn: () => parkingService.getManagementFloors(),
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['managementZonesAllowed'],
    queryFn: () => parkingService.getManagementZonesAllowed(),
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['managementSlotsList'],
    queryFn: () => parkingService.getManagementSlotsList(),
    refetchInterval: 10000,
  });

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => parkingService.getVehicleTypes(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminService.getUsers(),
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: () => adminService.getDevices(),
  });

  const { data: systemSettings = [] } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: () => adminService.getSettings(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => parkingService.getAuditLogs(),
    refetchInterval: 20000,
  });

  const { data: systemStatus } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => parkingService.getSystemOperations(),
    refetchInterval: 30000,
  });

  const { data: latestBackup } = useQuery({
    queryKey: ['latestBackup'],
    queryFn: () => parkingService.getLatestBackup(),
  });

  // --- INFRASTRUCTURE MUTATIONS ---
  const createBuildingMutation = useMutation({
    mutationFn: (payload: BuildingRequest) => parkingService.createManagementBuilding(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementBuildings'] });
      alert('Đã thêm tòa nhà mới thành công!');
      setNewBuildingName('');
      setNewBuildingCode('');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: (id: number) => parkingService.deleteManagementBuilding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementBuildings'] });
      alert('Đã xóa tòa nhà thành công.');
    },
    onError: (err: any) => alert('Lỗi xóa: ' + (err.response?.data?.message || err.message)),
  });

  const createFloorMutation = useMutation({
    mutationFn: (payload: FloorRequest) => parkingService.createManagementFloor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementFloors'] });
      alert('Đã thêm tầng mới thành công!');
      setNewFloorName('');
      setNewFloorBuildingId('');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const deleteFloorMutation = useMutation({
    mutationFn: (id: number) => parkingService.deleteManagementFloor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementFloors'] });
      alert('Đã xóa tầng thành công.');
    },
    onError: (err: any) => alert('Lỗi xóa: ' + (err.response?.data?.message || err.message)),
  });

  const createZoneMutation = useMutation({
    mutationFn: (payload: ZoneRequest) => parkingService.createManagementZone(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementZonesAllowed'] });
      alert('Đã thêm phân khu mới thành công!');
      setNewZoneName('');
      setNewZoneFloorId('');
      setNewZoneVehicleTypeId('');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: number) => parkingService.deleteManagementZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementZonesAllowed'] });
      alert('Đã xóa phân khu thành công.');
    },
    onError: (err: any) => alert('Lỗi xóa: ' + (err.response?.data?.message || err.message)),
  });

  const patchSlotStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      parkingService.patchManagementSlotStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementSlotsList'] });
      queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
    },
    onError: (err: any) => alert('Lỗi cập nhật trạng thái ô đỗ: ' + (err.response?.data?.message || err.message)),
  });

  // --- ACCOUNTS & DEVICES MUTATIONS ---
  const createUserMutation = useMutation({
    mutationFn: (payload: AdminUserCreateRequest) => adminService.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      alert('Đã tạo tài khoản mới thành công!');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UserUpdateRequest }) =>
      adminService.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const createDeviceMutation = useMutation({
    mutationFn: (payload: DeviceRequest) => adminService.createDevice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      alert('Đã thêm thiết bị mới!');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DeviceRequest }) =>
      adminService.updateDevice(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const saveSettingMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: SettingRequest }) =>
      adminService.saveSetting(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      alert('Đã lưu cài đặt!');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const triggerBackupMutation = useMutation({
    mutationFn: () => parkingService.createBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latestBackup'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      alert('Đã tiến hành sao lưu dữ liệu thủ công thành công!');
    },
    onError: (err: any) => alert('Lỗi sao lưu: ' + (err.response?.data?.message || err.message)),
  });

  // --- STATE FOR FORMS ---
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingCode, setNewBuildingCode] = useState('');

  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorBuildingId, setNewFloorBuildingId] = useState('');

  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFloorId, setNewZoneFloorId] = useState('');
  const [newZoneVehicleTypeId, setNewZoneVehicleTypeId] = useState('');

  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('STAFF');

  const [newDeviceCode, setNewDeviceCode] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('CAMERA');
  const [newDeviceLane, setNewDeviceLane] = useState('LANE_IN');
  const [newDeviceConfig, setNewDeviceConfig] = useState('{}');

  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingVal, setNewSettingVal] = useState('');
  const [newSettingDesc, setNewSettingDesc] = useState('');

  // Handlers
  const handleAddBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName) return;
    createBuildingMutation.mutate({
      name: newBuildingName.trim(),
      address: newBuildingCode.trim(),
    });
  };

  const handleAddFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName || !newFloorBuildingId) return;
    createFloorMutation.mutate({
      buildingId: parseInt(newFloorBuildingId, 10),
      floorName: newFloorName.trim(),
      floorNumber: 1,
    });
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName || !newZoneFloorId || !newZoneVehicleTypeId) return;
    createZoneMutation.mutate({
      floorId: parseInt(newZoneFloorId, 10),
      zoneName: newZoneName.trim(),
      vehicleTypeId: parseInt(newZoneVehicleTypeId, 10),
    });
  };

  const handleDeleteBuilding = (id: number, name: string) => {
    if (window.confirm(`Xác nhận xóa tòa nhà ${name}? Điều này sẽ ảnh hưởng tới các tầng và phân khu trực thuộc.`)) {
      deleteBuildingMutation.mutate(id);
    }
  };

  const handleDeleteFloor = (id: number, name: string) => {
    if (window.confirm(`Xác nhận xóa tầng ${name}?`)) {
      deleteFloorMutation.mutate(id);
    }
  };

  const handleDeleteZone = (id: number, name: string) => {
    if (window.confirm(`Xác nhận xóa phân khu ${name}?`)) {
      deleteZoneMutation.mutate(id);
    }
  };

  const handleToggleSlotStatus = (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    patchSlotStatusMutation.mutate({ id, status: nextStatus });
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newPassword) return;
    createUserMutation.mutate({
      fullName: newFullName.trim(),
      email: newEmail.trim().toLowerCase(),
      password: newPassword,
      role: newRole,
    });
    setNewFullName('');
    setNewEmail('');
    setNewPassword('');
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceCode) return;
    createDeviceMutation.mutate({
      deviceCode: newDeviceCode.trim().toUpperCase(),
      deviceType: newDeviceType,
      laneCode: newDeviceLane,
      status: 'ONLINE',
      configurationJson: newDeviceConfig,
    });
    setNewDeviceCode('');
    setNewDeviceConfig('{}');
  };

  const handleAddSetting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSettingKey || !newSettingVal) return;
    saveSettingMutation.mutate({
      key: newSettingKey.trim(),
      payload: { value: newSettingVal, description: newSettingDesc },
    });
    setNewSettingKey('');
    setNewSettingVal('');
    setNewSettingDesc('');
  };

  const handleToggleLock = (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    updateUserMutation.mutate({ id, payload: { status: nextStatus } });
  };

  const handleResetPassword = (id: number) => {
    const defaultPass = '12345678aA@';
    updateUserMutation.mutate({ id, payload: { newPassword: defaultPass } });
    alert(`Mật khẩu tài khoản đã được đặt lại thành: ${defaultPass}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Title */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-805 tracking-tight">Kênh Quản Trị Hệ Thống (System Admin Panel)</h2>
            <p className="text-slate-400 text-xs mt-0.5">Quản lý cơ sở hạ tầng, tài khoản vận hành, thiết bị phần cứng, cài đặt tham số SLA và sao lưu hệ thống.</p>
          </div>
          <div className="bg-white border border-slate-200 px-4.5 py-2 rounded-2xl text-xs font-bold text-slate-600 flex items-center space-x-2.5 shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span>Uptime máy chủ: <strong>{systemStatus?.uptime || '99.9%'}</strong></span>
          </div>
        </div>

        {/* Sub tabs nav */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto space-x-2 pb-1 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'overview' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Tổng quan bãi đỗ
          </button>
          <button
            onClick={() => setActiveSubTab('buildings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'buildings' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Tòa nhà
          </button>
          <button
            onClick={() => setActiveSubTab('floors')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'floors' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Tầng
          </button>
          <button
            onClick={() => setActiveSubTab('zones')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'zones' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Phân khu
          </button>
          <button
            onClick={() => setActiveSubTab('slots')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'slots' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Vị trí đỗ (Slots Map)
          </button>
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'accounts' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Quản Lý Tài Khoản
          </button>
          <button
            onClick={() => setActiveSubTab('hardware')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'hardware' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Cấu Hình Thiết Bị
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'settings' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Cài Đặt & Sao Lưu
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'logs' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Nhật Ký Audit
          </button>
        </div>

        {/* Tab: Overview Dashboard */}
        {activeSubTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Active Sessions */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Lượt đỗ hoạt động</span>
                  <span className="text-3xl font-black text-slate-800 mt-1 block">
                    {overviewData?.totalActiveSessions ?? 0}
                  </span>
                </div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Slots counts */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tình trạng ô đỗ</span>
                  <span className="text-xs font-bold text-slate-805 mt-1.5 block leading-relaxed">
                    Bận: <strong className="text-indigo-600 font-extrabold">{overviewData?.occupiedSlots ?? 0}</strong> • 
                    Đặt trước: <strong className="text-amber-600 font-extrabold">{overviewData?.reservedSlots ?? 0}</strong> • 
                    Trống: <strong className="text-emerald-600 font-extrabold">{overviewData?.availableSlots ?? 0}</strong>
                  </span>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Today's Revenue */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Doanh thu hôm nay</span>
                  <span className="text-2xl font-black text-slate-800 mt-1 block">
                    {Number(overviewData?.todayRevenue || 0).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="w-12 h-12 bg-purple-50 text-purple-650 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Card 4: Pending Payments */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Yêu cầu thanh toán chờ</span>
                  <span className="text-3xl font-black text-slate-850 mt-1 block">
                    {overviewData?.pendingPaymentsCount ?? 0}
                  </span>
                </div>
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab: Buildings CRUD */}
        {activeSubTab === 'buildings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                Thêm tòa nhà mới
              </h3>
              <form onSubmit={handleAddBuilding} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Tên tòa nhà *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Tòa nhà A (Building A)"
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Mã / Mô tả ngắn</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: BLDG_A"
                    value={newBuildingCode}
                    onChange={(e) => setNewBuildingCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createBuildingMutation.isPending}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                >
                  {createBuildingMutation.isPending ? 'Đang thêm...' : 'Thêm Tòa Nhà'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 mb-6">
                Danh sách tòa nhà hiện có
              </h3>
              
              {buildings.length === 0 ? (
                <div className="text-slate-400 text-center py-20 text-xs">Chưa có tòa nhà nào được khởi tạo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3 pr-4">Mã tòa nhà</th>
                        <th className="pb-3 px-4">Tên tòa nhà</th>
                        <th className="pb-3 pl-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {buildings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 pr-4 font-mono text-slate-805">#{b.id}</td>
                          <td className="py-4 px-4 font-bold text-slate-905">{b.name}</td>
                          <td className="py-4 pl-4 text-right">
                            <button
                              onClick={() => handleDeleteBuilding(b.id, b.name)}
                              className="text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Floors CRUD */}
        {activeSubTab === 'floors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                Thêm tầng mới
              </h3>
              <form onSubmit={handleAddFloor} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Chọn tòa nhà *</label>
                  <select
                    value={newFloorBuildingId}
                    onChange={(e) => setNewFloorBuildingId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn tòa nhà --</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Tên tầng *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Tầng hầm B1"
                    value={newFloorName}
                    onChange={(e) => setNewFloorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createFloorMutation.isPending}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                >
                  {createFloorMutation.isPending ? 'Đang thêm...' : 'Thêm Tầng'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 mb-6">
                Danh sách tầng hiện có
              </h3>
              
              {floors.length === 0 ? (
                <div className="text-slate-400 text-center py-20 text-xs">Chưa có tầng nào được khởi tạo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3 pr-4">Mã tầng</th>
                        <th className="pb-3 px-4">Tên tầng</th>
                        <th className="pb-3 px-4">Tòa nhà trực thuộc</th>
                        <th className="pb-3 pl-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {floors.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 pr-4 font-mono text-slate-805">#{f.id}</td>
                          <td className="py-4 px-4 font-bold text-slate-905">{f.floorName}</td>
                          <td className="py-4 px-4 text-slate-500">Mã tòa nhà #{f.buildingId}</td>
                          <td className="py-4 pl-4 text-right">
                            <button
                              onClick={() => handleDeleteFloor(f.id, f.floorName)}
                              className="text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Zones CRUD */}
        {activeSubTab === 'zones' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                Thêm phân khu mới
              </h3>
              <form onSubmit={handleAddZone} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Chọn tầng trực thuộc *</label>
                  <select
                    value={newZoneFloorId}
                    onChange={(e) => setNewZoneFloorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn tầng --</option>
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>{f.floorName} (Tòa #{f.buildingId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Tên phân khu (Zone) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Khu A"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Loại xe cho phép *</label>
                  <select
                    value={newZoneVehicleTypeId}
                    onChange={(e) => setNewZoneVehicleTypeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn loại xe --</option>
                    {vehicleTypes.map((vt) => (
                      <option key={vt.id} value={vt.id}>{vt.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={createZoneMutation.isPending}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                >
                  {createZoneMutation.isPending ? 'Đang thêm...' : 'Thêm Phân Khu'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 mb-6">
                Danh sách phân khu hiện có
              </h3>
              
              {zones.length === 0 ? (
                <div className="text-slate-400 text-center py-20 text-xs">Chưa có phân khu nào được khởi tạo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3 pr-4">Mã phân khu</th>
                        <th className="pb-3 px-4">Tên phân khu</th>
                        <th className="pb-3 px-4">Loại xe allowed</th>
                        <th className="pb-3 pl-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {zones.map((z) => (
                        <tr key={z.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 pr-4 font-mono text-slate-805">#{z.id}</td>
                          <td className="py-4 px-4 font-bold text-slate-905">{z.zoneName}</td>
                          <td className="py-4 px-4 text-indigo-750">{z.vehicleTypeName || `Loại #${z.vehicleTypeId}`}</td>
                          <td className="py-4 pl-4 text-right">
                            <button
                              onClick={() => handleDeleteZone(z.id, z.zoneName)}
                              className="text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Slots Map & Toggle Status */}
        {activeSubTab === 'slots' && (
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-805">Sơ đồ quản trị các ô đỗ xe</h3>
              <span className="text-[10px] text-slate-400 font-bold">Tổng số: {slots.length} vị trí đỗ</span>
            </div>

            {slots.length === 0 ? (
              <div className="text-slate-400 text-center py-20 text-xs">Chưa có ô đỗ xe nào được cấu hình.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {slots.map((slot) => {
                  const isAvailable = slot.status === 'AVAILABLE';
                  const isMaintenance = slot.status === 'MAINTENANCE';

                  let statusBadge = 'bg-emerald-50 text-emerald-705 border-emerald-100';
                  if (slot.status === 'OCCUPIED') statusBadge = 'bg-indigo-50 text-indigo-705 border-indigo-100';
                  if (slot.status === 'RESERVED') statusBadge = 'bg-amber-50 text-amber-705 border-amber-100';
                  if (isMaintenance || slot.status === 'LOCKED') statusBadge = 'bg-rose-50 text-rose-705 border-rose-100';

                  return (
                    <div
                      key={slot.id}
                      className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-inner hover:shadow transition bg-slate-50/50"
                    >
                      <div>
                        <span className="font-mono font-black text-sm text-slate-800 tracking-wide">{slot.slotCode}</span>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase mt-0.5">{slot.vehicleTypeName || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded-[5px] font-bold border uppercase ${statusBadge}`}>
                          {slot.status}
                        </span>
                      </div>

                      {/* Manual status toggle button */}
                      <button
                        type="button"
                        onClick={() => handleToggleSlotStatus(slot.id, slot.status)}
                        className={`w-full py-1.5 rounded-xl text-[9px] font-bold cursor-pointer transition border text-center ${
                          isAvailable
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100'
                        }`}
                      >
                        {isAvailable ? 'Đặt Bảo Trì' : 'Giải Phóng'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Accounts Management */}
        {activeSubTab === 'accounts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Tạo Tài Khoản Mới</h3>
              <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Email đăng nhập</label>
                  <input
                    type="email"
                    required
                    placeholder="email@vidu.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Mật khẩu ban đầu</label>
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Quyền hạn (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-805 focus:outline-none"
                  >
                    <option value="STAFF">Nhân viên trực cổng (STAFF)</option>
                    <option value="MANAGER">Quản lý (MANAGER)</option>
                    <option value="ADMIN">Quản trị tối cao (ADMIN)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                >
                  {createUserMutation.isPending ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Danh Sách Tài Khoản Nhân Viên / Vận Hành</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Họ và tên</th>
                      <th className="pb-3 px-4">Email</th>
                      <th className="pb-3 px-4">Quyền hạn</th>
                      <th className="pb-3 px-4">Trạng thái</th>
                      <th className="pb-3 pl-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {accounts.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pr-4 text-slate-900 font-bold">{user.fullName}</td>
                        <td className="py-3.5 px-4 font-mono">{user.email}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                            user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {user.status === 'ACTIVE' ? 'Hoạt động' : 'Bị Khóa'}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleLock(user.id, user.status)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                              user.status === 'ACTIVE'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100'
                            }`}
                          >
                            {user.status === 'ACTIVE' ? 'Khóa' : 'Kích hoạt'}
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hardware config */}
        {activeSubTab === 'hardware' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Đăng Ký Thiết Bị Mới</h3>
              <form onSubmit={handleAddDevice} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-slate-500 mb-1">Mã thiết bị (Device Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: CAM_IN_01"
                    value={newDeviceCode}
                    onChange={(e) => setNewDeviceCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Loại thiết bị</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-805 focus:outline-none"
                  >
                    <option value="CAMERA">Camera nhận diện biển số (ANPR)</option>
                    <option value="BARRIER">Bộ điều khiển barrier</option>
                    <option className="LED_DISPLAY">Bảng LED hiển thị số chỗ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Gán làn đường (Lane)</label>
                  <select
                    value={newDeviceLane}
                    onChange={(e) => setNewDeviceLane(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-805 focus:outline-none"
                  >
                    <option value="LANE_IN">Làn vào số 1 (LANE_IN)</option>
                    <option value="LANE_OUT">Làn ra số 1 (LANE_OUT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Cấu hình JSON (Config)</label>
                  <textarea
                    rows={3}
                    value={newDeviceConfig}
                    onChange={(e) => setNewDeviceConfig(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-mono text-[10px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createDeviceMutation.isPending}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                >
                  {createDeviceMutation.isPending ? 'Đang thêm...' : 'Thêm Thiết Bị'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Danh Sách Thiết Bị Trực Thuộc Hệ Thống</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Mã thiết bị</th>
                      <th className="pb-3 px-4">Phân loại</th>
                      <th className="pb-3 px-4">Làn gán</th>
                      <th className="pb-3 px-4">Trạng thái</th>
                      <th className="pb-3 pl-4 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {devices.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pr-4 text-slate-900 font-bold font-mono">{dev.deviceCode}</td>
                        <td className="py-3.5 px-4 font-bold text-indigo-700">{dev.deviceType}</td>
                        <td className="py-3.5 px-4 text-slate-500">{dev.laneCode}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                            dev.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-705 border-emerald-100' : 'bg-rose-50 text-rose-705 border-rose-100'
                          }`}>
                            {dev.status}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <button
                            onClick={() => {
                              const nextStatus = dev.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
                              updateDeviceMutation.mutate({ id: dev.id, payload: { ...dev, status: nextStatus } });
                            }}
                            className="text-indigo-600 hover:text-indigo-750 hover:bg-indigo-50 px-2 py-1 rounded transition cursor-pointer"
                          >
                            Đổi trạng thái
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: System settings & Backup */}
        {activeSubTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Thiết Lập Tham Số</h3>
                <form onSubmit={handleAddSetting} className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 mb-1">Mã khóa (Key)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: SLA_RESPONSE_TIMEOUT"
                      value={newSettingKey}
                      onChange={(e) => setNewSettingKey(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Giá trị thiết lập (Value)</label>
                    <input
                      type="text"
                      required
                      placeholder="Giá trị"
                      value={newSettingVal}
                      onChange={(e) => setNewSettingVal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Mô tả ngắn</label>
                    <input
                      type="text"
                      placeholder="Mô tả"
                      value={newSettingDesc}
                      onChange={(e) => setNewSettingDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saveSettingMutation.isPending}
                    className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                  >
                    {saveSettingMutation.isPending ? 'Đang lưu...' : 'Lưu Tham Số'}
                  </button>
                </form>
              </div>

              {/* Data backup section */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Sao Lưu Dữ Liệu</h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Tiến hành sao lưu snapshot cơ sở dữ liệu ngay lập tức. Các bản sao lưu tự động diễn ra lúc 0h hằng ngày.
                </p>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-mono leading-relaxed">
                  <p>Bản sao lưu gần nhất:</p>
                  <p className="font-bold text-indigo-950 mt-0.5">{latestBackup?.filePath || 'bld_backup_2026_07_01.sql'}</p>
                  <p className="text-slate-450 text-[9px]">Thời gian: {latestBackup?.createdAt ? new Date(latestBackup.createdAt).toLocaleString('vi-VN') : 'Mới đây'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerBackupMutation.mutate()}
                  disabled={triggerBackupMutation.isPending}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {triggerBackupMutation.isPending ? 'Đang sao lưu...' : 'Tiến Hành Sao Lưu Thủ Công'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Các Tham Số Hệ Thống Hoạt Động</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Mã tham số</th>
                      <th className="pb-3 px-4">Giá trị hoạt động</th>
                      <th className="pb-3 px-4">Mô tả</th>
                      <th className="pb-3 pl-4 text-right">Lịch sử thay đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {systemSettings.map((set) => (
                      <tr key={set.key} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pr-4 text-slate-900 font-bold font-mono">{set.key}</td>
                        <td className="py-3.5 px-4 font-bold text-indigo-705">{set.value}</td>
                        <td className="py-3.5 px-4 text-slate-500">{set.description || 'Không có mô tả'}</td>
                        <td className="py-3.5 pl-4 text-right text-[10px] text-slate-400">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeSubTab === 'logs' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex justify-between items-center">
              <span>Bảng Ghi Nhật Ký Bảo Mật & Audit Logs Hệ Thống</span>
              <span className="text-xs text-slate-400 font-bold">Refreshed tự động</span>
            </h3>
            
            {auditLogs.length === 0 ? (
              <div className="text-slate-400 text-center py-20 text-xs">Nhật ký hệ thống trống rỗng.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-155 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Thời gian</th>
                      <th className="pb-3 px-4">Hành động / Sự kiện</th>
                      <th className="pb-3 px-4">Tác nhân tác động</th>
                      <th className="pb-3 px-4">Chi tiết kỹ thuật</th>
                      <th className="pb-3 pl-4 text-right">Phân loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pr-4 text-slate-500 font-mono text-[10px]">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 uppercase tracking-wide text-[10px]">{log.action}</td>
                        <td className="py-3.5 px-4 text-slate-650">{log.operatorEmail || 'System'}</td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500 truncate max-w-xs">{log.details || '—'}</td>
                        <td className="py-3.5 pl-4 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase bg-indigo-50 text-indigo-700 border-indigo-100">
                            {log.entityType || 'SYSTEM'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
