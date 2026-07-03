import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { userPortalService } from '../services/userPortalService';

export default function PaymentReturn() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const queryString = location.search.substring(1); // Get raw query string without '?'

  // Fetch / verify payment status with backend
  const { data: result, isLoading, error } = useQuery({
    queryKey: ['verifyVnpay', queryString],
    queryFn: () => userPortalService.verifyVnpayReturn(queryString),
    enabled: !!queryString,
    retry: false,
  });

  // Countdown timer state (seconds remaining)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (result?.success) {
      // Invalidate queries to prevent stale data
      queryClient.invalidateQueries({ queryKey: ['currentSession'] });
      queryClient.invalidateQueries({ queryKey: ['userPortalVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['reservationsList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });

      // Calculate target time: if exitDeadline is provided, use it, otherwise default to 15 minutes from now
      const targetTime = result.exitDeadline 
        ? new Date(result.exitDeadline).getTime() 
        : Date.now() + 15 * 60 * 1000;

      const updateTimer = () => {
        const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
        setSecondsLeft(diff);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [result]);

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const mStr = mins < 10 ? '0' + mins : mins;
    const sStr = secs < 10 ? '0' + secs : secs;
    return `${mStr}:${sStr}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <Header />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-16 flex items-center justify-center relative z-10">
        <div className="w-full bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-xl shadow-2xl shadow-indigo-900/20 text-center animate-in fade-in zoom-in-95 duration-350">
          
          {isLoading && (
            <div className="space-y-6 py-8">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Đang xác thực giao dịch</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Vui lòng không đóng trình duyệt hoặc tải lại trang trong khi hệ thống xác nhận thanh toán với cổng VNPay...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-6 py-6">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Lỗi xác thực thanh toán</h3>
                <p className="text-xs text-rose-300 bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl mt-2 leading-relaxed">
                  {error.message || 'Mất kết nối hoặc phản hồi không hợp lệ từ máy chủ.'}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  to="/customer"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
                >
                  Quay lại Trang chủ
                </Link>
              </div>
            </div>
          )}

          {!isLoading && !error && result && (
            result.success ? (
              <div className="space-y-6">
                {/* Success Mark */}
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white">Thanh toán thành công!</h3>
                  <p className="text-xs text-slate-400 mt-1">Hóa đơn gửi xe của bạn đã được đối soát hoàn tất</p>
                </div>

                {/* Receipt Details */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5 text-left">
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-500">Mã giao dịch:</span>
                    <span className="font-mono font-bold text-slate-300">{result.transactionId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold">Số tiền đã trả:</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {result.amount ? Number(result.amount).toLocaleString('vi-VN') : '0'}đ
                    </span>
                  </div>
                </div>

                {/* Exit Gate Deadline Section */}
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 space-y-4">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                    Thời gian giới hạn xe ra cổng
                  </span>
                  
                  {secondsLeft !== null ? (
                    <div className="text-4xl font-black font-mono tracking-wider text-indigo-300">
                      {formatTime(secondsLeft)}
                    </div>
                  ) : (
                    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                  )}

                  <p className="text-[10px] text-slate-450 leading-relaxed text-center">
                    <strong className="text-indigo-400">Lưu ý quan trọng:</strong> Bạn có tối đa 15 phút để di chuyển xe qua barrier cổng ra. Nếu quá thời hạn trên, hệ thống sẽ tính thêm phí đỗ xe phát sinh ngoài giờ.
                  </p>
                </div>

                <div className="pt-4">
                  <Link
                    to="/customer"
                    className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/35 transition transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    Về Trang chủ Portal
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Failure Mark */}
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white">Thanh toán thất bại</h3>
                  <p className="text-xs text-slate-450 mt-1">Giao dịch thanh toán qua VNPay đã bị từ chối hoặc bị hủy bỏ</p>
                </div>

                {result.message && (
                  <div className="bg-slate-950/40 border border-slate-800 text-slate-400 p-3.5 rounded-xl text-xs text-left leading-relaxed">
                    Chi tiết lỗi: {result.message}
                  </div>
                )}

                <div className="pt-4 flex space-x-3">
                  <Link
                    to="/customer"
                    className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-350 font-bold text-xs transition cursor-pointer"
                  >
                    Về Trang chủ
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
