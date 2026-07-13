import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { formatVehicleTypeName, formatSlotCodeName, formatSlotStatusName } from '../utils/vehicleDisplay';
import QrScannerModal from '../components/QrScannerModal';
import { adminService } from '../services/adminService';
import { parkingService } from '../services/parkingService';
import type {
  AdminUserCreateRequest,
  UserUpdateRequest,
  DeviceRequest,
  SettingRequest,
  VehicleView,
  VehicleTypeRequest,
  VehicleTypeView,
} from '../types/parking';

type MainTabType = 'overview' | 'slots' | 'vehicles' | 'accounts' | 'system' | 'passes';
type VehiclesSubTabType = 'vehicleList' | 'vehicleTypes';
type SystemSubTabType = 'hardware' | 'settings' | 'logs';

const formatMonthlyPassStatus = (status?: string) => {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE': return 'Đang hoạt động';
    case 'SCHEDULED': return 'Sắp hiệu lực';
    case 'PENDING_PAYMENT': return 'Chờ thanh toán';
    case 'EXPIRED': return 'Đã hết hạn';
    case 'CANCELLED': return 'Đã hủy';
    default: return status || 'Chưa rõ';
  }
};
export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MainTabType>('overview');

  const [vehiclesSubTab, setVehiclesSubTab] = useState<VehiclesSubTabType>('vehicleList');
  const [systemSubTab, setSystemSubTab] = useState<SystemSubTabType>('hardware');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // --- API QUERIES ---
  const { data: overviewData } = useQuery({
    queryKey: ['adminOverview'],
    queryFn: () => parkingService.getAdminDashboardOverview(),
    refetchInterval: 15000,
  });



  const { data: slots = [] } = useQuery({
    queryKey: ['managementSlotsList'],
    queryFn: () => parkingService.getManagementSlotsList(),
    refetchInterval: 10000,
  });

  const { data: vehicleTypes = [] } = useQuery<VehicleTypeView[]>({
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

  const { data: managementVehicles = [] } = useQuery<VehicleView[]>({
    queryKey: ['managementVehicles'],
    queryFn: () => parkingService.getManagementVehicles(),
  });

  // --- ADMIN MONTHLY PASSES QUERIES & MUTATIONS ---
  const { data: managerMonthlyPasses = [], isLoading: isPassesLoading } = useQuery({
    queryKey: ['managerMonthlyPasses'],
    queryFn: () => parkingService.getManagerMonthlyPasses(),
    enabled: activeTab === 'passes',
  });

  const confirmPassPaymentMutation = useMutation({
    mutationFn: ({ id, paymentMethod, referenceCode }: { id: number; paymentMethod: string; referenceCode: string }) =>
      parkingService.confirmManagerMonthlyPassPayment(id, { paymentMethod, referenceCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerMonthlyPasses'] });
      alert('Đã xác nhận thanh toán vé tháng thành công!');
    },
    onError: (err: any) => alert('Lỗi xác nhận thanh toán: ' + (err.response?.data?.message || err.message)),
  });

  const cancelPassMutation = useMutation({
    mutationFn: (id: number) => parkingService.cancelManagerMonthlyPass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerMonthlyPasses'] });
      alert('Đã hủy vé tháng thành công!');
    },
    onError: (err: any) => alert('Lỗi hủy vé tháng: ' + (err.response?.data?.message || err.message)),
  });

  const confirmPassPaymentByQrMutation = useMutation({
    mutationFn: (payload: { qrContent: string; paymentMethod: string; referenceCode: string }) =>
      parkingService.confirmManagerMonthlyPassPaymentByQr(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerMonthlyPasses'] });
      alert('Đã xác nhận thanh toán vé tháng qua QR thành công!');
    },
    onError: (err: any) => alert('Lỗi xác nhận thanh toán qua QR: ' + (err.response?.data?.message || err.message)),
  });

  const handleQrScanSuccess = (decodedText: string) => {
    console.log("Decoded monthly pass QR: ", decodedText);
    if (!decodedText.startsWith('MONTHLY_PASS')) {
      alert('Mã QR không đúng định dạng hóa đơn vé tháng.');
      return;
    }

    const refCode = window.prompt("Quét QR vé tháng thành công. Nhập mã giao dịch chuyển khoản ngân hàng (Reference Code):", "BANK-TXN-" + Date.now());
    if (refCode === null) return; // User cancelled

    confirmPassPaymentByQrMutation.mutate({
      qrContent: decodedText,
      paymentMethod: 'ONLINE_QR',
      referenceCode: refCode.trim() || 'BANK-TXN-' + Date.now(),
    });
    setIsQrScannerOpen(false);
  };



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

  // --- VEHICLE TYPES MUTATIONS ---
  const createVehicleTypeMutation = useMutation({
    mutationFn: (payload: VehicleTypeRequest) => parkingService.createVehicleType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] });
      alert('Đã thêm loại phương tiện mới thành công!');
      setNewTypeName('');
      setNewTypeDesc('');
      setNewTypeDailyRate('');
      setNewTypeMonthlyRate('');
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const updateVehicleTypeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: VehicleTypeRequest }) =>
      parkingService.updateVehicleType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] });
      alert('Đã cập nhật loại phương tiện thành công!');
      setEditingTypeId(null);
    },
    onError: (err: any) => alert('Lỗi: ' + (err.response?.data?.message || err.message)),
  });

  const deleteVehicleTypeMutation = useMutation({
    mutationFn: (id: number) => parkingService.deleteVehicleType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] });
      alert('Đã xóa loại phương tiện thành công.');
    },
    onError: (err: any) => alert('Lỗi xóa: ' + (err.response?.data?.message || err.message)),
  });

  // --- STATE FOR FORMS ---
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeDailyRate, setNewTypeDailyRate] = useState('');
  const [newTypeMonthlyRate, setNewTypeMonthlyRate] = useState('');

  // Editing state for vehicle types
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeDesc, setEditingTypeDesc] = useState('');
  const [editingTypeDailyRate, setEditingTypeDailyRate] = useState('');
  const [editingTypeMonthlyRate, setEditingTypeMonthlyRate] = useState('');


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
  const handleAddVehicleType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName) return;
    createVehicleTypeMutation.mutate({
      name: newTypeName.trim(),
      description: newTypeDesc.trim() || undefined,
      defaultHourlyFee: 0,
      dailyRate: newTypeDailyRate ? parseFloat(newTypeDailyRate) : 0,
      monthlyRate: newTypeMonthlyRate ? parseFloat(newTypeMonthlyRate) : 0,
    });
  };

  const handleUpdateVehicleType = (id: number) => {
    if (!editingTypeName) return;
    updateVehicleTypeMutation.mutate({
      id,
      payload: {
        name: editingTypeName.trim(),
        description: editingTypeDesc.trim() || undefined,
        defaultHourlyFee: 0,
        dailyRate: editingTypeDailyRate ? parseFloat(editingTypeDailyRate) : 0,
        monthlyRate: editingTypeMonthlyRate ? parseFloat(editingTypeMonthlyRate) : 0,
      },
    });
  };

  const handleDeleteVehicleType = (id: number, name: string) => {
    if (window.confirm(`Xác nhận xóa loại xe "${name}"? Điều này có thể ảnh hưởng tới các phân khu và vị trí đỗ trực thuộc.`)) {
      deleteVehicleTypeMutation.mutate(id);
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
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kênh Quản Trị Hệ Thống</h2>
            <p className="text-slate-400 text-xs mt-0.5">Quản lý cơ sở hạ tầng, tài khoản vận hành, thiết bị phần cứng, cài đặt tham số SLA và sao lưu hệ thống.</p>
          </div>
          <div className="bg-white border border-slate-200 px-4.5 py-2 rounded-2xl text-xs font-bold text-slate-600 flex items-center space-x-2.5 shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span>Thời gian hoạt động máy chủ: <strong>{systemStatus?.uptime || '99.9%'}</strong></span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 mt-6">
          {/* Sidebar Left Column */}
          <aside className="w-full lg:w-64 shrink-0 flex flex-col space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-4.5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`w-full text-left px-4.5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'slots' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Vị trí đỗ
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`w-full text-left px-4.5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'vehicles' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Loại xe & Giá cả
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`w-full text-left px-4.5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tài khoản người dùng
            </button>
            <button
              onClick={() => setActiveTab('passes')}
              className={`w-full text-left px-4.5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'passes' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50'
              }`}
            >
              Quản lý vé tháng cư dân
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`w-full text-left px-4.5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'system' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Hệ thống & Cài đặt
            </button>
          </aside>

          {/* Main Content Area Right Column */}
          <div className="flex-1 min-w-0">

        {/* Sub-tabs nav for grouped tabs */}


        {activeTab === 'vehicles' && (
          <div className="flex space-x-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit animate-in fade-in duration-205">
            <button
              onClick={() => setVehiclesSubTab('vehicleList')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                vehiclesSubTab === 'vehicleList' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Danh sách xe gửi
            </button>
            <button
              onClick={() => setVehiclesSubTab('vehicleTypes')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                vehiclesSubTab === 'vehicleTypes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Loại phương tiện
            </button>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="flex space-x-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit animate-in fade-in duration-205">
            <button
              onClick={() => setSystemSubTab('hardware')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                systemSubTab === 'hardware' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cấu hình thiết bị
            </button>
            <button
              onClick={() => setSystemSubTab('settings')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                systemSubTab === 'settings' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cài đặt & Sao lưu
            </button>
            <button
              onClick={() => setSystemSubTab('logs')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                systemSubTab === 'logs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Nhật ký audit
            </button>
          </div>
        )}

        {/* Tab: Overview Dashboard */}
        {activeTab === 'overview' && (
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
                  <span className="text-xs font-bold text-slate-800 mt-1.5 block leading-relaxed">
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



        {/* Tab: Slots Map & Toggle Status */}
        {activeTab === 'slots' && (
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-800">Sơ đồ quản trị các ô đỗ xe</h3>
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
                  if (slot.status === 'OCCUPIED') statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                  if (slot.status === 'RESERVED') statusBadge = 'bg-amber-50 text-amber-705 border-amber-100';
                  if (isMaintenance || slot.status === 'LOCKED') statusBadge = 'bg-rose-50 text-rose-705 border-rose-100';

                  return (
                    <div
                      key={slot.id}
                      className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-inner hover:shadow transition bg-slate-50/50"
                    >
                      <div>
                        <span className="font-mono font-black text-sm text-slate-800 tracking-wide">{formatSlotCodeName(slot.slotCode)}</span>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase mt-0.5">{formatVehicleTypeName(slot.vehicleTypeName)}</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded-[5px] font-bold border uppercase ${statusBadge}`}>
                          {formatSlotStatusName(slot.status)}
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

        {/* Tab: Vehicles Management */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tổng số phương tiện</span>
                  <span className="text-3xl font-black text-slate-800 mt-1 block">
                    {managementVehicles.length}
                  </span>
                </div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h5a1 1 0 011 1v8a1 1 0 01-1 1h-1m-6 0h-2" />
                  </svg>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Số lượng loại xe</span>
                  <span className="text-3xl font-black text-slate-800 mt-1 block">
                    {vehicleTypes.length}
                  </span>
                </div>
                <div className="w-12 h-12 bg-purple-50 text-purple-650 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Xe đang hoạt động</span>
                  <span className="text-3xl font-black text-emerald-650 mt-1 block">
                    {managementVehicles.filter((v: any) => v.status === 'ACTIVE').length}
                  </span>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Sub-tab 1: Danh sách xe gửi (vehicleList) */}
            {vehiclesSubTab === 'vehicleList' && (
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tất cả xe đăng ký trong hệ thống</h3>
                  <span className="text-xs font-bold text-slate-400">Tổng cộng: {managementVehicles.length} phương tiện</span>
                </div>

                {managementVehicles.length === 0 ? (
                  <div className="text-slate-400 text-center py-20 text-xs font-semibold">Chưa có phương tiện nào đăng ký trong hệ thống.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="pb-3 pr-4">Mã số</th>
                          <th className="pb-3 px-4">Biển số xe</th>
                          <th className="pb-3 px-4">Loại phương tiện</th>
                          <th className="pb-3 px-4">Hãng xe (Hiệu)</th>
                          <th className="pb-3 px-4">Màu sắc</th>
                          <th className="pb-3 pl-4 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                        {managementVehicles.map((v: VehicleView) => (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3.5 pr-4 font-mono text-slate-500">#{v.id}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 uppercase">
                              <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl tracking-wide">{v.plateNumber}</span>
                            </td>
                            <td className="py-3.5 px-4 text-indigo-700">{formatVehicleTypeName(v.vehicleTypeName || `Loại #${v.vehicleTypeId}`)}</td>
                            <td className="py-3.5 px-4 text-slate-700">{v.brand || '—'}</td>
                            <td className="py-3.5 px-4 text-slate-700">{v.color || '—'}</td>
                            <td className="py-3.5 pl-4 text-right">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${
                                v.status?.toUpperCase() === 'ACTIVE' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {v.status?.toUpperCase() === 'ACTIVE' ? 'Đang hoạt động' : (v.status || 'Khóa')}
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

            {/* Sub-tab 2: Loại phương tiện (vehicleTypes) */}
            {vehiclesSubTab === 'vehicleTypes' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Add new vehicle type */}
                <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                    Thêm loại xe mới
                  </h3>
                  <form onSubmit={handleAddVehicleType} className="space-y-4 text-xs font-semibold">
                    <div>
                      <label className="block text-slate-450 mb-1.5 uppercase">Tên loại xe *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Ô tô SUV 7 chỗ"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-450 mb-1.5 uppercase">Mô tả chi tiết</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Dành cho xe kích thước lớn"
                        value={newTypeDesc}
                        onChange={(e) => setNewTypeDesc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-450 mb-1.5 uppercase">Giá cả theo ngày (VND) *</label>
                      <input
                        type="number"
                        required
                        placeholder="Ví dụ: 50000"
                        value={newTypeDailyRate}
                        onChange={(e) => setNewTypeDailyRate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-450 mb-1.5 uppercase">Giá vé tháng (VND) *</label>
                      <input
                        type="number"
                        required
                        placeholder="Ví dụ: 1200000"
                        value={newTypeMonthlyRate}
                        onChange={(e) => setNewTypeMonthlyRate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={createVehicleTypeMutation.isPending}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                    >
                      {createVehicleTypeMutation.isPending ? 'Đang thêm...' : 'Thêm Loại Xe'}
                    </button>
                  </form>
                </div>

                {/* List vehicle types */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 mb-6">
                    Danh sách loại phương tiện hiện có
                  </h3>

                  {vehicleTypes.length === 0 ? (
                    <div className="text-slate-400 text-center py-20 text-xs font-semibold">Chưa cấu hình loại phương tiện nào.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                            <th className="pb-3 pr-4">Mã số</th>
                            <th className="pb-3 px-4">Tên loại xe</th>
                            <th className="pb-3 px-4">Mô tả</th>
                            <th className="pb-3 px-4 text-right">Giá đỗ/Ngày</th>
                            <th className="pb-3 px-4 text-right">Giá vé tháng</th>
                            <th className="pb-3 pl-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                          {vehicleTypes.map((vt: VehicleTypeView) => {
                            const isEditing = editingTypeId === vt.id;
                            return (
                              <tr key={vt.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-4 pr-4 font-mono text-slate-500">#{vt.id}</td>
                                <td className="py-4 px-4 font-bold text-slate-900">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingTypeName}
                                      onChange={(e) => setEditingTypeName(e.target.value)}
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                                    />
                                  ) : (
                                    vt.name
                                  )}
                                </td>
                                <td className="py-4 px-4 text-slate-500">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingTypeDesc}
                                      onChange={(e) => setEditingTypeDesc(e.target.value)}
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none w-full"
                                    />
                                  ) : (
                                    vt.description || '—'
                                  )}
                                </td>
                                <td className="py-4 px-4 text-right text-indigo-700 font-bold">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editingTypeDailyRate}
                                      onChange={(e) => setEditingTypeDailyRate(e.target.value)}
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none text-right w-20"
                                    />
                                  ) : (
                                    `${(vt.dailyRate ?? 0).toLocaleString()}đ`
                                  )}
                                </td>
                                <td className="py-4 px-4 text-right text-indigo-700 font-bold">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editingTypeMonthlyRate}
                                      onChange={(e) => setEditingTypeMonthlyRate(e.target.value)}
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none text-right w-24"
                                    />
                                  ) : (
                                    `${(vt.monthlyRate ?? 0).toLocaleString()}đ`
                                  )}
                                </td>
                                <td className="py-4 pl-4 text-right space-x-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateVehicleType(vt.id)}
                                        className="text-emerald-600 hover:text-emerald-700 font-bold hover:bg-emerald-50 px-2 py-1 rounded transition cursor-pointer"
                                      >
                                        Lưu
                                      </button>
                                      <button
                                        onClick={() => setEditingTypeId(null)}
                                        className="text-slate-500 hover:text-slate-600 font-bold hover:bg-slate-100 px-2 py-1 rounded transition cursor-pointer"
                                      >
                                        Hủy
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingTypeId(vt.id);
                                          setEditingTypeName(vt.name);
                                          setEditingTypeDesc(vt.description || '');
                                          setEditingTypeDailyRate(vt.dailyRate?.toString() || '');
                                          setEditingTypeMonthlyRate(vt.monthlyRate?.toString() || '');
                                        }}
                                        className="text-indigo-600 hover:text-indigo-700 font-bold hover:bg-indigo-50 px-2 py-1 rounded transition cursor-pointer"
                                      >
                                        Sửa
                                      </button>
                                      <button
                                        onClick={() => handleDeleteVehicleType(vt.id, vt.name)}
                                        className="text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer"
                                      >
                                        Xóa
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Accounts Management */}
        {activeTab === 'accounts' && (
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  >
                    <option value="STAFF">Nhân viên trực cổng (STAFF)</option>
                    <option value="MANAGER">Quản lý (MANAGER)</option>
                    <option value="ADMIN">Quản trị tối cao (ADMIN)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
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
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Họ và tên</th>
                      <th className="pb-3 px-4">Email</th>
                      <th className="pb-3 px-4">Quyền hạn</th>
                      <th className="pb-3 px-4">Ngày tạo</th>
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
                        <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
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
        {activeTab === 'system' && systemSubTab === 'hardware' && (
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
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
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
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
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
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
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition cursor-pointer"
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
        {activeTab === 'system' && systemSubTab === 'settings' && (
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
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
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
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
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
                        <td className="py-3.5 px-4 font-bold text-indigo-700">{set.value}</td>
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
        {activeTab === 'system' && systemSubTab === 'logs' && (
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
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
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

        {/* Tab 6: Monthly Passes Management for Admin */}
        {activeTab === 'passes' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
                <h3 className="text-sm font-bold text-slate-800">Danh Sách Đăng Ký Vé Tháng Cư Dân (Admin Panel)</h3>
                <button
                  onClick={() => setIsQrScannerOpen(true)}
                  className="inline-flex items-center justify-center px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-emerald-600/10 active:scale-98"
                >
                  <svg className="w-4.5 h-4.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m0 11v2m5-10v-1m-10 1v-1M5 8h2m10 0h2m-14 4h2m10 0h2m-14 4h2m10 0h2M7 16h10M7 12h10M7 8h10" />
                  </svg>
                  Quét QR Xác Nhận
                </button>
              </div>
              
              {isPassesLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs">Đang tải danh sách vé tháng...</div>
              ) : managerMonthlyPasses.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">Không có đăng ký vé tháng nào.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-2">ID</th>
                        <th className="pb-3 px-2">Biển Số Xe</th>
                        <th className="pb-3 px-2">Vị Trí</th>
                        <th className="pb-3 px-2">Hạn Hiệu Lực</th>
                        <th className="pb-3 px-2 text-right">Tổng Tiền</th>
                        <th className="pb-3 px-2 text-center">Trạng Thái</th>
                        <th className="pb-3 px-2 text-right">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {managerMonthlyPasses.map((p: any) => {
                        const startStr = p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : '—';
                        const endStr = p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : '—';
                        const isPending = p.status?.toUpperCase() === 'PENDING_PAYMENT';
                        
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-2 font-mono text-slate-400">#{p.id}</td>
                            <td className="py-3 px-2">
                              <span className="font-mono text-slate-900 uppercase block">{p.licensePlate || `Xe #${p.vehicleId}`}</span>
                              <span className="text-[9px] text-slate-400 block font-normal">{formatVehicleTypeName(p.vehicleTypeName)}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-slate-700 block font-bold">{formatSlotCodeName(p.slotCode) || 'Chưa xếp'}</span>
                              <span className="text-[9px] text-slate-400 block font-normal">Trạng thái ô đỗ: {formatSlotStatusName(p.slotStatus) || '—'}</span>
                            </td>
                            <td className="py-3 px-2 text-slate-500 font-mono text-[9px]">
                              <div>Từ: {startStr}</div>
                              <div>Đến: {endStr}</div>
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-indigo-600 font-bold">
                              {Number(p.totalAmount || 0).toLocaleString('vi-VN')}đ
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase ${
                                p.status === 'ACTIVE' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : p.status === 'SCHEDULED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : p.status === 'PENDING_PAYMENT'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {formatMonthlyPassStatus(p.status)}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              {isPending ? (
                                <div className="flex flex-col xl:flex-row justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      const refCode = window.prompt(`Xác nhận thanh toán chuyển khoản cho vé tháng #${p.id}. Nhập mã giao dịch ngân hàng (Reference Code):`, "BANK-TXN-" + Date.now());
                                      if (refCode === null) return; // User cancelled
                                      confirmPassPaymentMutation.mutate({
                                        id: p.id,
                                        paymentMethod: 'ONLINE_QR',
                                        referenceCode: refCode.trim() || 'BANK-TXN-' + Date.now(),
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded text-[9px] font-bold transition cursor-pointer"
                                  >
                                    Xác nhận CK
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Bạn có chắc chắn muốn hủy đăng ký vé tháng #${p.id}?`)) {
                                        cancelPassMutation.mutate(p.id);
                                      }
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded text-[9px] font-bold transition cursor-pointer"
                                  >
                                    Hủy Vé
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-normal italic">Đã thanh toán</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
    {/* QR Scanner Modal for Monthly Pass Confirmations */}
    <QrScannerModal
      isOpen={isQrScannerOpen}
      onClose={() => setIsQrScannerOpen(false)}
      onScanSuccess={handleQrScanSuccess}
      title="Quét QR Hóa Đơn Vé Tháng Cư Dân"
    />
      </main>
    </div>
  );
}
