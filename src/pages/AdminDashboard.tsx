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
} from '../types/parking';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'hardware' | 'settings' | 'logs'>('accounts');

  // --- API QUERIES ---
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

  // --- MUTATIONS ---
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
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Kênh Quản Trị Hệ Thống (System Admin Panel)</h2>
            <p className="text-slate-400 text-sm mt-0.5">Quản lý tài khoản vận hành, thiết bị phần cứng, cài đặt tham số SLA và sao lưu hệ thống.</p>
          </div>
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-xs font-bold text-slate-650 flex items-center space-x-2.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span>Uptime máy chủ: <strong>{systemStatus?.uptime || '99.9%'} (SLA: 3s)</strong></span>
          </div>
        </div>

        {/* Sub tabs nav */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto space-x-2 pb-1 scrollbar-none">
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
            Nhật Ký Audit Logs
          </button>
        </div>

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
                    placeholder="Ví dụ: staff_a@building.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-805 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Mật khẩu ban đầu</label>
                  <input
                    type="password"
                    required
                    placeholder="Ví dụ: 12345678aA@"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-808 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Vai trò hệ thống</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-805 focus:outline-none font-bold"
                  >
                    <option value="STAFF">PARKING_STAFF (Nhân viên trực cổng)</option>
                    <option value="MANAGER">PARKING_MANAGER (Quản lý bãi xe)</option>
                    <option value="ADMINISTRATOR">ADMINISTRATOR (Quản trị hệ thống)</option>
                    <option value="PARKING_USER">PARKING_USER (Tài xế/Khách hàng)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm"
                >
                  Tạo tài khoản mới
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Danh Sách Người Dùng & Phân Quyền</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                      <th className="pb-3">Tài Khoản / Tên</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Vai Trò</th>
                      <th className="pb-3">Trạng Thái</th>
                      <th className="pb-3 text-center">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5">
                          <p className="font-bold text-slate-805">{acc.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">UID: #{acc.id}</p>
                        </td>
                        <td className="py-3.5 font-semibold text-slate-500">{acc.email}</td>
                        <td className="py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            acc.role === 'ADMINISTRATOR' || acc.role === 'ADMIN' ? 'bg-rose-50 border border-rose-100 text-rose-700' :
                            acc.role === 'PARKING_MANAGER' || acc.role === 'MANAGER' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' :
                            acc.role === 'PARKING_STAFF' || acc.role === 'STAFF' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' :
                            'bg-slate-100 border border-slate-200 text-slate-600'
                          }`}>
                            {acc.role}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            acc.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-rose-50 border-rose-250 text-rose-800'
                          }`}>
                            {acc.status === 'ACTIVE' ? 'Hoạt động' : 'Bị Khóa'}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="flex justify-center space-x-3 font-semibold">
                            <button
                              onClick={() => handleToggleLock(acc.id, acc.status)}
                              className={`cursor-pointer ${acc.status === 'ACTIVE' ? 'text-rose-650 hover:text-rose-805' : 'text-emerald-600 hover:text-emerald-705'}`}
                            >
                              {acc.status === 'ACTIVE' ? 'Khóa' : 'Mở Khóa'}
                            </button>
                            <button
                              onClick={() => handleResetPassword(acc.id)}
                              className="text-slate-500 hover:text-slate-808 cursor-pointer"
                            >
                              Reset Pass
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hardware Configuration */}
        {activeSubTab === 'hardware' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Đăng Ký Thiết Bị Mới</h3>
              <form onSubmit={handleAddDevice} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Mã Thiết Bị (Device Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: CAM_ENTRY_01"
                    value={newDeviceCode}
                    onChange={(e) => setNewDeviceCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Loại Thiết Bị</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-805 focus:outline-none font-bold"
                  >
                    <option value="CAMERA">Camera IP (ANPR)</option>
                    <option value="BARRIER">Barrier Gate Controller</option>
                    <option value="RFID_READER">Đầu đọc thẻ RFID</option>
                    <option value="QR_SCANNER">Máy quét mã QR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Làn Đỗ (Lane Code)</label>
                  <select
                    value={newDeviceLane}
                    onChange={(e) => setNewDeviceLane(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-805 focus:outline-none font-bold"
                  >
                    <option value="LANE_IN">Làn Vào (Inbound Lane)</option>
                    <option value="LANE_OUT">Làn Ra (Outbound Lane)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Cấu Hình JSON (Hardware Config)</label>
                  <textarea
                    rows={2}
                    value={newDeviceConfig}
                    onChange={(e) => setNewDeviceConfig(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none font-mono text-[10px]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm"
                >
                  Thêm Thiết Bị
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex justify-between items-center">
                <span>Trạng Thái Thiết Bị & Kết Nối Barrier/Camera</span>
                <span className="text-xs text-slate-400 font-semibold">{devices.filter(d => d.status === 'ONLINE').length} / {devices.length} hoạt động</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {devices.map((dev) => (
                  <div key={dev.id} className="border border-slate-150 p-4 rounded-2xl bg-slate-50/20 hover:border-indigo-200 transition space-y-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-850">{dev.deviceCode}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{dev.deviceType} • {dev.laneCode || 'N/A'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        dev.status === 'ONLINE' ? 'bg-emerald-50 border-emerald-250 text-emerald-805' : 'bg-rose-50 border-rose-250 text-rose-805'
                      }`}>
                        {dev.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] border-t border-slate-100 pt-3">
                      <button
                        onClick={() => updateDeviceMutation.mutate({
                          id: dev.id,
                          payload: {
                            deviceCode: dev.deviceCode,
                            deviceType: dev.deviceType,
                            laneCode: dev.laneCode,
                            status: dev.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE',
                          }
                        })}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 font-bold rounded-lg cursor-pointer transition text-[9px]"
                      >
                        {dev.status === 'ONLINE' ? 'Ngắt Kết Nối' : 'Kích Hoạt (Online)'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Settings & Backup */}
        {activeSubTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Parameters (SLA Config) */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Cấu Hình Tham Số Hệ Thống</h3>
              <form onSubmit={handleAddSetting} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Mã tham số (Key)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: SLA_TIMEOUT_SEC"
                      value={newSettingKey}
                      onChange={(e) => setNewSettingKey(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Giá trị (Value)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 3"
                      value={newSettingVal}
                      onChange={(e) => setNewSettingVal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Mô tả tham số</label>
                  <input
                    type="text"
                    placeholder="Thời gian phản hồi SLA barie mở..."
                    value={newSettingDesc}
                    onChange={(e) => setNewSettingDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm"
                >
                  Lưu Tham Số
                </button>
              </form>

              <div className="overflow-x-auto text-[11px] pt-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                      <th className="pb-2">Tham Số Key</th>
                      <th className="pb-2">Giá Trị</th>
                      <th className="pb-2">Mô tả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {systemSettings.map((s) => (
                      <tr key={s.key}>
                        <td className="py-2.5 font-bold text-indigo-750">{s.key}</td>
                        <td className="py-2.5 font-bold text-slate-900">{s.value}</td>
                        <td className="py-2.5 text-slate-500">{s.description || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Backups & Recovery Operations */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Vận Hành Sao Lưu & Khôi Phục (Backups)</h3>

              <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-750">Trạng thái bản sao lưu gần nhất:</h4>
                  <div className="mt-2 text-xs space-y-1 text-slate-550 font-semibold">
                    <p>Đường dẫn: <span className="font-mono text-[10px] text-slate-600">{latestBackup?.filePath || 'N/A'}</span></p>
                    <p>Ngày tạo: <span>{latestBackup?.createdAt ? new Date(latestBackup.createdAt).toLocaleString('vi-VN') : 'Chưa ghi nhận'}</span></p>
                    <p>Người thực hiện: <span className="font-bold text-slate-700">{latestBackup?.createdByName || 'Hệ thống'}</span></p>
                    <p>Trạng thái: <span className="text-emerald-600 font-bold">{latestBackup?.status || 'ONLINE'}</span></p>
                  </div>
                </div>

                <button
                  onClick={() => triggerBackupMutation.mutate()}
                  disabled={triggerBackupMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm disabled:opacity-50"
                >
                  {triggerBackupMutation.isPending ? 'Đang thực hiện sao lưu...' : 'Tiến hành Sao Lưu Dữ Liệu Ngay'}
                </button>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl text-xs text-emerald-805 font-semibold">
                <p className="font-bold text-emerald-800">Cơ chế khôi phục thảm họa tự động (Automatic Recovery):</p>
                <p className="text-slate-500 mt-1">
                  Hệ thống tự động kích hoạt dịch vụ recovery đồng bộ hóa dữ liệu từ database sang các node vận hành dự phòng khi xảy ra sự cố sập nguồn.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: System Logs */}
        {activeSubTab === 'logs' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Nhật Ký Thao Tác Audit Logs</h3>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-3 flex items-start space-x-3 text-xs">
                  <div className="text-slate-400 font-semibold font-mono w-32">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : 'N/A'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">@{log.operatorEmail || 'system'}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-655 border border-slate-200 rounded px-1.5 py-0.2 font-extrabold uppercase tracking-wider">{log.action}</span>
                    </div>
                    <p className="text-slate-500 font-medium">{log.details}</p>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-slate-450 font-medium">Chưa có nhật ký hoạt động nào được ghi lại.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
