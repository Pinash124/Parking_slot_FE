import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { parkingService } from '../services/parkingService';

interface ZoneInfo {
  id: string;
  name: string;
  floor: string;
  vehicleType: string;
  capacity: number;
}

interface VehicleCategory {
  id: string;
  name: string;
  code: string;
  baseRate: number;
}

interface ParkingSlotItem {
  id: string;
  code: string;
  floor: string;
  zone: string;
  type: string;
  status: 'EMPTY' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'LOCKED';
}

interface PriceRule {
  id: string;
  vehicleType: string;
  hourlyRate: number;
  dailyRate: number;
  monthlyRate: number;
  overtimeFee: number;
}

interface ExceptionTicket {
  id: string;
  licensePlate: string;
  issueType: 'LOST_TICKET' | 'WRONG_PLATE' | 'WRONG_ZONE' | 'OVERTIME' | 'UNPAID';
  reportedAt: string;
  status: 'PENDING' | 'RESOLVED' | 'BYPASSED';
}

export default function ManagerDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<'parking' | 'vehicles' | 'slots' | 'rates' | 'reports' | 'exceptions'>('parking');

  // Stats / Live Slots Query
  const { data: stats } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => parkingService.getOverviewReport(),
    refetchInterval: 20000,
  });

  // --- 1. ZONES STATE ---
  const [zones, setZones] = useState<ZoneInfo[]>([
    { id: '1', name: 'Khu A', floor: 'Tầng hầm 1', vehicleType: 'Ô Tô (Car)', capacity: 50 },
    { id: '2', name: 'Khu B', floor: 'Tầng hầm 2', vehicleType: 'Xe Máy (Bike)', capacity: 150 },
    { id: '3', name: 'Khu C', floor: 'Mặt đất', vehicleType: 'Xe Tải Nhỏ / Xe Điện', capacity: 30 },
  ]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFloor, setNewZoneFloor] = useState('Tầng hầm 1');
  const [newZoneType, setNewZoneType] = useState('Ô Tô (Car)');
  const [newZoneCapacity, setNewZoneCapacity] = useState('50');

  // --- 2. VEHICLE CATEGORIES STATE ---
  const [vehicleCats, setVehicleCats] = useState<VehicleCategory[]>([
    { id: '1', name: 'Xe Máy', code: 'BIKE', baseRate: 10000 },
    { id: '2', name: 'Ô Tô (4-7 chỗ)', code: 'CAR', baseRate: 30000 },
    { id: '3', name: 'Xe Điện', code: 'EV', baseRate: 20000 },
    { id: '4', name: 'Xe Tải Nhỏ', code: 'TRUCK', baseRate: 50000 },
  ]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('CAR');
  const [newCatRate, setNewCatRate] = useState('');

  // --- 3. SLOTS STATE ---
  const [slots, setSlots] = useState<ParkingSlotItem[]>([
    { id: '1', code: 'A-101', floor: 'Hầm 1', zone: 'Khu A', type: 'Ô Tô', status: 'EMPTY' },
    { id: '2', code: 'A-102', floor: 'Hầm 1', zone: 'Khu A', type: 'Ô Tô', status: 'OCCUPIED' },
    { id: '3', code: 'A-103', floor: 'Hầm 1', zone: 'Khu A', type: 'Ô Tô', status: 'RESERVED' },
    { id: '4', code: 'A-104', floor: 'Hầm 1', zone: 'Khu A', type: 'Ô Tô', status: 'MAINTENANCE' },
    { id: '5', code: 'A-105', floor: 'Hầm 1', zone: 'Khu A', type: 'Ô Tô', status: 'EMPTY' },
    { id: '6', code: 'B-201', floor: 'Hầm 2', zone: 'Khu B', type: 'Xe Máy', status: 'OCCUPIED' },
    { id: '7', code: 'B-202', floor: 'Hầm 2', zone: 'Khu B', type: 'Xe Máy', status: 'EMPTY' },
    { id: '8', code: 'B-203', floor: 'Hầm 2', zone: 'Khu B', type: 'Xe Máy', status: 'LOCKED' },
    { id: '9', code: 'C-011', floor: 'Mặt đất', zone: 'Khu C', type: 'Xe Điện', status: 'EMPTY' },
  ]);
  const [slotFilterZone, setSlotFilterZone] = useState('ALL');
  const [slotFilterStatus, setSlotFilterStatus] = useState('ALL');
  const [newSlotCode, setNewSlotCode] = useState('');
  const [newSlotZone, setNewSlotZone] = useState('Khu A');
  const [newSlotType, setNewSlotType] = useState('Ô Tô');

  // --- 4. PRICING RULES STATE ---
  const [priceRules, setPriceRules] = useState<PriceRule[]>([
    { id: '1', vehicleType: 'Xe Máy (BIKE)', hourlyRate: 10000, dailyRate: 50000, monthlyRate: 150000, overtimeFee: 15000 },
    { id: '2', vehicleType: 'Ô Tô (CAR)', hourlyRate: 30000, dailyRate: 150000, monthlyRate: 1200000, overtimeFee: 50000 },
    { id: '3', vehicleType: 'Xe Điện (EV)', hourlyRate: 20000, dailyRate: 100000, monthlyRate: 600000, overtimeFee: 30000 },
  ]);

  // --- 5. EXCEPTIONS / INCIDENTS STATE ---
  const [exceptions, setExceptions] = useState<ExceptionTicket[]>([
    { id: '1', licensePlate: '29A-888.99', issueType: 'LOST_TICKET', reportedAt: '2026-06-25 18:30', status: 'PENDING' },
    { id: '2', licensePlate: '30F-123.45', issueType: 'WRONG_ZONE', reportedAt: '2026-06-25 19:15', status: 'RESOLVED' },
    { id: '3', licensePlate: '29D-999.00', issueType: 'UNPAID', reportedAt: '2026-06-25 21:00', status: 'PENDING' },
  ]);

  // --- 6. ADD ZONE TRIGGER ---
  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName) return;
    const newZ: ZoneInfo = {
      id: String(Date.now()),
      name: newZoneName,
      floor: newZoneFloor,
      vehicleType: newZoneType,
      capacity: parseInt(newZoneCapacity, 10) || 50
    };
    setZones([...zones, newZ]);
    setNewZoneName('');
  };

  // --- 7. ADD VEHICLE CATEGORY TRIGGER ---
  const handleAddVehicleCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    const newCat: VehicleCategory = {
      id: String(Date.now()),
      name: newCatName,
      code: newCatCode,
      baseRate: parseInt(newCatRate, 10) || 10000
    };
    setVehicleCats([...vehicleCats, newCat]);
    setNewCatName('');
    setNewCatRate('');
  };

  // --- 8. DELETE VEHICLE CATEGORY ---
  const handleDeleteVehicleCat = (id: string) => {
    setVehicleCats(vehicleCats.filter(c => c.id !== id));
  };

  // --- 9. ADD SLOT TRIGGER ---
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotCode) return;
    const newS: ParkingSlotItem = {
      id: String(Date.now()),
      code: newSlotCode.toUpperCase(),
      floor: newSlotZone === 'Khu C' ? 'Mặt đất' : (newSlotZone === 'Khu B' ? 'Hầm 2' : 'Hầm 1'),
      zone: newSlotZone,
      type: newSlotType,
      status: 'EMPTY'
    };
    setSlots([...slots, newS]);
    setNewSlotCode('');
  };

  // --- 10. TOGGLE SLOT STATUS ---
  const handleToggleSlotStatus = (id: string, nextStatus: 'EMPTY' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'LOCKED') => {
    setSlots(slots.map(s => s.id === id ? { ...s, status: nextStatus } : s));
  };

  // --- 11. RESOLVE EXCEPTION / EMERGENCY BYPASS ---
  const handleResolveException = (id: string, bypass: boolean) => {
    setExceptions(exceptions.map(ex => ex.id === id ? { ...ex, status: bypass ? 'BYPASSED' : 'RESOLVED' } : ex));
  };

  // Filter slots
  const filteredSlots = slots.filter(s => {
    const zoneMatch = slotFilterZone === 'ALL' || s.zone === slotFilterZone;
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
            <p className="text-slate-400 text-sm mt-0.5">Quản lý bãi xe, tầng hầm, phân khu, loại xe, cài đặt giá đỗ xe và xem thống kê.</p>
          </div>
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-xs font-bold text-slate-650 flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 bg-indigo-650 rounded-full animate-pulse"></span>
            <span>Tổng quan doanh thu hôm nay: <strong>{(stats?.todayRevenue ?? 185000).toLocaleString('vi-VN')}đ</strong></span>
          </div>
        </div>

        {/* Sub tabs nav */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto space-x-2 pb-1 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('parking')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'parking' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Bãi Xe & Khu Vực (4.1.1)
          </button>
          <button
            onClick={() => setActiveSubTab('vehicles')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'vehicles' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Loại Phương Tiện (4.1.2)
          </button>
          <button
            onClick={() => setActiveSubTab('slots')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'slots' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Quản Lý Slot Đỗ (4.1.3)
          </button>
          <button
            onClick={() => setActiveSubTab('rates')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'rates' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Bảng Giá Gửi Xe (4.1.4)
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'reports' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Báo Cáo Thống Kê (4.1.5)
          </button>
          <button
            onClick={() => setActiveSubTab('exceptions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'exceptions' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Xử Lý Ngoại Lệ (4.1.6)
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Tầng đỗ</label>
                  <select
                    value={newZoneFloor}
                    onChange={(e) => setNewZoneFloor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-850 focus:outline-none"
                  >
                    <option value="Tầng hầm 1">Tầng hầm 1</option>
                    <option value="Tầng hầm 2">Tầng hầm 2</option>
                    <option value="Mặt đất">Mặt đất</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Loại xe hỗ trợ</label>
                  <select
                    value={newZoneType}
                    onChange={(e) => setNewZoneType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-805 focus:outline-none"
                  >
                    <option value="Ô Tô (Car)">Ô Tô (Car)</option>
                    <option value="Xe Máy (Bike)">Xe Máy (Bike)</option>
                    <option value="Xe Tải Nhỏ / Xe Điện">Xe Tải Nhỏ / Xe Điện</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Sức chứa tối đa (Slots)</label>
                  <input
                    type="number"
                    required
                    value={newZoneCapacity}
                    onChange={(e) => setNewZoneCapacity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs"
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
                      <th className="pb-3 text-right">Sức Chứa (Slots)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {zones.map((zone) => (
                      <tr key={zone.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 font-bold text-slate-800">{zone.name}</td>
                        <td className="py-3 font-semibold text-slate-500">{zone.floor}</td>
                        <td className="py-3 font-medium text-slate-650">{zone.vehicleType}</td>
                        <td className="py-3 text-right font-bold text-indigo-650">{zone.capacity} slots</td>
                      </tr>
                    ))}
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
              <form onSubmit={handleAddVehicleCat} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Tên loại xe</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Xe Đạp Điện"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Mã nhận dạng (Code)</label>
                  <select
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-855 focus:outline-none"
                  >
                    <option value="CAR">CAR (Ô Tô)</option>
                    <option value="BIKE">BIKE (Xe Máy)</option>
                    <option value="EV">EV (Xe Điện)</option>
                    <option value="OTHER">OTHER (Phương tiện khác)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Phí cơ bản ước tính (VNĐ)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ví dụ: 15000"
                    value={newCatRate}
                    onChange={(e) => setNewCatRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs"
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
                      <th className="pb-3">Mã Nhận Dạng</th>
                      <th className="pb-3 text-right">Giá Cơ Bản Ước Tính</th>
                      <th className="pb-3 text-center">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {vehicleCats.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 font-bold text-slate-800">{cat.name}</td>
                        <td className="py-3.5"><span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{cat.code}</span></td>
                        <td className="py-3.5 text-right font-bold text-slate-850">{cat.baseRate.toLocaleString('vi-VN')}đ</td>
                        <td className="py-3.5 text-center">
                          <button
                            onClick={() => handleDeleteVehicleCat(cat.id)}
                            className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                          >
                            Xóa
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
                    <label className="block font-bold text-slate-500 mb-1">Khu vực</label>
                    <select
                      value={newSlotZone}
                      onChange={(e) => setNewSlotZone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-bold"
                    >
                      <option value="Khu A">Khu A (Hầm 1)</option>
                      <option value="Khu B">Khu B (Hầm 2)</option>
                      <option value="Khu C">Khu C (Mặt đất)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Dành cho phương tiện</label>
                    <select
                      value={newSlotType}
                      onChange={(e) => setNewSlotType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-bold"
                    >
                      <option value="Ô Tô">Ô Tô</option>
                      <option value="Xe Máy">Xe Máy</option>
                      <option value="Xe Tải Nhỏ">Xe Tải Nhỏ</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs"
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
                      <option value="Khu A">Khu A (Ô Tô)</option>
                      <option value="Khu B">Khu B (Xe Máy)</option>
                      <option value="Khu C">Khu C (Xe tải/Điện)</option>
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
                      <option value="EMPTY">Trống (EMPTY)</option>
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
              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500 mb-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-150">
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
                        <span className="font-extrabold text-sm tracking-tight">{slot.code}</span>
                        <span className={`w-2 h-2 rounded-full ${badgeDot}`}></span>
                      </div>
                      
                      <div className="text-[10px] space-y-0.5 opacity-90">
                        <p className="font-bold">Khu vực: {slot.zone}</p>
                        <p className="font-medium">Loại: {slot.type}</p>
                      </div>

                      {/* Dropdown status toggler */}
                      <div className="pt-1.5 border-t border-slate-200/50 flex justify-end">
                        <select
                          value={slot.status}
                          onChange={(e) => handleToggleSlotStatus(slot.id, e.target.value as any)}
                          className="bg-white hover:bg-slate-50 border border-slate-250 text-[10px] font-bold rounded-lg px-1.5 py-0.5 text-slate-700 cursor-pointer focus:outline-none"
                        >
                          <option value="EMPTY">Đặt Trống</option>
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
              <span className="w-2.5 h-2.5 bg-indigo-650 rounded-full mr-2"></span>
              Cấu Hình Giá Đỗ Xe & Phí Sự Cố
            </h3>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="pb-3">Phân loại loại xe</th>
                    <th className="pb-3">Phí theo Giờ (1h đầu)</th>
                    <th className="pb-3">Giá Trọn Ngày (24h)</th>
                    <th className="pb-3">Phí Vé Tháng</th>
                    <th className="pb-3">Phí Phụ Trội / Quá hạn (Mỗi Giờ)</th>
                    <th className="pb-3 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-750">
                  {priceRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 font-bold text-slate-800">{rule.vehicleType}</td>
                      <td className="py-4 font-semibold">
                        <input
                          type="number"
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-20 text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                          value={rule.hourlyRate}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setPriceRules(priceRules.map(pr => pr.id === rule.id ? { ...pr, hourlyRate: val } : pr));
                          }}
                        />đ
                      </td>
                      <td className="py-4 font-semibold">
                        <input
                          type="number"
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-24 text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                          value={rule.dailyRate}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setPriceRules(priceRules.map(pr => pr.id === rule.id ? { ...pr, dailyRate: val } : pr));
                          }}
                        />đ
                      </td>
                      <td className="py-4 font-semibold">
                        <input
                          type="number"
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-28 text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                          value={rule.monthlyRate}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setPriceRules(priceRules.map(pr => pr.id === rule.id ? { ...pr, monthlyRate: val } : pr));
                          }}
                        />đ
                      </td>
                      <td className="py-4 font-semibold">
                        <input
                          type="number"
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-24 text-center font-bold text-slate-850 focus:border-indigo-500 focus:outline-none"
                          value={rule.overtimeFee}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setPriceRules(priceRules.map(pr => pr.id === rule.id ? { ...pr, overtimeFee: val } : pr));
                          }}
                        />đ
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={() => alert('Cấu hình biểu giá đã được cập nhật thành công (Simulated)!')}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition"
                        >
                          Lưu biểu phí
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-800 flex items-start space-x-2">
              <svg className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Quy định phạt mất vé hoặc sai phạm:</strong> Phụ phí làm lại vé giấy bị mất: <strong>100.000 VNĐ / vụ</strong>. Phí đỗ sai khu vực quy định (ví dụ: xe máy đỗ vào slot ô tô): <strong>50.000 VNĐ / lượt</strong>. Giá vé tháng có giá trị sử dụng trong 30 ngày kể từ ngày kích hoạt.
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
                <p className="text-3xl font-extrabold text-indigo-650 mt-1">{stats?.occupiedSlots ? Math.round((stats.occupiedSlots * 100) / (stats.occupiedSlots + stats.availableSlots)) : 32}%</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-455 font-bold text-[10px] uppercase tracking-wider">Tổng lượt xe hôm nay</p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">{(stats?.totalReservations ?? 15) * 3}</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Doanh Thu Trong Ngày</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{(stats?.todayRevenue ?? 185000).toLocaleString('vi-VN')}đ</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Khung giờ cao điểm</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">17h00 - 19h00</p>
              </div>
            </div>

            {/* Simulated charts using elegant CSS grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Doanh Thu Theo Phân Loại Xe</h3>
                {/* Visual bars */}
                <div className="space-y-3.5 text-xs pt-2">
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Ô Tô (CAR)</span>
                      <span>150.000đ (65%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Xe Máy (BIKE)</span>
                      <span>35.000đ (25%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Xe Điện & Khác</span>
                      <span>20.000đ (10%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Mật Độ Lượng Xe Theo Khung Giờ</h3>
                {/* Horizontal time graph simulation */}
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
              <span className="text-xs text-slate-400 font-semibold">{exceptions.filter(ex => ex.status === 'PENDING').length} sự cố chưa duyệt</span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="pb-3">Biển Số Xe</th>
                    <th className="pb-3">Nội Dung Sự Cố</th>
                    <th className="pb-3">Thời Gian Báo</th>
                    <th className="pb-3">Trạng Thái</th>
                    <th className="pb-3 text-center">Xử lý (Dành Cho Manager)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-755">
                  {exceptions.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 font-bold text-slate-800">{ex.licensePlate}</td>
                      <td className="py-4">
                        <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                          {ex.issueType === 'LOST_TICKET' ? 'Mất vé đỗ' : (ex.issueType === 'UNPAID' ? 'Chưa trả tiền' : 'Đỗ sai phân khu')}
                        </span>
                      </td>
                      <td className="py-4 text-slate-450 font-medium">{ex.reportedAt}</td>
                      <td className="py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ex.status === 'PENDING' ? 'bg-amber-50 border-amber-250 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {ex.status === 'PENDING' ? 'Đang Chờ Duyệt' : (ex.status === 'BYPASSED' ? 'Đã Cho Qua Cổng' : 'Đã Giải Quyết')}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {ex.status === 'PENDING' ? (
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleResolveException(ex.id, false)}
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer transition"
                            >
                              Thu tiền phạt
                            </button>
                            <button
                              onClick={() => handleResolveException(ex.id, true)}
                              className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold cursor-pointer transition"
                            >
                              Mở cổng miễn phí (Bypass)
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Đã xử lý xong</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
