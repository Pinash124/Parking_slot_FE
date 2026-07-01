import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { userPortalService } from '../services/userPortalService';
import { parkingService } from '../services/parkingService';

export default function MyReservations() {
  const queryClient = useQueryClient();

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Form Errors
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [buildingError, setBuildingError] = useState<string | null>(null);
  const [floorError, setFloorError] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);
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

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => parkingService.getBuildings(),
  });

  // Dynamic Floors Query based on selected Building
  const { data: floors = [], refetch: refetchFloors } = useQuery({
    queryKey: ['floors', selectedBuildingId],
    queryFn: () => parkingService.getFloors(selectedBuildingId ? parseInt(selectedBuildingId, 10) : undefined),
    enabled: !!selectedBuildingId,
  });

  // Fetch management zones
  const { data: rawZones = [] } = useQuery({
    queryKey: ['managementZones'],
    queryFn: () => parkingService.getManagementZones(),
  });

  // Fetch reservation history
  const { data: reservations = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['reservationsList'],
    queryFn: () => parkingService.getReservationsList(),
  });

  // Trigger floor fetch when building changes
  useEffect(() => {
    if (selectedBuildingId) {
      refetchFloors();
      setSelectedFloorId('');
      setSelectedZoneId('');
    } else {
      setSelectedFloorId('');
      setSelectedZoneId('');
    }
  }, [selectedBuildingId]);

  // Trigger zone reset when floor changes
  useEffect(() => {
    setSelectedZoneId('');
  }, [selectedFloorId]);

  // Filter zones in-memory based on selected floor
  const filteredZones: any[] = selectedFloorId
    ? rawZones.filter((z: any) => z.floorId === parseInt(selectedFloorId, 10))
    : [];

  // Mutations
  const bookingMutation = useMutation({
    mutationFn: (payload: { vehicleId: number; zoneId: number; startTime: string; endTime: string }) =>
      parkingService.createReservation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservationsList'] });
      showToast('Đặt chỗ giữ vị trí đỗ xe thành công!', 'success');
      // Reset form
      setSelectedVehicleId('');
      setSelectedBuildingId('');
      setSelectedFloorId('');
      setSelectedZoneId('');
      setStartTime('');
      setEndTime('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi đặt chỗ trước.', 'error');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => parkingService.cancelReservation(id),
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

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    bookingMutation.mutate({
      vehicleId: parseInt(selectedVehicleId, 10),
      zoneId: parseInt(selectedZoneId, 10),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
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
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'CANCELLED':
        return 'bg-slate-50 text-slate-500 border-slate-150';
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
        return 'Đã duyệt';
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col relative">
      <Header />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Đặt Lịch Giữ Chỗ</h1>
          <p className="text-slate-450 text-xs mt-1">Đăng ký giữ chỗ trước tại bãi đỗ xe để đảm bảo vị trí trống khi bạn đến nơi</p>
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
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.brand || 'Chưa rõ hãng'})
                    </option>
                  ))}
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
                    if (zoneError) setZoneError(null);
                  }}
                  disabled={!selectedFloorId}
                  className={`w-full bg-slate-50 border ${
                    zoneError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 transition duration-205 disabled:opacity-50`}
                >
                  <option value="">-- Chọn Khu Vực --</option>
                  {filteredZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.zoneName} {z.capacity ? `(Dung lượng: ${z.capacity} chỗ)` : ''}
                    </option>
                  ))}
                </select>
                {zoneError && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                    {zoneError}
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
                className="w-full py-3 px-4 border border-transparent text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-indigo-600/20 mt-6"
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

            {isHistoryLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <span className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                <p className="text-xs text-slate-400 font-semibold mt-3">Đang tải lịch sử đặt chỗ...</p>
              </div>
            ) : (
              reservations.length === 0 ? (
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
                      {reservations.map((r: any) => {
                        const code = r.ticketCode || `#RSV-${r.id}`;
                        const isCancellable = r.status?.toUpperCase() === 'PENDING' || r.status?.toUpperCase() === 'APPROVED';
                        
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/45 transition">
                            <td className="py-4 pr-4 font-bold text-slate-900 tracking-wide font-mono">
                              {code}
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-indigo-950 uppercase">
                              {r.licensePlate || `Xe #${r.vehicleId}`}
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-750">
                              {r.zoneName || `Zone #${r.zoneId}`}
                            </td>
                            <td className="py-4 px-4 text-[11px] text-slate-500 leading-relaxed font-mono">
                              <div>Vào: {r.startTime ? new Date(r.startTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                              <div>Ra: {r.endTime ? new Date(r.endTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded-[6px] text-[9px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(r.status)}`}>
                                {getStatusLabel(r.status)}
                              </span>
                            </td>
                            <td className="py-4 pl-4 text-right">
                              {isCancellable ? (
                                <button
                                  onClick={() => handleCancelBooking(r.id, code)}
                                  disabled={cancelMutation.isPending}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                                >
                                  Hủy đặt
                                </button>
                              ) : (
                                <span className="text-slate-350 text-xs italic font-normal">—</span>
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
    </div>
  );
}
