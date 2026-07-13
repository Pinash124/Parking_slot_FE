import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { userPortalService } from '../services/userPortalService';

export default function MyReservations() {
  const queryClient = useQueryClient();

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // QR Modal State
  const [selectedReservationForQr, setSelectedReservationForQr] = useState<any | null>(null);

  // Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reservationSortDirection, setReservationSortDirection] = useState<'desc' | 'asc'>('desc');

  // Form Errors
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [buildingError, setBuildingError] = useState<string | null>(null);
  const [floorError, setFloorError] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Queries
  const { data: vehicles = [] } = useQuery({
    queryKey: ['userPortalVehicles'],
    queryFn: () => userPortalService.getUserPortalVehicles(),
  });

  const { data: currentSessionsRaw = [] } = useQuery({
    queryKey: ['userPortalCurrentParkingSessions'],
    queryFn: () => userPortalService.getUserPortalCurrentSession(),
  });

  const { data: monthlyPasses = [] } = useQuery({
    queryKey: ['myMonthlyPassesForReservationFilter'],
    queryFn: () => userPortalService.monthlyPasses(),
  });

  const currentSessions = Array.isArray(currentSessionsRaw)
    ? currentSessionsRaw
    : (currentSessionsRaw ? [currentSessionsRaw] : []);
  const activeParkingSessions = currentSessions.filter((session: any) => {
    const status = String(session?.status || '').toUpperCase();
    return status === 'ACTIVE' || status === 'PAYMENT_PENDING';
  });
  const activeVehicleIds = new Set(
    activeParkingSessions
      .map((session: any) => Number(session?.vehicleId))
      .filter((id: number) => Number.isFinite(id))
  );
  const activeLicensePlates = new Set(
    activeParkingSessions
      .map((session: any) => String(session?.licensePlate || '').trim().toUpperCase())
      .filter(Boolean)
  );
  const monthlyPassVehicleIds = new Set(
    monthlyPasses
      .filter((pass: any) => ['ACTIVE', 'SCHEDULED', 'PENDING_PAYMENT'].includes(String(pass?.status || '').toUpperCase()))
      .map((pass: any) => Number(pass?.vehicleId))
      .filter((id: number) => Number.isFinite(id))
  );
  const monthlyPassLicensePlates = new Set(
    monthlyPasses
      .filter((pass: any) => ['ACTIVE', 'SCHEDULED', 'PENDING_PAYMENT'].includes(String(pass?.status || '').toUpperCase()))
      .map((pass: any) => String(pass?.licensePlate || '').trim().toUpperCase())
      .filter(Boolean)
  );

  // Reservation only accepts normal car vehicles that are not currently inside the parking lot or assigned to a monthly pass.
  const isCarVehicle = (v: any) =>
    v.vehicleTypeName?.toLowerCase().includes('car') ||
    v.vehicleTypeName?.toLowerCase().includes('ô tô') ||
    v.vehicleTypeName?.toLowerCase().includes('4 bánh') ||
    v.vehicleTypeId === 1;
  const allCarVehicles = vehicles.filter(isCarVehicle);
  const carVehicles = allCarVehicles.filter((v: any) => {
    const plate = String(v.plateNumber || '').trim().toUpperCase();
    return !activeVehicleIds.has(Number(v.id))
      && !activeLicensePlates.has(plate)
      && !monthlyPassVehicleIds.has(Number(v.id))
      && !monthlyPassLicensePlates.has(plate);
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => userPortalService.getUserBuildings(),
  });

  // Dynamic Floors Query based on selected Building
  const { data: floors = [], refetch: refetchFloors } = useQuery({
    queryKey: ['floors', selectedBuildingId],
    queryFn: () => userPortalService.getUserFloors(selectedBuildingId ? parseInt(selectedBuildingId, 10) : undefined),
    enabled: !!selectedBuildingId,
  });

  // Dynamic Zones Query based on selected Floor (purpose=RESERVATION)
  const { data: filteredZones = [], refetch: refetchZones } = useQuery({
    queryKey: ['userZones', selectedFloorId],
    queryFn: () => userPortalService.getUserZones(selectedFloorId ? parseInt(selectedFloorId, 10) : undefined, 'RESERVATION'),
    enabled: !!selectedFloorId,
  });

  const { data: rawReservationSlots = [], isLoading: isSlotsLoading } = useQuery({
    queryKey: ['reservationAvailableSlots', selectedZoneId],
    queryFn: () => userPortalService.getAvailableSlots(selectedZoneId ? parseInt(selectedZoneId, 10) : undefined, undefined, 'RESERVATION'),
    enabled: !!selectedZoneId,
  });
  const reservationSlots = rawReservationSlots.map((s: any) => ({
    ...s,
    id: s.slotId ?? s.id,
  }));
  // Fetch reservation history (user portal scoped)
  const { data: reservationsData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['reservationsList'],
    queryFn: () => userPortalService.getMyReservations(0, 100),
  });
  const reservations = reservationsData?.content || [];
  const sortedReservations = [...reservations].sort((a: any, b: any) => {
    const aId = Number(a.id || 0);
    const bId = Number(b.id || 0);
    return reservationSortDirection === 'asc' ? aId - bId : bId - aId;
  });


  // Trigger floor fetch when building changes
  useEffect(() => {
    if (selectedBuildingId) {
      refetchFloors();
      setSelectedFloorId('');
      setSelectedZoneId('');
      setSelectedSlotId('');
    } else {
      setSelectedFloorId('');
      setSelectedZoneId('');
      setSelectedSlotId('');
    }
  }, [selectedBuildingId]);

  // Trigger zone refetch and reset when floor changes
  useEffect(() => {
    if (selectedFloorId) {
      refetchZones();
    }
    setSelectedZoneId('');
    setSelectedSlotId('');
  }, [selectedFloorId]);

  // Each reservation floor is scoped to RESERVATION zones; pick the first valid zone automatically.
  useEffect(() => {
    if (!selectedFloorId) return;

    const firstZone = filteredZones[0];
    if (!firstZone) {
      if (selectedZoneId) setSelectedZoneId('');
      setSelectedSlotId('');
      return;
    }

    const nextZoneId = String(firstZone.id);
    if (selectedZoneId !== nextZoneId) {
      setSelectedZoneId(nextZoneId);
      setSelectedSlotId('');
      if (zoneError) setZoneError(null);
      if (slotError) setSlotError(null);
    }
  }, [selectedFloorId, filteredZones, selectedZoneId]);

  // Mutations
  const bookingMutation = useMutation({
    mutationFn: (payload: { vehicleId: number; zoneId: number; slotId: number; startTime: string; endTime: string }) =>
      userPortalService.createReservation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservationsList'] });
      showToast('Đặt chỗ giữ suất trong khu thành công!', 'success');
      // Reset form
      setSelectedVehicleId('');
      setSelectedBuildingId('');
      setSelectedFloorId('');
      setSelectedZoneId('');
      setSelectedSlotId('');
      setStartTime('');
      setEndTime('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi đặt chỗ trước.', 'error');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => userPortalService.cancelReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservationsList'] });
      showToast('Hủy yêu cầu đặt chỗ thành công.', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi hủy đặt chỗ.', 'error');
    },
  });

  // Validations
  const validateForm = () => {
    let isValid = true;

    if (!selectedVehicleId) {
      setVehicleError('Vui lòng chọn một phương tiện.');
      isValid = false;
    } else {
      setVehicleError(null);
    }

    if (!selectedBuildingId) {
      setBuildingError('Vui lòng chọn tòa nhà.');
      isValid = false;
    } else {
      setBuildingError(null);
    }

    if (!selectedFloorId) {
      setFloorError('Vui lòng chọn tầng đỗ.');
      isValid = false;
    } else {
      setFloorError(null);
    }

    if (!selectedZoneId) {
      setZoneError('Vui lòng chọn khu vực.');
      isValid = false;
    } else {
      setZoneError(null);
    }

    if (!selectedSlotId) {
      setSlotError('Vui long chon o do con trong.');
      isValid = false;
    } else {
      setSlotError(null);
    }

    if (!startTime || !endTime) {
      setDateError('Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc.');
      isValid = false;
    } else {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const now = new Date();

      if (start < now) {
        setDateError('Thời gian bắt đầu đặt chỗ phải ở tương lai.');
        isValid = false;
      } else if (end <= start) {
        setDateError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
        isValid = false;
      } else {
        setDateError(null);
      }
    }

    return isValid;
  };

  const toLocalDateTimePayload = (value: string) => {
    return value.length === 16 ? `${value}:00` : value;
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    bookingMutation.mutate({
      vehicleId: parseInt(selectedVehicleId, 10),
      zoneId: parseInt(selectedZoneId, 10),
      slotId: parseInt(selectedSlotId, 10),
      startTime: toLocalDateTimePayload(startTime),
      endTime: toLocalDateTimePayload(endTime),
    });
  };

  const handleCancelBooking = (id: number, code: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy lượt đặt chỗ ${code}?`)) {
      cancelMutation.mutate(id);
    }
  };

  // Helper to map status badge styling
  const getStatusBadgeClass = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'APPROVED':
        return 'bg-violet-50 text-violet-700 border-violet-150';
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-slate-50 text-slate-500 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'PENDING':
        return 'Đang chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt • Chờ đến';
      case 'CONFIRMED':
      case 'COMPLETED':
        return '✓ Thành công';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const isPastReservation = (reservation: any) => {
    return reservation?.endTime && new Date(reservation.endTime).getTime() < Date.now();
  };

  const getReservationFailureReason = (reservation: any) => {
    if (!reservation) return '';
    const explicitReason = reservation.failureReason || reservation.rejectReason || reservation.rejectionReason || reservation.cancelReason || reservation.reason || reservation.message || reservation.note;
    if (explicitReason) return explicitReason;
    return isPastReservation(reservation) ? 'Quá thời gian đặt' : 'Hết chỗ';
  };

  const getReservationStatusBadgeClass = (reservation: any) => {
    const s = reservation?.status?.toUpperCase();
    if (s === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (s === 'APPROVED' || s === 'CONFIRMED' || s === 'COMPLETED') {
      return isPastReservation(reservation)
        ? 'bg-rose-50 text-rose-700 border-rose-150'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s === 'CANCELLED') return 'bg-slate-50 text-slate-500 border-slate-200';
    if (s === 'REJECTED' || s === 'FAILED' || s === 'FAILURE') return 'bg-rose-50 text-rose-700 border-rose-150';
    return getStatusBadgeClass(reservation?.status);
  };

  const getReservationStatusLabel = (reservation: any) => {
    const s = reservation?.status?.toUpperCase();
    if (s === 'PENDING') return 'Chờ duyệt';
    if (s === 'CANCELLED') return 'Đã hủy';
    if (s === 'APPROVED' || s === 'CONFIRMED' || s === 'COMPLETED') {
      return isPastReservation(reservation) ? 'Không thành công' : 'Đặt thành công';
    }
    if (s === 'REJECTED' || s === 'FAILED' || s === 'FAILURE') return 'Không thành công';
    return getStatusLabel(reservation?.status || 'Không rõ');
  };

  const shouldShowFailureReason = (reservation: any) => {
    const s = reservation?.status?.toUpperCase();
    return s === 'REJECTED' || s === 'FAILED' || s === 'FAILURE' || ((s === 'APPROVED' || s === 'CONFIRMED' || s === 'COMPLETED') && isPastReservation(reservation));
  };

  const getReservedSlotCode = (reservation: any) => {
    return reservation?.reservedSlotCode
      || reservation?.slotCode
      || reservation?.parkingSlotCode
      || reservation?.reservedSlot?.slotCode
      || (reservation?.reservedSlotId ? `#${reservation.reservedSlotId}` : '')
      || (reservation?.slotId ? `#${reservation.slotId}` : '');
  };

  const buildReservationQrData = (reservation: any) => [
    'RESERVATION',
    `reservationId=${reservation.id}`,
    `plate=${reservation.licensePlate || ''}`,
    `slotId=${reservation.reservedSlotId || reservation.slotId || ''}`,
    `slot=${getReservedSlotCode(reservation)}`,
    `zone=${reservation.zoneName || ''}`,
  ].join('|');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col relative">
      <Header />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Đặt Lịch Giữ Chỗ</h1>
          <p className="text-slate-450 text-xs mt-1">Đăng ký giữ chỗ trước và chọn sẵn ô đỗ còn trống trong khu đỗ.</p>
        </div>

        {/* Layout split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Column 1: Booking Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-6">
            <h3 className="text-base font-extrabold text-slate-850 pb-3 border-b border-slate-100 flex items-center">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-2"></span>
              Thông tin đặt chỗ
            </h3>

            <form onSubmit={handleBookingSubmit} className="space-y-4" noValidate>
              {/* Select Vehicle */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Chọn phương tiện gửi *
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value);
                    if (vehicleError) setVehicleError(null);
                  }}
                  className={`w-full bg-slate-50 border ${
                    vehicleError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 transition duration-205`}
                >
                  <option value="">-- Chọn Xe --</option>
                  {allCarVehicles.length === 0 ? (
                    <option value="" disabled>-- Vui lòng đăng ký xe ô tô trước --</option>
                  ) : carVehicles.length === 0 ? (
                    <option value="" disabled>-- Xe ô tô đang trong bãi hoặc đã có vé tháng --</option>
                  ) : (
                    carVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} ({v.brand || 'Chưa rõ hãng'})
                      </option>
                    ))
                  )}
                </select>
                {vehicleError && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                    {vehicleError}
                  </p>
                )}
              </div>

              {/* Select Building */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Chọn tòa nhà đỗ *
                </label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => {
                    setSelectedBuildingId(e.target.value);
                    if (buildingError) setBuildingError(null);
                  }}
                  className={`w-full bg-slate-50 border ${
                    buildingError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 transition duration-205`}
                >
                  <option value="">-- Chọn Tòa Nhà --</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {buildingError && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                    {buildingError}
                  </p>
                )}
              </div>

              {/* Select Floor */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Chọn tầng *
                </label>
                <select
                  value={selectedFloorId}
                  onChange={(e) => {
                    setSelectedFloorId(e.target.value);
                    if (floorError) setFloorError(null);
                  }}
                  disabled={!selectedBuildingId}
                  className={`w-full bg-slate-50 border ${
                    floorError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 transition duration-205 disabled:opacity-50`}
                >
                  <option value="">-- Chọn Tầng --</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.floorName}
                    </option>
                  ))}
                </select>
                {floorError && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                    {floorError}
                  </p>
                )}
              </div>

              {/* Select Zone */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-455 mb-1.5">
                  Chọn khu vực đỗ (Zone) *
                </label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => {
                    setSelectedZoneId(e.target.value);
                    setSelectedSlotId('');
                    if (zoneError) setZoneError(null);
                    if (slotError) setSlotError(null);
                  }}
                  disabled={!selectedFloorId || filteredZones.length <= 1}
                  className={`w-full bg-slate-50 border ${
                    zoneError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 transition duration-205 disabled:opacity-50`}
                >
                  <option value="">-- Chọn Khu Vực --</option>
                  {filteredZones.map((z: any) => (
                    <option key={z.id} value={z.id}>
                      {z.zoneName}
                    </option>
                  ))}
                </select>
                {zoneError && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                    {zoneError}
                  </p>
                )}
              </div>

              {/* Select Slot */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Chọn ô đỗ còn trống *
                </label>
                <select
                  value={selectedSlotId}
                  onChange={(e) => {
                    setSelectedSlotId(e.target.value);
                    if (slotError) setSlotError(null);
                  }}
                  disabled={!selectedZoneId || isSlotsLoading}
                  className={`w-full bg-slate-50 border ${
                    slotError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 transition duration-205 disabled:opacity-50`}
                >
                  <option value="">{isSlotsLoading ? '-- Đang tải ô đỗ --' : '-- Chọn ô đỗ --'}</option>
                  {reservationSlots.map((slot: any) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.slotCode || `Slot #${slot.id}`}
                    </option>
                  ))}
                </select>
                {selectedZoneId && !isSlotsLoading && reservationSlots.length === 0 && (
                  <p className="mt-1 text-[10px] text-amber-600 font-medium animate-in fade-in duration-150">
                    Khu này không còn ô đỗ trống.
                  </p>
                )}
                {slotError && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                    {slotError}
                  </p>
                )}
              </div>

              {/* Start Time picker */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Thời gian vào bãi *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    if (dateError) setDateError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 transition duration-200"
                />
              </div>

              {/* End Time picker */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Thời gian ra bãi *
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    if (dateError) setDateError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 transition duration-200"
                />
              </div>

              {dateError && (
                <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150 leading-normal">
                  {dateError}
                </p>
              )}

              <button
                type="submit"
                disabled={bookingMutation.isPending}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-98 text-white rounded-2xl text-xs font-extrabold transition shadow-md shadow-indigo-600/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-6"
              >
                {bookingMutation.isPending ? 'Đang đăng ký...' : 'Xác nhận Đặt chỗ'}
              </button>
            </form>
          </div>

          {/* Column 2 & 3: Booking History */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex flex-col min-h-[450px]">
            <h3 className="text-base font-extrabold text-slate-850 pb-3 border-b border-slate-100 flex items-center mb-6">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></span>
              Lịch sử đặt lịch của bạn
            </h3>

            <div className="flex items-center justify-end gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase text-slate-400">Sắp xếp mã đặt chỗ</span>
              <select
                value={reservationSortDirection}
                onChange={(e) => setReservationSortDirection(e.target.value as 'desc' | 'asc')}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>

            {isHistoryLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <span className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                <p className="text-xs text-slate-400 font-semibold mt-3">Đang tải lịch sử đặt chỗ...</p>
              </div>
            ) : (
              sortedReservations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-20">
                  <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-semibold">Chưa có lịch sử đăng ký đặt chỗ nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-450 uppercase font-bold text-[10px] tracking-wider">
                        <th className="pb-3.5 pr-4">Mã đặt chỗ</th>
                        <th className="pb-3.5 px-4">Biển số xe</th>
                        <th className="pb-3.5 px-4">Khu vực đỗ</th>
                        <th className="pb-3.5 px-4">Thời gian</th>
                        <th className="pb-3.5 px-4">Trạng thái</th>
                        <th className="pb-3.5 pl-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {sortedReservations.map((r: any) => {
                        const code = r.ticketCode || `#RSV-${r.id}`;
                        const isExpired = isPastReservation(r);
                        const isCancellable = (r.status?.toUpperCase() === 'PENDING' || r.status?.toUpperCase() === 'APPROVED') && !isExpired;
                        
                        return (
                          <tr key={r.id} className={`hover:bg-slate-50/45 transition ${((r.status?.toUpperCase() === 'APPROVED' || r.status?.toUpperCase() === 'CONFIRMED' || r.status?.toUpperCase() === 'COMPLETED') && !isExpired) ? 'bg-emerald-50/40' : ''}`}> 
                            <td className="py-4 pr-4 font-bold text-slate-900 tracking-wide font-mono">
                              {code}
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-indigo-950 uppercase">
                              {r.licensePlate || `Xe #${r.vehicleId}`}
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-750">
                              <div>{r.zoneName || `Zone #${r.zoneId}`}</div>
                              <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                                {getReservedSlotCode(r) ? `Ô đỗ: ${getReservedSlotCode(r)}` : 'Chưa có ô đỗ'}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-[11px] text-slate-500 leading-relaxed font-mono">
                              <div>Vào: {r.startTime ? new Date(r.startTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                              <div>Ra: {r.endTime ? new Date(r.endTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="inline-flex flex-col items-start gap-1">
                                <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${getReservationStatusBadgeClass(r)}`}>
                                  {getReservationStatusLabel(r)}
                                </span>
                                {shouldShowFailureReason(r) && (
                                  <span className="text-[10px] text-rose-500 font-semibold normal-case">
                                    Lý do: {getReservationFailureReason(r)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 pl-4 text-right space-x-2">
                              {/* Show QR button for APPROVED reservations (not yet checked in) */}
                              {r.status?.toUpperCase() === 'APPROVED' && !isExpired && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedReservationForQr(r)}
                                  className="text-violet-650 hover:text-violet-700 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  Xem QR
                                </button>
                              )}
                              {/* CONFIRMED / COMPLETED = vehicle entered, show success badge */}
                              {(r.status?.toUpperCase() === 'CONFIRMED' || r.status?.toUpperCase() === 'COMPLETED') && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Đã vào bãi
                                </span>
                              )}
                              {/* Cancel only for PENDING or APPROVED */}
                              {isCancellable && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelBooking(r.id, code)}
                                  disabled={cancelMutation.isPending}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                                >
                                  Hủy đặt
                                </button>
                              )}
                              {(r.status?.toUpperCase() === 'CANCELLED' || (r.status?.toUpperCase() === 'APPROVED' && isExpired)) && (
                                <span className="text-slate-400 text-[10px] italic font-semibold">
                                  {r.status?.toUpperCase() === 'CANCELLED' ? 'Đã hủy' : 'Không thành công'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* Toast Alert popup */}
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

      {/* QR Code Viewer Modal */}
      {selectedReservationForQr && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-default" onClick={() => setSelectedReservationForQr(null)}></div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 text-center">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-base font-extrabold text-slate-800">Mã QR Check-in</h3>
              <button onClick={() => setSelectedReservationForQr(null)} className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info row */}
            <div className="flex justify-center gap-3 mb-4">
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Biển số</p>
                <p className="font-mono font-black text-slate-800 text-sm uppercase">{selectedReservationForQr.licensePlate}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-center">
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Mã đặt chỗ</p>
                <p className="font-mono font-black text-indigo-800 text-sm">#{selectedReservationForQr.id}</p>
              </div>
            </div>

            <div className="w-48 h-48 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2.5 mx-auto shadow-sm mb-4 animate-in zoom-in-95 duration-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(buildReservationQrData(selectedReservationForQr))}`}
                alt="Reservation QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            {selectedReservationForQr.zoneName && (
              <p className="text-xs text-slate-500 font-semibold mb-2">
                Khu vực: <span className="text-slate-800 font-bold">{selectedReservationForQr.zoneName}</span>
              </p>
            )}

            {getReservedSlotCode(selectedReservationForQr) && (
              <p className="text-xs text-slate-500 font-semibold mb-2">
                Ô đỗ: <span className="text-indigo-700 font-bold">{getReservedSlotCode(selectedReservationForQr)}</span>
              </p>
            )}

            <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
              Xuất trình mã QR này cho nhân viên tại cổng vào. Nhân viên sẽ quét để xác nhận đặt chỗ và mở barie cho xe vào.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
