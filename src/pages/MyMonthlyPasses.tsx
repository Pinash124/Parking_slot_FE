import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { userPortalService } from '../services/userPortalService';

export default function MyMonthlyPasses() {
  const queryClient = useQueryClient();

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [months, setMonths] = useState('1');
  const [note, setNote] = useState('');

  // Validations
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Payment Instruction state (for QR / Cash modal)
  const [paymentInstruction, setPaymentInstruction] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Queries
  const { data: passes = [], isLoading: isPassesLoading } = useQuery({
    queryKey: ['myMonthlyPasses'],
    queryFn: () => userPortalService.monthlyPasses(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['myVehicles'],
    queryFn: () => userPortalService.getMyVehicles(),
  });

  // Derived Vehicle Type ID
  const selectedVehicle = vehicles.find((v) => v.id === parseInt(vehicleId, 10));
  const selectedVehicleTypeId = selectedVehicle?.vehicleTypeId;

  // Filter vehicles to only show cars
  const carVehicles = vehicles.filter(
    (v: any) =>
      v.vehicleTypeName?.toLowerCase().includes('car') ||
      v.vehicleTypeName?.toLowerCase().includes('ô tô') ||
      v.vehicleTypeName?.toLowerCase().includes('4 bánh') ||
      v.vehicleTypeId === 1
  );

  // Available Slots query based on selected vehicle type (purpose=MONTHLY)
  const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ['availableSlotsForMonthly', selectedVehicleTypeId],
    queryFn: () => userPortalService.getAvailableSlots(undefined, selectedVehicleTypeId, 'MONTHLY'),
    enabled: !!selectedVehicleTypeId,
  });

  // Reset slot when selected vehicle changes
  useEffect(() => {
    setSlotId('');
    setSlotError(null);
  }, [vehicleId]);

  // Mutations
  const registerPassMutation = useMutation({
    mutationFn: (payload: { vehicleId: number; slotId: number; startDate: string; months: number; note: string }) =>
      userPortalService.registerMonthlyPass(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMonthlyPasses'] });
      showToast('Đăng ký vé tháng thành công!', 'success');
      setVehicleId('');
      setSlotId('');
      setNote('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi đăng ký vé tháng.', 'error');
    },
  });

  const prepareOnlinePaymentMutation = useMutation({
    mutationFn: (id: number) => userPortalService.prepareMonthlyPassOnlinePayment(id),
    onSuccess: (data) => {
      setPaymentInstruction(data);
      setShowPaymentModal(true);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi chuẩn bị thanh toán online.', 'error');
    },
  });



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!vehicleId) {
      setVehicleError('Vui lòng chọn phương tiện cần đăng ký.');
      valid = false;
    } else {
      setVehicleError(null);
    }

    if (!slotId) {
      setSlotError('Vui lòng chọn vị trí đỗ (ô đỗ).');
      valid = false;
    } else {
      setSlotError(null);
    }

    if (!valid) return;

    registerPassMutation.mutate({
      vehicleId: parseInt(vehicleId, 10),
      slotId: parseInt(slotId, 10),
      startDate,
      months: parseInt(months, 10),
      note: note.trim(),
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'SCHEDULED':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'PENDING_PAYMENT':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'CANCELLED':
        return 'bg-slate-50 text-slate-500 border-slate-200';
      default:
        return 'bg-rose-50 text-rose-705 border-rose-100';
    }
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return 'Đang hoạt động';
      case 'SCHEDULED':
        return 'Chờ hiệu lực';
      case 'PENDING_PAYMENT':
        return 'Chờ thanh toán';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status || 'Không rõ';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col relative">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Đăng Ký Vé Tháng Cư Dân (Resident Monthly Passes)</h1>
          <p className="text-slate-450 text-xs mt-1">Đăng ký dịch vụ vé tháng cho xe cư dân để ra vào tự động và miễn phí cước lượt gửi.</p>
        </div>

        {/* Expiry Reminders Banner */}
        {passes.some((p: any) => p.expiryReminderDue) && (
          <div className="mb-6 p-4.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-xs text-amber-855 animate-in fade-in duration-200">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900">Nhắc nhở gia hạn vé tháng cư dân:</h4>
              <ul className="list-disc list-inside space-y-1 font-semibold">
                {passes
                  .filter((p: any) => p.expiryReminderDue && p.expiryReminderMessage)
                  .map((p: any) => (
                    <li key={p.id}>{p.expiryReminderMessage}</li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        {/* Layout split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Registration Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
              Đăng ký vé tháng mới
            </h3>

            {carVehicles.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-slate-450">Bạn cần có phương tiện (ô tô) đã đăng ký trước khi làm vé tháng.</p>
                <a
                  href="/customer/vehicles"
                  className="inline-block px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl border border-indigo-100 transition"
                >
                  Đăng ký xe ngay
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold" noValidate>
                {/* Vehicle Selector */}
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Chọn phương tiện *</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className={`w-full bg-slate-50 border ${
                      vehicleError ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                    } rounded-xl px-4 py-2.5 text-xs focus:outline-none`}
                    required
                  >
                    <option value="">-- Chọn xe --</option>
                    {carVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} - {v.brand} ({v.color})
                      </option>
                    ))}
                  </select>
                  {vehicleError && <p className="mt-1 text-[10px] text-rose-500 font-medium">{vehicleError}</p>}
                </div>

                {/* Slot Selector */}
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Chọn ô đỗ xe tháng *</label>
                  <select
                    value={slotId}
                    onChange={(e) => setSlotId(e.target.value)}
                    disabled={!vehicleId || isLoadingSlots}
                    className={`w-full bg-slate-50 border ${
                      slotError ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                    } rounded-xl px-4 py-2.5 text-xs focus:outline-none disabled:opacity-50`}
                    required
                  >
                    <option value="">
                      {!vehicleId
                        ? '-- Chọn phương tiện trước --'
                        : isLoadingSlots
                        ? '-- Đang tải vị trí đỗ --'
                        : availableSlots.length === 0
                        ? '-- Không có ô đỗ trống --'
                        : '-- Chọn ô đỗ cư dân --'}
                    </option>
                    {availableSlots.map((s: any) => (
                      <option key={s.slotId} value={s.slotId}>
                        {s.slotCode} - Khu {s.zoneName} ({s.floorName})
                      </option>
                    ))}
                  </select>
                  {slotError && <p className="mt-1 text-[10px] text-rose-500 font-medium">{slotError}</p>}
                  {vehicleId && !isLoadingSlots && availableSlots.length === 0 && (
                    <p className="mt-1 text-[10px] text-rose-500 font-medium">
                      Không còn chỗ đỗ tháng trống nào cho loại xe này.
                    </p>
                  )}
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Ngày bắt đầu hiệu lực *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Duration Months */}
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Thời hạn đăng ký *</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                  >
                    <option value="1">1 Tháng</option>
                    <option value="3">3 Tháng (Tiết kiệm 5%)</option>
                    <option value="6">6 Tháng (Tiết kiệm 10%)</option>
                    <option value="12">12 Tháng (Tiết kiệm 15%)</option>
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-slate-450 mb-1.5 uppercase">Ghi chú thêm</label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Cư dân căn hộ A.1205..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={registerPassMutation.isPending}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm active:scale-98"
                >
                  {registerPassMutation.isPending ? 'Đang gửi yêu cầu...' : 'Đăng Ký Vé Tháng'}
                </button>
              </form>
            )}
          </div>

          {/* Column 2 & 3: Passes History List */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm min-h-[450px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 mb-6">
              Danh sách vé tháng của bạn
            </h3>

            {isPassesLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                <p className="text-xs text-slate-400 font-semibold mt-3">Đang tải thông tin vé tháng...</p>
              </div>
            ) : (
              passes.length === 0 ? (
                <div className="text-slate-400 text-center py-20 text-xs">Bạn chưa có đăng ký thẻ vé tháng nào.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3.5 pr-4">Mã vé</th>
                        <th className="pb-3.5 px-4">Biển số</th>
                        <th className="pb-3.5 px-4">Vị trí</th>
                        <th className="pb-3.5 px-4">Hiệu lực</th>
                        <th className="pb-3.5 px-4 text-right">Tổng phí</th>
                        <th className="pb-3.5 px-4 text-center">Trạng thái</th>
                        <th className="pb-3.5 pl-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {passes.map((p: any) => {
                        const startStr = p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : '—';
                        const endStr = p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : '—';
                        const isPendingPayment = p.status?.toUpperCase() === 'PENDING_PAYMENT';

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-4 pr-4 font-mono text-slate-800">#{p.id}</td>
                            <td className="py-4 px-4 font-mono text-indigo-950 font-black tracking-wide">
                              {p.licensePlate || `Xe #${p.vehicleId}`}
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-bold">
                              {p.slotCode || `Slot #${p.slotId}`}
                            </td>
                            <td className="py-4 px-4 text-slate-500 font-mono text-[10px] leading-relaxed">
                              <div>Từ: {startStr}</div>
                              <div>Đến: {endStr}</div>
                            </td>
                            <td className="py-4 px-4 text-right text-indigo-600 font-mono font-bold">
                              {Number(p.totalAmount || p.price || 0).toLocaleString('vi-VN')}đ
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-[5px] text-[9px] font-bold border uppercase ${getStatusBadgeClass(p.status)}`}>
                                {getStatusLabel(p.status)}
                              </span>
                            </td>
                            <td className="py-4 pl-4 text-right">
                              {isPendingPayment ? (
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => prepareOnlinePaymentMutation.mutate(p.id)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/10 active:scale-98"
                                  >
                                    QR Online
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-normal italic text-[10px]">Đã xử lý</span>
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

      {/* Payment Instruction Modal */}
      {showPaymentModal && paymentInstruction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-default" onClick={() => setShowPaymentModal(false)}></div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6.5 max-w-md w-full shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-base font-extrabold text-slate-800">
                Thanh toán vé tháng #{paymentInstruction.pass?.id}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {paymentInstruction.paymentMethod === 'ONLINE_QR' ? (
              <div className="text-center space-y-4">
                <p className="text-xs font-semibold text-slate-650">
                  Vui lòng quét mã QR dưới đây hoặc chuyển khoản chính xác số tiền sau để thanh toán vé tháng:
                </p>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 inline-block font-mono text-xs font-bold text-slate-800">
                  Số tiền: {Number(paymentInstruction.amount).toLocaleString('vi-VN')} VND
                </div>

                <div className="w-48 h-48 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2 mx-auto shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentInstruction.qrContent)}`}
                    alt="VietQR Monthly Pass"
                    className="w-full h-full object-contain"
                  />
                </div>

                <p className="text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                  Sau khi quét và chuyển khoản thành công, hệ thống hoặc Ban quản lý sẽ xác thực giao dịch để kích hoạt vé của bạn.
                </p>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-rose-500 font-bold">
                Phương thức thanh toán không hợp lệ hoặc đã bị hủy bỏ.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast popup */}
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
