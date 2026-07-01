import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '../components/Header';
import { parkingService } from '../services/parkingService';
import type { SlotView } from '../types/parking';

export default function StaffCheckIn() {

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Simulation Search State
  const [searchPlate, setSearchPlate] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundReservation, setFoundReservation] = useState<any | null>(null);
  const [searchChecked, setSearchChecked] = useState(false);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedSlotCode, setSelectedSlotCode] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [entryGateCode, setEntryGateCode] = useState('GATE_IN_01');
  const [reservationId, setReservationId] = useState<number | null>(null);

  // Form validations
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Success Overlay / Barrier Animation State
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [createdSession, setCreatedSession] = useState<any | null>(null);
  const [isBarrierOpen, setIsBarrierOpen] = useState(false);

  // Queries
  const { data: availableSlots = [], isLoading: isSlotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['availableSlots'],
    queryFn: () => parkingService.getManagementSlots('AVAILABLE'),
  });

  // Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Search active reservations
  const handleCheckReservation = async () => {
    if (!searchPlate.trim()) {
      showToast('Vui lòng nhập biển số xe để tìm kiếm đặt trước.', 'error');
      return;
    }

    setSearching(true);
    setFoundReservation(null);
    setSearchChecked(true);

    try {
      const resList = await parkingService.getReservationsByKeyword(searchPlate.trim().toUpperCase());
      // Filter for PENDING or APPROVED active bookings
      const activeRes = resList.find(
        (r: any) => r.status?.toUpperCase() === 'APPROVED' || r.status?.toUpperCase() === 'PENDING'
      );

      if (activeRes) {
        setFoundReservation(activeRes);
        showToast('Đã tìm thấy lượt đặt chỗ cho phương tiện này!', 'success');
      } else {
        showToast('Không tìm thấy lượt đặt chỗ nào chưa sử dụng.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi kiểm tra đặt lịch.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const applyReservation = () => {
    if (foundReservation) {
      setVehicleId(foundReservation.vehicleId?.toString() || '');
      setLicensePlate(foundReservation.licensePlate || searchPlate.toUpperCase());
      setReservationId(foundReservation.id);
      showToast('Đã áp dụng thông tin đặt lịch vào form.', 'success');
    }
  };

  // Mutation for check-in
  const checkInMutation = useMutation({
    mutationFn: (payload: any) => parkingService.checkIn(payload),
    onSuccess: (data) => {
      refetchSlots();
      setCreatedSession(data);
      setShowSuccessOverlay(true);
      
      // Reset check-in form
      setVehicleId('');
      setLicensePlate('');
      setSelectedSlotId(null);
      setSelectedSlotCode('');
      setTicketCode('');
      setReservationId(null);
      setSearchPlate('');
      setFoundReservation(null);
      setSearchChecked(false);

      // Trigger barrier opening animation after delay
      setTimeout(() => {
        setIsBarrierOpen(true);
      }, 300);

      // Close barrier after 5 seconds
      setTimeout(() => {
        setIsBarrierOpen(false);
      }, 5000);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi Check-in.', 'error');
    },
  });

  const handleSelectSlot = (slot: SlotView) => {
    setSelectedSlotId(slot.id);
    setSelectedSlotCode(slot.slotCode);
    setSlotError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    if (!vehicleId && !licensePlate) {
      setVehicleError('Vui lòng điền ID xe hoặc biển số xe.');
      isValid = false;
    } else {
      setVehicleError(null);
    }

    if (!selectedSlotId) {
      setSlotError('Vui lòng chọn ô đỗ xe trên sơ đồ.');
      isValid = false;
    } else {
      setSlotError(null);
    }

    if (!isValid) return;

    checkInMutation.mutate({
      vehicleId: vehicleId ? parseInt(vehicleId, 10) : undefined,
      licensePlate: licensePlate.trim().toUpperCase() || undefined,
      slotId: selectedSlotId,
      ticketCode: ticketCode.trim() || undefined,
      entryGateId: entryGateCode === 'GATE_IN_01' ? 1 : 2, // Map to Gate ID
      reservationId: reservationId || undefined,
    });
  };

  // Helper to color code slots by vehicle type
  const getSlotColorClass = (typeName?: string) => {
    const name = typeName?.toUpperCase() || '';
    if (name.includes('Ô TÔ') || name.includes('CAR')) {
      return {
        bg: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70',
        active: 'border-indigo-600 ring-4 ring-indigo-500/20 bg-indigo-100',
        dot: 'bg-indigo-500',
      };
    } else if (name.includes('XE MÁY') || name.includes('MOTO') || name.includes('BIKE')) {
      return {
        bg: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/70',
        active: 'border-purple-600 ring-4 ring-purple-500/20 bg-purple-100',
        dot: 'bg-purple-500',
      };
    } else {
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70',
        active: 'border-emerald-600 ring-4 ring-emerald-500/20 bg-emerald-100',
        dot: 'bg-emerald-500',
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col relative">
      <Header />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Kiểm Soát Cổng Vào (Check-In)</h1>
            <p className="text-slate-450 text-xs mt-1">Quét biển số xe, định vị vị trí đỗ còn trống và thực hiện in vé xe vào hầm</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cổng barrier online</span>
          </div>
        </div>

        {/* Dashboard split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start flex-1">
          
          {/* Column 1: Scanning Simulation & Forms */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Simulation Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                1. Giả lập quét biển số
              </h3>
              
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="scanPlate" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                    Nhập biển số nhận diện
                  </label>
                  <div className="flex space-x-2">
                    <input
                      id="scanPlate"
                      type="text"
                      value={searchPlate}
                      onChange={(e) => setSearchPlate(e.target.value)}
                      placeholder="VD: 30A-987.65"
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-bold uppercase focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCheckReservation}
                      disabled={searching}
                      className="px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 text-xs font-bold rounded-xl border border-indigo-100 cursor-pointer transition disabled:opacity-50"
                    >
                      {searching ? 'Đang tìm...' : 'Kiểm tra'}
                    </button>
                  </div>
                </div>

                {/* Reservation Found Status */}
                {searchChecked && (
                  foundReservation ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-emerald-850 uppercase tracking-wider">Có lịch đặt chỗ đỗ trước</p>
                          <p className="text-xs text-emerald-700 mt-1">Khách hàng: <strong className="text-slate-800">{foundReservation.userId ? `Mã KH #${foundReservation.userId}` : 'Khách hàng'}</strong></p>
                          <p className="text-[10px] text-emerald-600/90 mt-0.5">Thời gian đỗ: {foundReservation.startTime ? new Date(foundReservation.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                        </div>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase">Active</span>
                      </div>
                      <button
                        type="button"
                        onClick={applyReservation}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl transition cursor-pointer"
                      >
                        Áp dụng đặt lịch & pre-fill form
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl p-3.5 text-center text-xs animate-in slide-in-from-top-2 duration-200">
                      Không tìm thấy đặt lịch giữ chỗ đỗ trước. Ghi nhận là khách vãng lai.
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Check-In Submission Form */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
                2. Khởi tạo phiên đỗ xe
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Vehicle ID or Plate */}
                <div>
                  <label htmlFor="vehicleId" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                    Mã phương tiện (ID) hoặc Biển số
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id="vehicleId"
                      type="number"
                      placeholder="Mã xe ID"
                      value={vehicleId}
                      onChange={(e) => {
                        setVehicleId(e.target.value);
                        if (vehicleError) setVehicleError(null);
                      }}
                      className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                    />
                    <input
                      id="licensePlate"
                      type="text"
                      placeholder="Biển số xe"
                      value={licensePlate}
                      onChange={(e) => {
                        setLicensePlate(e.target.value);
                        if (vehicleError) setVehicleError(null);
                      }}
                      className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-bold uppercase focus:outline-none"
                    />
                  </div>
                  {vehicleError && (
                    <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                      {vehicleError}
                    </p>
                  )}
                </div>

                {/* Selected Slot (Read-only filled from grid) */}
                <div>
                  <label htmlFor="selectedSlot" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                    Vị trí ô đỗ xe đã chọn
                  </label>
                  <input
                    id="selectedSlot"
                    type="text"
                    readOnly
                    placeholder="Chưa chọn vị trí (Click chọn trên sơ đồ)"
                    value={selectedSlotCode ? `Vị trí: ${selectedSlotCode} (Mã: #${selectedSlotId})` : ''}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none cursor-not-allowed"
                  />
                  {slotError && (
                    <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                      {slotError}
                    </p>
                  )}
                </div>

                {/* Ticket Code (Optional) */}
                <div>
                  <label htmlFor="ticketCode" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                    Mã vé đỗ xe (Không bắt buộc)
                  </label>
                  <input
                    id="ticketCode"
                    type="text"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value)}
                    placeholder="Tự động khởi tạo nếu bỏ trống"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs placeholder-slate-400 focus:outline-none"
                  />
                </div>

                {/* Entry Gate Code Selector */}
                <div>
                  <label htmlFor="gate" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                    Cổng barrier kiểm soát vào
                  </label>
                  <select
                    id="gate"
                    value={entryGateCode}
                    onChange={(e) => setEntryGateCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none"
                  >
                    <option value="GATE_IN_01">Cổng Vào số 1 (GATE_IN_01)</option>
                    <option value="GATE_IN_02">Cổng Vào số 2 (GATE_IN_02)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={checkInMutation.isPending}
                  className="w-full py-3 px-4 border border-transparent text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-550 active:scale-98 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-indigo-600/20 mt-6"
                >
                  {checkInMutation.isPending ? 'Đang kích hoạt...' : 'Cho xe vào bãi & In vé'}
                </button>
              </form>
            </div>
          </div>

          {/* Column 2 & 3: Slot selection Map */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-6">
              <h3 className="text-base font-extrabold text-slate-805">Sơ đồ vị trí đỗ xe còn trống</h3>
              <button 
                onClick={() => refetchSlots()} 
                className="text-[10px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Làm mới sơ đồ
              </button>
            </div>

            {isSlotsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <span className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                <p className="text-xs text-slate-400 font-semibold mt-3 animate-pulse">Đang tải vị trí đỗ còn trống...</p>
              </div>
            ) : (
              availableSlots.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-20">
                  <svg className="w-12 h-12 mb-3 text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-semibold text-slate-700">Hết chỗ! Không có vị trí đỗ xe nào còn trống.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Legend guide */}
                  <div className="flex flex-wrap gap-4.5 justify-start text-[10px] font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span>
                      <span>Ô tô con</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm"></span>
                      <span>Xe máy</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                      <span>Xe điện / Khác</span>
                    </span>
                  </div>

                  {/* Grid layout */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {availableSlots.map((slot) => {
                      const colorStyle = getSlotColorClass(slot.vehicleTypeName);
                      const isSelected = selectedSlotId === slot.id;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSelectSlot(slot)}
                          className={`p-3 rounded-xl border flex flex-col justify-between items-center h-20 transition cursor-pointer text-center ${
                            isSelected ? colorStyle.active : colorStyle.bg
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full mb-1 self-start ml-0.5 animate-pulse shrink-0 bg-emerald-500"></div>
                          <span className="font-mono font-black text-sm tracking-wide block leading-none">{slot.slotCode}</span>
                          <span className="text-[8px] font-bold block opacity-60 truncate max-w-full uppercase mt-1">
                            {slot.vehicleTypeName || 'Mặc định'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* SUCCESS OVERLAY & BARRIER ANIMATION MODAL */}
      {showSuccessOverlay && createdSession && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          
          <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch relative z-10">
            
            {/* Printed Ticket Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6.5 shadow-2xl overflow-hidden flex flex-col justify-between text-slate-800 animate-in slide-in-from-left-6 duration-300">
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống SmartParking</p>
                <h4 className="text-xl font-black text-indigo-650 mt-1">VÉ XE VÀO CỔNG</h4>
                <div className="inline-block mt-3 bg-slate-900 text-white font-mono font-bold px-4.5 py-1.5 rounded-lg text-sm tracking-widest">
                  {createdSession.ticketCode}
                </div>
              </div>

              <div className="py-6 space-y-3.5 text-xs font-semibold text-slate-700 flex-1 flex flex-col justify-center">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-450 font-normal">Biển số:</span>
                  <span className="font-bold text-slate-900 uppercase font-mono text-sm">{createdSession.licensePlate || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-450 font-normal">Vị trí đỗ:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{createdSession.slotCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-450 font-normal">Cổng vào:</span>
                  <span>{entryGateCode}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-450 font-normal">Thời gian vào:</span>
                  <span className="font-mono text-[11px] text-slate-650">
                    {createdSession.entryTime ? new Date(createdSession.entryTime).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessOverlay(false);
                  setCreatedSession(null);
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold rounded-xl cursor-pointer transition active:scale-98 shadow-md shadow-indigo-600/25"
              >
                In vé & Hoàn tất
              </button>
            </div>

            {/* Barrier Gate Raising Animation */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col justify-between items-center text-center animate-in slide-in-from-right-6 duration-300">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tín hiệu mở cổng barrier</span>
                <h4 className="text-base font-extrabold text-white mt-1 uppercase">Cần Barrier đang mở</h4>
              </div>

              {/* Barrier Graphical Simulation */}
              <div className="relative w-full h-48 flex items-end justify-center py-6">
                
                {/* Flashing Light Indicator */}
                <div className="absolute top-2 flex items-center space-x-2 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  <span className={`w-2.5 h-2.5 rounded-full ${isBarrierOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-pulse'}`}></span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {isBarrierOpen ? 'Green - Lối vào trống' : 'Red - Đang đóng'}
                  </span>
                </div>

                {/* Graphical gate base and arm */}
                <div className="relative w-48 h-28 border-b-2 border-slate-800 flex items-end justify-start">
                  
                  {/* Barrier post/cabinet base */}
                  <div className="w-10 h-20 bg-slate-800 border border-slate-700 rounded-t-lg relative z-20 flex items-center justify-center">
                    <div className="w-4 h-4 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${isBarrierOpen ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
                    </div>
                  </div>

                  {/* Barrier Arm */}
                  <div
                    style={{
                      transform: isBarrierOpen ? 'rotate(-75deg)' : 'rotate(0deg)',
                      transformOrigin: '5px 10px',
                    }}
                    className="absolute left-6 bottom-[10px] z-10 w-36 h-2.5 bg-gradient-to-r from-rose-500 via-white to-rose-500 border border-slate-900 rounded-full transition-transform duration-[1500ms] ease-out flex items-center justify-around px-2 text-[6px] font-bold text-slate-800 select-none pointer-events-none"
                  >
                    <span>|</span><span>|</span><span>|</span><span>|</span><span>|</span>
                  </div>

                  {/* Virtual car passing */}
                  <div className={`absolute bottom-[2px] right-2 transition-all duration-[4000ms] ${
                    isBarrierOpen ? 'translate-x-[-120px] opacity-100' : 'translate-x-0 opacity-20'
                  }`}>
                    <div className="w-12 h-6 bg-indigo-600 rounded-lg relative border border-indigo-400">
                      <div className="absolute top-1 left-1.5 w-2 h-1.5 bg-white/30 rounded-sm"></div>
                      <div className="absolute top-1 right-1.5 w-2.5 h-1.5 bg-white/30 rounded-sm"></div>
                      <div className="absolute -bottom-1 left-2 w-3.5 h-3.5 bg-slate-900 rounded-full border border-slate-750"></div>
                      <div className="absolute -bottom-1 right-2 w-3.5 h-3.5 bg-slate-900 rounded-full border border-slate-750"></div>
                    </div>
                  </div>

                </div>

              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 leading-normal max-w-[200px] mx-auto">
                  Cần trục tự động hạ xuống sau khi xe đi qua vòng từ cảm biến chôn dưới mặt đường.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Floating State Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] flex items-center space-x-3 px-5 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600'
              : 'bg-rose-500 text-white border-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className="text-xs font-bold tracking-tight">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
