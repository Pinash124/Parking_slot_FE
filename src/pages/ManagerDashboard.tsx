import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { parkingService } from '../services/parkingService';
import type {
  ZoneRequest,
  SlotRequest,
  PricingRequest,
  VehicleTypeRequest,
} from '../types/parking';

export default function ManagerDashboard() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'parking' | 'vehicles' | 'slots' | 'rates' | 'reports' | 'exceptions' | 'feedbacks'>('parking');

  // Stats / Live Slots Query
  const { data: stats } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => parkingService.getOverviewReport(),
    refetchInterval: 15000,
  });

  // --- API QUERIES ---

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => parkingService.getFloors(),
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
    queryKey: ['pricingPolicies'],
    queryFn: () => parkingService.getPricingPolicies(),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      alert('Đã tạo phân khu mới thành công!');
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
      queryClient.invalidateQueries({ queryKey: ['pricingPolicies'] });
      alert('Đã cập nhật biểu phí thành công!');
    },
    onError: (err: any) => alert('Lỗi khi cập nhật biểu phí: ' + (err.response?.data?.message || err.message)),
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
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFloorId, setNewZoneFloorId] = useState('');
  const [newZoneTypeId, setNewZoneTypeId] = useState('');
  const [newZoneCapacity, setNewZoneCapacity] = useState('50');
  
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeFee, setNewTypeFee] = useState('10000');

  const [newSlotCode, setNewSlotCode] = useState('');
  const [newSlotZoneId, setNewSlotZoneId] = useState('');

  const [slotFilterZone, setSlotFilterZone] = useState('ALL');
  const [slotFilterStatus, setSlotFilterStatus] = useState('ALL');

  // Submit handlers
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

  // Filter slots
  const filteredSlots = slots.filter((s) => {
    const zoneMatch = slotFilterZone === 'ALL' || String(s.zoneId) === slotFilterZone;
    const statusMatch = slotFilterStatus === 'ALL' || s.status === slotFilterStatus;
    return zoneMatch && statusMatch;
  });

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
            {incidents.filter((i) => i.status === 'OPEN').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-rose-500 text-white rounded-full font-bold">
                {incidents.filter((i) => i.status === 'OPEN').length}
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
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Thêm Phân Khu (Zone) Mới</h3>
              <form onSubmit={handleAddZone} className="space-y-3 text-xs">
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
                  <label className="block font-bold text-slate-500 mb-1">Chọn Tầng (Floor)</label>
                  <select
                    value={newZoneFloorId}
                    onChange={(e) => setNewZoneFloorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-850 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn Tầng --</option>
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.floorName} ({f.buildingName || `Tòa nhà #${f.buildingId}`})
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
                    <option value="">-- Chọn Loại Xe --</option>
                    {vehicleTypes.map((vt) => (
                      <option key={vt.id} value={vt.id}>
                        {vt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Sức chứa tối đa (Slots)</label>
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
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs shadow-sm"
                >
                  Tạo phân khu mới
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Danh Sách Tầng & Khu Vực Đỗ</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                      <th className="pb-3">Khu Vực</th>
                      <th className="pb-3">Vị Trí Tầng</th>
                      <th className="pb-3">Dành Cho Xe</th>
                      <th className="pb-3 text-right">Sức Chứa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {zones.map((zone) => (
                      <tr key={zone.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 font-bold text-slate-800">{zone.zoneName}</td>
                        <td className="py-3.5 font-semibold text-slate-500">{zone.floorName || `Tầng #${zone.floorId}`}</td>
                        <td className="py-3.5 font-medium text-slate-650">{zone.vehicleTypeName || `Loại xe #${zone.vehicleTypeId}`}</td>
                        <td className="py-3.5 text-right font-bold text-indigo-600">{zone.id ? slots.filter(s => s.zoneId === zone.id).length : 0} slots</td>
                      </tr>
                    ))}
                    {zones.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400 font-medium">Chưa có phân khu nào được cấu hình.</td>
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
                  <label className="block font-bold text-slate-500 mb-1">Phí theo giờ mặc định (VNĐ)</label>
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
                    <label className="block font-bold text-slate-500 mb-1">Mã vị trí (Slot Code)</label>
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
                    <label className="block font-bold text-slate-500 mb-1">Phân khu (Zone)</label>
                    <select
                      value={newSlotZoneId}
                      onChange={(e) => setNewSlotZoneId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-850 focus:outline-none font-bold"
                      required
                    >
                      <option value="">-- Chọn Phân Khu --</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.zoneName} ({z.vehicleTypeName})
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
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Lọc Danh Sách Slot</h3>
                <div className="text-xs space-y-3">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Lọc theo Khu Vực</label>
                    <select
                      value={slotFilterZone}
                      onChange={(e) => setSlotFilterZone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-semibold"
                    >
                      <option value="ALL">Tất cả phân khu</option>
                      {zones.map((z) => (
                        <option key={z.id} value={String(z.id)}>
                          {z.zoneName} ({z.vehicleTypeName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Lọc theo Trạng Thái</label>
                    <select
                      value={slotFilterStatus}
                      onChange={(e) => setSlotFilterStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-semibold"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="AVAILABLE">Trống (AVAILABLE)</option>
                      <option value="OCCUPIED">Đang sử dụng (OCCUPIED)</option>
                      <option value="RESERVED">Đã đặt trước (RESERVED)</option>
                      <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
                      <option value="LOCKED">Khóa (LOCKED)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Graphic Grid View */}
            <div className="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Sơ Đồ Lưới Trạng Thái Vị Trí Slot Đỗ</h3>
                <span className="text-xs text-slate-400 font-semibold">Hiển thị {filteredSlots.length} slot</span>
              </div>

              {/* Status Labels Legend */}
              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500 mb-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200">
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-md mr-1.5"></span>Trống</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-rose-500 rounded-md mr-1.5"></span>Đang sử dụng</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-md mr-1.5"></span>Đã đặt trước</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-amber-500 rounded-md mr-1.5"></span>Bảo trì</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-slate-400 rounded-md mr-1.5"></span>Tạm khóa</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                    <div key={slot.id} className={`border rounded-2xl p-3.5 space-y-2.5 transition relative ${statusBg}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm tracking-tight">{slot.slotCode}</span>
                        <span className={`w-2 h-2 rounded-full ${badgeDot}`}></span>
                      </div>
                      
                      <div className="text-[10px] space-y-0.5 opacity-90">
                        <p className="font-bold">Khu vực: {slot.zoneName || `Khu #${slot.zoneId}`}</p>
                        <p className="font-medium">Loại: {slot.vehicleTypeName || 'N/A'}</p>
                      </div>

                      {/* Dropdown status toggler */}
                      <div className="pt-1.5 border-t border-slate-200/50 flex justify-end">
                        <select
                          value={slot.status}
                          onChange={(e) => updateSlotStatusMutation.mutate({ id: slot.id, status: e.target.value })}
                          className="bg-white hover:bg-slate-50 border border-slate-250 text-[10px] font-bold rounded-lg px-1.5 py-0.5 text-slate-700 cursor-pointer focus:outline-none"
                        >
                          <option value="AVAILABLE">Đặt Trống</option>
                          <option value="OCCUPIED">Đang Sử Dụng</option>
                          <option value="RESERVED">Đặt Trước</option>
                          <option value="MAINTENANCE">Bảo Trì</option>
                          <option value="LOCKED">Khóa</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredSlots.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Không tìm thấy slot đỗ xe nào trùng khớp điều kiện lọc.
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

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="pb-3">Chính Sách</th>
                    <th className="pb-3">Loại Xe</th>
                    <th className="pb-3 text-right">Phí theo Giờ</th>
                    <th className="pb-3 text-right">Trọn Ngày (24h)</th>
                    <th className="pb-3 text-right">Phí Vé Tháng</th>
                    <th className="pb-3 text-right">Mất Vé / Phạt</th>
                    <th className="pb-3 text-right">Quá hạn (Mỗi Giờ)</th>
                    <th className="pb-3 text-center">Hành Động</th>
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
                      <td colSpan={8} className="text-center py-6 text-slate-400 font-medium">Chưa cấu hình biểu phí nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-800 flex items-start space-x-2">
              <span>
                <strong>Cơ chế tính phí:</strong> Phí đỗ xe sẽ được áp dụng theo Pricing Policy hiệu lực. Phụ phí làm lại vé giấy bị mất: <strong>100.000 VNĐ / vụ</strong>. Phí đỗ sai khu vực quy định: <strong>50.000 VNĐ / lượt</strong>.
              </span>
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
                  {stats?.occupiedSlots && (stats.occupiedSlots + stats.availableSlots) > 0
                    ? Math.round((stats.occupiedSlots * 100) / (stats.occupiedSlots + stats.availableSlots))
                    : 0}%
                </p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-455 font-bold text-[10px] uppercase tracking-wider">Tổng Lượt Đặt Chỗ</p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats?.totalReservations ?? 0}</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Doanh Thu Hôm Nay</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{(stats?.todayRevenue ?? 0).toLocaleString('vi-VN')}đ</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Tổng giao dịch</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats?.totalTransactions ?? 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Doanh Thu Theo Phân Loại Xe (Ước tính)</h3>
                <div className="space-y-3.5 text-xs pt-2">
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Ô Tô (CAR)</span>
                      <span>{( (stats?.todayRevenue ?? 0) * 0.7 ).toLocaleString('vi-VN')}đ (70%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '70%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Xe Máy (BIKE)</span>
                      <span>{( (stats?.todayRevenue ?? 0) * 0.2 ).toLocaleString('vi-VN')}đ (20%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '20%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Phương tiện khác (EV / Small Truck)</span>
                      <span>{( (stats?.todayRevenue ?? 0) * 0.1 ).toLocaleString('vi-VN')}đ (10%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Mật Độ Xe Theo Thời Gian</h3>
                <div className="flex items-end justify-between h-40 pt-4 px-2 border-b border-slate-200 text-[10px] text-slate-400 font-bold">
                  <div className="flex flex-col items-center space-y-2 w-8">
                    <div className="w-full bg-indigo-200 rounded-t-lg h-10 hover:bg-indigo-400 transition"></div>
                    <span>07h</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2 w-8">
                    <div className="w-full bg-indigo-500 rounded-t-lg h-28 hover:bg-indigo-600 transition"></div>
                    <span>09h</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2 w-8">
                    <div className="w-full bg-indigo-200 rounded-t-lg h-16 hover:bg-indigo-400 transition"></div>
                    <span>12h</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2 w-8">
                    <div className="w-full bg-indigo-300 rounded-t-lg h-20 hover:bg-indigo-400 transition"></div>
                    <span>15h</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2 w-8">
                    <div className="w-full bg-indigo-600 rounded-t-lg h-36 hover:bg-indigo-700 transition"></div>
                    <span>18h</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2 w-8">
                    <div className="w-full bg-indigo-400 rounded-t-lg h-24 hover:bg-indigo-600 transition"></div>
                    <span>21h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Exceptions Handler */}
        {activeSubTab === 'exceptions' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Phê Duyệt Xử Lý Sự Cố Khẩn Cấp</h3>
              <span className="text-xs text-slate-400 font-semibold">{incidents.filter(i => i.status === 'OPEN').length} sự cố chưa duyệt</span>
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
                  {incidents.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 font-bold text-slate-800">{ex.licensePlate || `Lượt #${ex.sessionId}`}</td>
                      <td className="py-4">
                        <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                          {ex.incidentType}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">{ex.description || 'N/A'}</td>
                      <td className="py-4 text-slate-450 font-medium">{ex.createdAt ? new Date(ex.createdAt).toLocaleString('vi-VN') : 'N/A'}</td>
                      <td className="py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ex.status === 'OPEN' ? 'bg-amber-50 border-amber-250 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {ex.status === 'OPEN' ? 'Đang Chờ Duyệt' : 'Đã Giải Quyết'}
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
                  {incidents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">Chưa ghi nhận sự cố nào.</td>
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
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Phản Hồi Từ Khách Hàng gửi xe</h3>
            <div className="space-y-4 pt-2">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{fb.userFullName || `Khách hàng #${fb.userId}`}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : 'N/A'}</p>
                    </div>
                    {fb.category && (
                      <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">
                        {fb.category}
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
              {feedbacks.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  Chưa nhận được phản hồi nào từ khách hàng.
                </div>
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
  const [dailyRate, setDailyRate] = useState(policy.dailyRate || 0);
  const [monthlyRate, setMonthlyRate] = useState(policy.monthlyRate || 0);
  const [lostTicketFee, setLostTicketFee] = useState(policy.lostTicketFee || 0);
  const [overtimeFee, setOvertimeFee] = useState(policy.overtimeFee || 0);

  return (
    <tr className="hover:bg-slate-50 transition">
      <td className="py-4 font-bold text-slate-800">{policy.policyName}</td>
      <td className="py-4"><span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{policy.vehicleTypeName}</span></td>
      <td className="py-4 font-semibold text-right">
        <input
          type="number"
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-20 text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(parseInt(e.target.value, 10) || 0)}
        />đ
      </td>
      <td className="py-4 font-semibold text-right">
        <input
          type="number"
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-24 text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
          value={dailyRate}
          onChange={(e) => setDailyRate(parseInt(e.target.value, 10) || 0)}
        />đ
      </td>
      <td className="py-4 font-semibold text-right">
        <input
          type="number"
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-28 text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
          value={monthlyRate}
          onChange={(e) => setMonthlyRate(parseInt(e.target.value, 10) || 0)}
        />đ
      </td>
      <td className="py-4 font-semibold text-right">
        <input
          type="number"
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-24 text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
          value={lostTicketFee}
          onChange={(e) => setLostTicketFee(parseInt(e.target.value, 10) || 0)}
        />đ
      </td>
      <td className="py-4 font-semibold text-right">
        <input
          type="number"
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-24 text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
          value={overtimeFee}
          onChange={(e) => setOvertimeFee(parseInt(e.target.value, 10) || 0)}
        />đ
      </td>
      <td className="py-4 text-center">
        <button
          onClick={() => onSave({
            vehicleTypeId: policy.vehicleTypeId,
            policyName: policy.policyName,
            hourlyRate,
            dailyRate,
            monthlyRate,
            lostTicketFee,
            overtimeFee,
            status: policy.status,
          })}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition shadow-sm"
        >
          Cập nhật
        </button>
      </td>
    </tr>
  );
}
