import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Header from '../components/Header';
import { parkingService } from '../services/parkingService';

export default function StaffCheckOut() {
  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- STATE FOR CHECKOUT PREP ---
  const [prepPlate, setPrepPlate] = useState('');
  const [invoice, setInvoice] = useState<any | null>(null);

  // --- STATE FOR EXIT VALIDATOR ---
  const [valPlate, setValPlate] = useState('');
  const [validatorResult, setValidatorResult] = useState<any | null>(null);
  const [isBarrierOpen, setIsBarrierOpen] = useState(false);

  // Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Mutations
  const prepareCheckoutMutation = useMutation({
    mutationFn: (payload: { licensePlate: string }) => parkingService.prepareCheckout(payload),
    onSuccess: (data) => {
      setInvoice(data);
      showToast('Đã tính phí và kết xuất hóa đơn thành công.', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi tính toán hóa đơn.', 'error');
    },
  });

  const confirmCashPaymentMutation = useMutation({
    mutationFn: (payload: { sessionId: number; amount: number }) =>
      parkingService.confirmCashPayment(payload),
    onSuccess: () => {
      showToast('Thanh toán tiền mặt thành công! Trạng thái: COMPLETED.', 'success');
      // Update local invoice state
      if (invoice) {
        setInvoice({ ...invoice, status: 'COMPLETED' });
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi xác nhận thanh toán.', 'error');
    },
  });

  const validateExitMutation = useMutation({
    mutationFn: (payload: { licensePlate: string }) => parkingService.validateExit(payload),
    onSuccess: (data) => {
      setValidatorResult(data);
      
      if (data.status === 'OPEN_PAYMENT_VERIFIED') {
        showToast('Xác thực hợp lệ! Mở cổng Barrier cổng ra.', 'success');
        // Trigger barrier gate animation
        setIsBarrierOpen(true);
        // Automatically close barrier after 5 seconds
        setTimeout(() => {
          setIsBarrierOpen(false);
        }, 5000);
      } else {
        showToast(`Từ chối xe ra: ${data.message || 'Lý do chưa thanh toán'}`, 'error');
        setIsBarrierOpen(false);
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi xác thực lối ra.', 'error');
      setValidatorResult({
        status: 'DENY_PAYMENT_REQUIRED',
        message: err.response?.data?.message || err.message || 'Không thể liên lạc máy chủ.'
      });
      setIsBarrierOpen(false);
    },
  });

  const handlePrepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepPlate.trim()) {
      showToast('Vui lòng nhập biển số xe cần thanh toán.', 'error');
      return;
    }
    prepareCheckoutMutation.mutate({ licensePlate: prepPlate.trim().toUpperCase() });
  };

  const handleConfirmCash = () => {
    if (!invoice?.sessionId) return;
    if (window.confirm(`Xác nhận khách hàng đã nộp ${invoice.totalFee.toLocaleString()}đ tiền mặt?`)) {
      confirmCashPaymentMutation.mutate({
        sessionId: invoice.sessionId,
        amount: invoice.totalFee,
      });
    }
  };

  const handleValidationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valPlate.trim()) {
      showToast('Vui lòng nhập biển số xe để xác thực lối ra.', 'error');
      return;
    }
    validateExitMutation.mutate({ licensePlate: valPlate.trim().toUpperCase() });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col relative">
      <Header />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Thanh Toán & Kiểm Soát Cổng Ra (Check-Out)</h1>
          <p className="text-slate-450 text-xs mt-1">Kết xuất hóa đơn tính phí đỗ xe, thu tiền mặt và xác thực cổng mở barrier tự động cho xe ra bãi</p>
        </div>

        {/* Layout split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start flex-1">
          
          {/* Column 1: Cashier Checkout Preparation */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 flex items-center">
              <span className="w-2 h-2 bg-indigo-650 rounded-full mr-2"></span>
              1. Bàn thu ngân (Tính phí đỗ xe)
            </h3>

            <form onSubmit={handlePrepSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="prepPlate" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Nhập biển số xe xuất bến
                </label>
                <div className="flex space-x-2">
                  <input
                    id="prepPlate"
                    type="text"
                    value={prepPlate}
                    onChange={(e) => setPrepPlate(e.target.value)}
                    placeholder="Ví dụ: 29A-111.22"
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-bold uppercase focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={prepareCheckoutMutation.isPending}
                    className="px-5 bg-indigo-600 hover:bg-indigo-550 active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50"
                  >
                    {prepareCheckoutMutation.isPending ? 'Đang tính...' : 'Tính phí'}
                  </button>
                </div>
              </div>
            </form>

            {/* Render Invoice Card details */}
            {invoice && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-250 text-xs font-medium">
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Hóa đơn lượt đỗ</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">Biển số: <span className="font-mono text-indigo-950 font-black">{invoice.licensePlate}</span></p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-[6px] text-[9px] font-bold border uppercase tracking-wider ${
                    invoice.status?.toUpperCase() === 'COMPLETED' || invoice.status?.toUpperCase() === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    {invoice.status?.toUpperCase() === 'COMPLETED' || invoice.status?.toUpperCase() === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </span>
                </div>

                <div className="space-y-2.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-normal">Mã phiên (Session ID):</span>
                    <span className="font-mono text-slate-800">#{invoice.sessionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-normal">Phí đỗ xe cơ bản:</span>
                    <span>{Number(invoice.baseFee || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-normal">Phí phạt / Phát sinh quá giờ:</span>
                    <span className={invoice.penaltyFee > 0 ? 'text-rose-600 font-bold' : ''}>
                      {Number(invoice.penaltyFee || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-455 font-normal">Phí dịch vụ gia tăng:</span>
                    <span>{Number(invoice.serviceFee || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-200">
                    <span className="text-sm font-extrabold text-slate-800">Tổng cộng hóa đơn:</span>
                    <span className="text-lg font-black text-indigo-650">
                      {Number(invoice.totalFee || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                {/* Unpaid Action Options */}
                {invoice.status?.toUpperCase() !== 'COMPLETED' && invoice.status?.toUpperCase() !== 'PAID' && (
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleConfirmCash}
                      disabled={confirmCashPaymentMutation.isPending}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-550 active:scale-98 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-emerald-600/10"
                    >
                      {confirmCashPaymentMutation.isPending ? 'Đang ghi nhận...' : 'Xác nhận thu tiền mặt'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Exit Validator Barrier Control Console */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-6 flex flex-col min-h-[450px]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              2. Xác thực Barrier cổng ra (Exit Gate)
            </h3>

            <form onSubmit={handleValidationSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="valPlate" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Quét biển số xe tại lối ra
                </label>
                <div className="flex space-x-2">
                  <input
                    id="valPlate"
                    type="text"
                    value={valPlate}
                    onChange={(e) => setValPlate(e.target.value)}
                    placeholder="Ví dụ: 30A-999.88"
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-bold uppercase focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={validateExitMutation.isPending}
                    className="px-5 bg-emerald-650 hover:bg-emerald-600 active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50"
                  >
                    {validateExitMutation.isPending ? 'Đang quét...' : 'Xác nhận xe ra'}
                  </button>
                </div>
              </div>
            </form>

            {/* Display large visual status indicator console */}
            {validatorResult && (
              <div className="flex-1 flex flex-col justify-between items-center gap-6 pt-4 animate-in zoom-in-95 duration-200 w-full">
                
                {/* Large indicator box */}
                <div className="w-full text-center">
                  {validatorResult.status === 'OPEN_PAYMENT_VERIFIED' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-6.5 text-emerald-700 flex flex-col items-center space-y-3">
                      <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="text-lg font-black tracking-wide uppercase">CỔNG ĐƯỢC PHÉP MỞ (BARRIER OPENED)</h4>
                      <p className="text-[10px] text-emerald-800 leading-normal max-w-xs font-semibold">
                        Giao dịch thanh toán trực tuyến/tiền mặt đã được đối soát. Vui lòng cho xe di chuyển qua chốt.
                      </p>
                    </div>
                  ) : validatorResult.status === 'DENY_EXIT_WINDOW_EXPIRED' ? (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-6.5 text-amber-700 flex flex-col items-center space-y-3">
                      <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h4 className="text-lg font-black tracking-wide uppercase">CỔNG BỊ KHÓA: QUÁ GIỜ ĐỔ XE (EXIT EXPIRED)</h4>
                      <p className="text-[10px] text-amber-800 leading-normal max-w-xs font-semibold">
                        Từ chối xe ra: Đã vượt quá 15 phút giới hạn di chuyển sau khi thanh toán. Cần tiến hành tái tính phí phát sinh ngoài giờ.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-6.5 text-rose-700 flex flex-col items-center space-y-3">
                      <svg className="w-10 h-10 text-rose-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <h4 className="text-lg font-black tracking-wide uppercase">CỔNG BỊ KHÓA: CHƯA THANH TOÁN (PAYMENT REQUIRED)</h4>
                      <p className="text-[10px] text-rose-800 leading-normal max-w-xs font-semibold">
                        Từ chối xe ra: Biển số này chưa được thanh toán phí đỗ xe hoặc giao dịch chưa được đối soát thành công.
                      </p>
                    </div>
                  )}
                </div>

                {/* Animated physical barrier gate graphics */}
                <div className="relative w-full h-32 flex items-end justify-center py-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-inner">
                  
                  {/* Status lights indicator */}
                  <div className="absolute top-2 flex items-center space-x-1.5 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-850">
                    <span className={`w-2 h-2 rounded-full ${isBarrierOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-pulse'}`}></span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                      {isBarrierOpen ? 'Open' : 'Lock'}
                    </span>
                  </div>

                  {/* Barrier stand and bar */}
                  <div className="relative w-44 h-20 border-b border-slate-800 flex items-end justify-start">
                    
                    {/* Post base */}
                    <div className="w-8 h-14 bg-slate-800 border border-slate-700 rounded-t-lg relative z-20 flex items-center justify-center">
                      <div className="w-3 h-3 bg-slate-900 rounded-full border border-slate-705 flex items-center justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${isBarrierOpen ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
                      </div>
                    </div>

                    {/* Bar arm */}
                    <div
                      style={{
                        transform: isBarrierOpen ? 'rotate(-75deg)' : 'rotate(0deg)',
                        transformOrigin: '5px 8px',
                      }}
                      className="absolute left-5 bottom-[8px] z-10 w-32 h-2 bg-gradient-to-r from-rose-500 via-white to-rose-500 border border-slate-950 rounded-full transition-transform duration-[1500ms] ease-out pointer-events-none"
                    ></div>

                    {/* Auto Car exits animation */}
                    <div className={`absolute bottom-0.5 right-2 transition-all duration-[4000ms] ${
                      isBarrierOpen ? 'translate-x-[-120px] opacity-100' : 'translate-x-0 opacity-20'
                    }`}>
                      <div className="w-10 h-5 bg-indigo-650 rounded-md relative border border-indigo-400">
                        <div className="absolute top-1 left-1.5 w-1.5 h-1 bg-white/30 rounded-sm"></div>
                        <div className="absolute top-1 right-1.5 w-2 h-1 bg-white/30 rounded-sm"></div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating toast notification panel */}
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
