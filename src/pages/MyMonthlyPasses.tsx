import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { userPortalService } from '../services/userPortalService';

export default function MyMonthlyPasses() {
  const queryClient = useQueryClient();

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Cascading Selection State for Register Form
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default to tomorrow
  );
  const [months, setMonths] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [qrPayment, setQrPayment] = useState<any | null>(null);


  // Queries
  const { data: myVehicles = [] } = useQuery({
    queryKey: ['myVehicles'],
    queryFn: () => userPortalService.getUserPortalVehicles(),
  });

  const { data: passes = [], isLoading: isPassesLoading } = useQuery({
    queryKey: ['myMonthlyPasses'],
    queryFn: () => userPortalService.monthlyPasses(),
  });

  const { data: pricingPolicies = [] } = useQuery({
    queryKey: ['pricingPolicies'],
    queryFn: () => userPortalService.getPricingPolicies(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['userBuildings'],
    queryFn: () => userPortalService.getUserBuildings(),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['userFloors', selectedBuildingId],
    queryFn: () => userPortalService.getUserFloors(Number(selectedBuildingId)),
    enabled: !!selectedBuildingId,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['userZones', selectedFloorId],
    queryFn: () => userPortalService.getUserZones(Number(selectedFloorId), 'MONTHLY'),
    enabled: !!selectedFloorId,
  });

  // Find vehicle type ID of selected vehicle to filter slots
  const selectedVehicleObj = myVehicles.find((v) => v.id.toString() === selectedVehicleId);
  const selectedVehicleTypeId = selectedVehicleObj?.vehicleTypeId;

  // Filter out vehicles that already have an active, scheduled or pending payment monthly pass
  const registeredVehicleIds = passes
    .filter((p) => ['ACTIVE', 'SCHEDULED', 'PENDING_PAYMENT'].includes(p.status))
    .map((p) => p.vehicleId);

  const availableVehiclesForPass = myVehicles.filter(
    (v) => !registeredVehicleIds.includes(v.id)
  );

  const { data: availableSlots = [] } = useQuery({
    queryKey: ['availableSlots', selectedZoneId, selectedVehicleTypeId],
    queryFn: () => userPortalService.getAvailableSlots(Number(selectedZoneId), selectedVehicleTypeId, 'MONTHLY'),
    enabled: !!selectedZoneId && !!selectedVehicleTypeId,
  });

  // Calculate live price estimation
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  useEffect(() => {
    if (selectedVehicleTypeId && pricingPolicies.length > 0) {
      const policy = pricingPolicies.find(
        (p) => p.vehicleTypeId === selectedVehicleTypeId
      );
      if (policy && policy.monthlyRate) {
        setEstimatedPrice(policy.monthlyRate * months);
      } else {
        setEstimatedPrice(0);
      }
    } else {
      setEstimatedPrice(0);
    }
  }, [selectedVehicleTypeId, months, pricingPolicies]);

  // Helper for toasts
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Mutations
  const registerMutation = useMutation({
    mutationFn: (payload: { vehicleId: number; slotId: number; startDate: string; months: number; note: string }) =>
      userPortalService.registerMonthlyPass(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMonthlyPasses'] });
      showToast('Đăng ký vé tháng thành công! Vui lòng hoàn tất thanh toán.', 'success');
      // Reset form fields
      setSelectedVehicleId('');
      setSelectedBuildingId('');
      setSelectedFloorId('');
      setSelectedZoneId('');
      setSelectedSlotId('');
      setNote('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi đăng ký vé tháng.', 'error');
    },
  });

  const payQrMutation = useMutation({
    mutationFn: (id: number) => userPortalService.prepareMonthlyPassOnlinePayment(id),
    onSuccess: (data) => {
      if (data?.qrImageUrl) {
        setQrPayment(data);
        queryClient.invalidateQueries({ queryKey: ['myMonthlyPasses'] });
        showToast('Da tao QR thanh toan.', 'success');
      } else {
        showToast('Không lấy được ảnh QR thanh toán.', 'error');
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi tạo QR thanh toán.', 'error');
    },
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      showToast('Vui lòng chọn phương tiện đỗ.', 'error');
      return;
    }
    if (!selectedSlotId) {
      showToast('Vui lòng chọn vị trí đỗ (ô đỗ).', 'error');
      return;
    }
    if (!startDate) {
      showToast('Vui lòng chọn ngày bắt đầu.', 'error');
      return;
    }

    registerMutation.mutate({
      vehicleId: Number(selectedVehicleId),
      slotId: Number(selectedSlotId),
      startDate,
      months,
      note,
    });
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col">
      <Header />

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all duration-300 animate-in slide-in-from-right-4 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {toast.message}
        </div>
      )}

      {qrPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Quét QR thanh toán</h3>
                <p className="text-[11px] text-slate-500 mt-1">Mã đăng ký #{qrPayment.pass?.id || ''}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrPayment(null)}
                className="w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold"
                aria-label="Đóng QR thanh toán"
              >
                x
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-center">
              <img
                src={qrPayment.qrImageUrl}
                alt="QR thanh toán"
                className="w-56 h-56 object-contain bg-white rounded-xl border border-slate-100"
              />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 font-bold">Số tiền</span>
                <strong className="font-mono text-slate-900">{Number(qrPayment.amount || 0).toLocaleString('vi-VN')}đ</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 font-bold">Nội dung CK</span>
                <strong className="font-mono text-indigo-700 text-right break-all">{qrPayment.transferContent || qrPayment.paymentReference}</strong>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500 bg-amber-50 border border-amber-100 rounded-xl p-3">
              Sau khi chuyển khoản, nhân viên sẽ đối chiếu nội dung thanh toán và xác nhận vé tháng cho bạn.
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Register Form */}
        <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between self-start">
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight pb-3.5 border-b border-slate-100 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
              <span>Đăng Ký Vé Tháng Cư Dân</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Vé tháng giúp cư dân giữ chỗ đỗ xe cố định lâu dài với mức giá ưu đãi, không phát sinh chi phí theo giờ.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold mt-5">
              {/* Select Vehicle */}
              <div>
                <label className="block text-slate-500 mb-1">1. Chọn xe đăng ký</label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value);
                    setSelectedSlotId(''); // Reset slot cascade
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                >
                  <option value="">-- Chọn xe của bạn --</option>
                  {availableVehiclesForPass.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.vehicleTypeName || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cascading Infrastructure Choices */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Tòa nhà</label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => {
                      setSelectedBuildingId(e.target.value);
                      setSelectedFloorId('');
                      setSelectedZoneId('');
                      setSelectedSlotId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Tòa nhà --</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Tầng hầm</label>
                  <select
                    disabled={!selectedBuildingId}
                    value={selectedFloorId}
                    onChange={(e) => {
                      setSelectedFloorId(e.target.value);
                      setSelectedZoneId('');
                      setSelectedSlotId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">-- Tầng --</option>
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.floorName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Phân khu (Zone)</label>
                  <select
                    disabled={!selectedFloorId}
                    value={selectedZoneId}
                    onChange={(e) => {
                      setSelectedZoneId(e.target.value);
                      setSelectedSlotId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">-- Phân khu --</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.zoneName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Vị trí đỗ (Slot)</label>
                  <select
                    disabled={!selectedZoneId || !selectedVehicleId}
                    value={selectedSlotId}
                    onChange={(e) => setSelectedSlotId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">-- Ô đỗ --</option>
                    {availableSlots.map((s) => (
                      <option key={s.slotId} value={s.slotId}>
                        {s.slotCode}
                      </option>
                    ))}
                  </select>
                  {selectedZoneId && availableSlots.length === 0 && (
                    <span className="text-[9px] text-rose-500 block mt-1 font-normal">Hết vị trí trống phù hợp loại xe.</span>
                  )}
                </div>
              </div>

              {/* Start Date & Duration */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Thời hạn đăng ký</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  >
                    <option value={1}>1 Tháng</option>
                    <option value={3}>3 Tháng (Giảm 5%)</option>
                    <option value={6}>6 Tháng (Giảm 10%)</option>
                    <option value={12}>12 Tháng (Giảm 15%)</option>
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-slate-500 mb-1">Ghi chú (Note)</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-sans"
                />
              </div>

              {/* Live Cost estimation */}
              {estimatedPrice > 0 && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center text-xs animate-in fade-in duration-200">
                  <span className="text-slate-500 font-bold">Tổng chi phí dự kiến:</span>
                  <span className="font-mono text-indigo-700 font-black text-sm">
                    {estimatedPrice.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-md shadow-indigo-100 active:scale-98"
              >
                {registerMutation.isPending ? 'Đang tạo đăng ký...' : 'Xác Nhận Đăng Ký'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List of Monthly Passes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-800 tracking-tight pb-3.5 border-b border-slate-100 flex justify-between items-center">
              <span>Vé Tháng Của Tôi</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                {passes.length} Vé đăng ký
              </span>
            </h2>

            {isPassesLoading ? (
              <div className="text-center py-20 text-slate-400 text-xs">Đang tải danh sách vé tháng của bạn...</div>
            ) : passes.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-150 rounded-2xl text-slate-400 text-xs leading-relaxed">
                <svg className="w-8 h-8 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Bạn chưa đăng ký vé tháng nào.<br />Hãy điền thông tin ở khung bên trái để tiến hành đăng ký giữ chỗ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passes.map((p: any) => {
                  const isUnpaid = p.paymentStatus?.toUpperCase() !== 'PAID';
                  const isPending = p.status?.toUpperCase() === 'PENDING_PAYMENT';
                  const expiryDays = p.daysUntilExpiry;

                  return (
                    <div key={p.id} className="border border-slate-200 rounded-2xl p-4.5 bg-slate-50/30 flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold font-mono text-slate-400 block">MÃ ĐĂNG KÝ #{p.id}</span>
                            <span className="font-mono font-black text-slate-900 text-sm uppercase block mt-0.5">{p.licensePlate}</span>
                            <span className="text-[9px] text-slate-450 block font-normal">{p.vehicleTypeName}</span>
                          </div>
                          
                          {/* Badge Status */}
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold border uppercase tracking-wide ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : p.status === 'SCHEDULED'
                              ? 'bg-blue-50 border-blue-100 text-blue-700'
                              : p.status === 'PENDING_PAYMENT'
                              ? 'bg-amber-50 border-amber-100 text-amber-700'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}>
                            {p.status === 'ACTIVE' ? 'Đang hoạt động' : (p.status === 'PENDING_PAYMENT' ? 'Chờ thanh toán' : p.status)}
                          </span>
                        </div>

                        {/* Validity Dates */}
                        <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-[10px] space-y-1 font-semibold text-slate-500">
                          <div className="flex justify-between">
                            <span>Vị trí cố định:</span>
                            <strong className="text-slate-800">{p.slotCode || 'N/A'}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Ngày bắt đầu:</span>
                            <span className="font-mono text-slate-700">{p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ngày hết hạn:</span>
                            <span className="font-mono text-slate-700">{p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : '—'}</span>
                          </div>
                          {p.status === 'ACTIVE' && expiryDays !== null && expiryDays <= 7 && (
                            <div className="pt-1.5 border-t border-slate-100 text-[9px] text-rose-500 font-bold animate-pulse">
                              Còn {expiryDays} ngày là hết hạn vé!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expiry / Price Info & Action */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100/70">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-450 font-bold">Tổng số tiền:</span>
                          <strong className="font-mono text-indigo-650 text-sm">
                            {Number(p.totalAmount || 0).toLocaleString('vi-VN')}đ
                          </strong>
                        </div>

                        {isUnpaid && isPending ? (
                          <div className="mt-1">
                            <button
                              onClick={() => payQrMutation.mutate(p.id)}
                              disabled={payQrMutation.isPending}
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                            >
                              <span>{payQrMutation.isPending ? 'Đang tạo QR...' : 'Hiện QR thanh toán'}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/50 border border-emerald-100/60 p-2 rounded-xl text-center text-[10px] font-bold text-emerald-800 flex items-center justify-center space-x-1.5 mt-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Đã thanh toán ({p.paymentMethod || 'BANK_TRANSFER'})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
