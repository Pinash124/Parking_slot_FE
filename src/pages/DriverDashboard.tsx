import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { authService } from '../services/authService';
import { userPortalService } from '../services/userPortalService';
import { parkingService } from '../services/parkingService';
import type {
  FeedbackCreateRequest,
} from '../types/parking';

export default function DriverDashboard() {
  const currentUser = authService.getCurrentUser();
  const [activeTab, setActiveTab] = useState<'info' | 'ticket' | 'feedback'>('ticket');
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);

  // Load pricing policies for rates view
  const { data: pricingPolicies = [] } = useQuery({
    queryKey: ['pricingPolicies'],
    queryFn: () => userPortalService.getPricingPolicies(),
  });

  // Current active sessions query - returns array of active sessions
  const { data: currentSessions = [] } = useQuery({
    queryKey: ['currentSession'],
    queryFn: () => userPortalService.getUserPortalCurrentSession(),
    refetchInterval: 10000,
    retry: false,
  });

  // Select session by index
  const currentSession = Array.isArray(currentSessions)
    ? currentSessions[activeSessionIndex] ?? null
    : (currentSessions as any) ?? null;

  // Keep index in bounds when sessions array shrinks
  useEffect(() => {
    const len = Array.isArray(currentSessions) ? currentSessions.length : 0;
    if (len > 0 && activeSessionIndex >= len) {
      setActiveSessionIndex(len - 1);
    }
  }, [currentSessions, activeSessionIndex]);

  // Feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: (payload: FeedbackCreateRequest) => parkingService.submitFeedback(payload),
    onSuccess: () => {
      alert('Gửi ý kiến phản hồi thành công! Cảm ơn đóng góp của bạn.');
      setFeedbackContent('');
    },
    onError: (err: any) => alert('Lỗi khi gửi phản hồi: ' + (err.response?.data?.message || err.message)),
  });

  // Feedback state
  const [feedbackCategory, setFeedbackCategory] = useState('OTHER');
  const [feedbackContent, setFeedbackContent] = useState('');

  // Live billing timer
  const [liveDurationStr, setLiveDurationStr] = useState('00g 00p 00s');
  useEffect(() => {
    if (!currentSession?.entryTime) return;
    const interval = setInterval(() => {
      const entryDate = new Date(currentSession.entryTime!);
      const diffMs = Date.now() - entryDate.getTime();
      const hours = Math.floor(diffMs / (3600 * 1000));
      const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
      const secs = Math.floor((diffMs % (60 * 1000)) / 1000);
      const hStr = hours < 10 ? '0' + hours : hours;
      const mStr = mins < 10 ? '0' + mins : mins;
      const sStr = secs < 10 ? '0' + secs : secs;
      setLiveDurationStr(`${hStr}g ${mStr}p ${sStr}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent) return;
    submitFeedbackMutation.mutate({
      feedbackType: feedbackCategory,
      content: feedbackContent,
      sessionId: currentSession?.sessionId,
    });
  };

  const sessionsArr = Array.isArray(currentSessions) ? currentSessions : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="bg-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Xin chào, {currentUser?.username || 'Khách hàng'}!</h2>
            <p className="mt-1.5 text-blue-100 text-sm max-w-xl">
              Cổng thông tin lái xe cá nhân. Đặt chỗ trước, nhận vé điện tử và gửi phản hồi bãi đỗ xe tức thời.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex items-center space-x-3 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold">Bãi đỗ xe hoạt động 24/7</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto space-x-2 pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('ticket')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap relative cursor-pointer ${
              activeTab === 'ticket' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Lượt đỗ xe hiện tại (Vé xe)
            {sessionsArr.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'info' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Bãi Xe &amp; Bảng Giá
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'feedback' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gửi Phản Hồi
          </button>
        </div>

        {/* Tab: Active Session (Ticket) */}
        {activeTab === 'ticket' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Multi-vehicle switcher (only when > 1 parked vehicle) */}
            {sessionsArr.length > 1 && (
              <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-none">
                {sessionsArr.map((sess: any, index: number) => (
                  <button
                    key={sess.sessionId ?? index}
                    onClick={() => setActiveSessionIndex(index)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                      activeSessionIndex === index
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${sess.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    <span>{sess.licensePlate || `Vé #${sess.sessionId}`}</span>
                  </button>
                ))}
              </div>
            )}

            {sessionsArr.length === 0 ? (
              /* No active session */
              <div className="bg-white border border-slate-200 p-12 rounded-3xl shadow-sm text-center space-y-6">
                <div className="w-16 h-16 bg-slate-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Không có lượt đỗ xe hoạt động</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Hiện bạn không có xe đỗ tại hầm hoặc chưa có phiên đỗ nào được kích hoạt. Hãy đăng ký đặt lịch giữ chỗ trước để tiết kiệm thời gian!
                  </p>
                </div>
                <div className="pt-2 w-full">
                  <Link
                    to="/customer/reservations"
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-98 text-white rounded-2xl text-xs font-extrabold transition shadow-md shadow-indigo-600/10 cursor-pointer inline-block text-center"
                  >
                    Đặt lịch giữ chỗ đỗ xe &rarr;
                  </Link>
                </div>
              </div>
            ) : currentSession ? (
              /* Electronic Ticket Card - centered */
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {/* Ticket Header with QR */}
                <div className="bg-gradient-to-b from-indigo-50 to-white p-6 border-b border-dashed border-slate-200 text-center flex flex-col items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vé Xe Điện Tử</p>
                  <h4 className="text-2xl font-black text-indigo-600">{currentSession.ticketCode ?? '—'}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Trạng thái: <span className="font-extrabold uppercase text-emerald-600">{currentSession.status ?? '—'}</span>
                  </p>

                  {/* QR code showing license plate */}
                  <div className="mt-4 bg-white border-2 border-indigo-100 p-3 rounded-2xl shadow-md w-36 h-36 flex items-center justify-center animate-in zoom-in-95 duration-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(currentSession.licensePlate ?? '')}`}
                      alt="Vehicle QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 font-medium">Quét để xác nhận biển số xe</p>
                </div>

                {/* Ticket Details */}
                <div className="p-6 space-y-4 text-xs font-medium">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Biển số xe</span>
                    <span className="font-black text-slate-900 text-base tracking-wider">{currentSession.licensePlate ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Phân loại xe</span>
                    <span className="font-semibold text-slate-700">{currentSession.vehicleTypeName ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Vị trí đỗ (Slot)</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                      {currentSession.slotCode ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Khu vực (Zone)</span>
                    <span className="font-semibold text-slate-700">{currentSession.zoneName ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Thời điểm vào bãi</span>
                    <span className="font-semibold text-slate-700">
                      {currentSession.entryTime
                        ? new Date(currentSession.entryTime).toLocaleString('vi-VN')
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Thời gian đỗ</span>
                    <span className="font-bold text-slate-800 font-mono tracking-wide text-sm">{liveDurationStr}</span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t-2 border-indigo-100">
                    <span className="text-slate-600 font-bold text-sm">Phí tạm tính</span>
                    <span className="text-2xl font-black text-indigo-600">
                      {(currentSession.estimatedFee ?? 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab: Info & Pricing */}
        {activeTab === 'info' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Operating hours & supported vehicles */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3 flex items-center">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-2"></span>
                Thời Gian Hoạt Động &amp; Xe Hỗ Trợ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Thời gian phục vụ</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Chúng tôi mở cửa đón phương tiện gửi 24 giờ một ngày, 7 ngày một tuần kể cả ngày nghỉ lễ.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Các loại xe hỗ trợ gửi</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Hầm đỗ hỗ trợ các phương tiện Xe Máy, Ô Tô Con dưới 9 chỗ và Xe Đạp Điện.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing table */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3 flex items-center">
                <span className="w-2.5 h-2.5 bg-purple-600 rounded-full mr-2"></span>
                Bảng Giá Gửi Xe Hiện Tại
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Loại xe</th>
                      <th className="pb-3 px-4 text-right">Phí theo giờ (1h đầu)</th>
                      <th className="pb-3 px-4 text-right">Phí theo ngày (24h)</th>
                      <th className="pb-3 pl-4 text-right">Mất thẻ/Vé phạt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {pricingPolicies.map((policy) => (
                      <tr key={policy.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pr-4 text-slate-900 font-bold">{policy.vehicleTypeName || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-right text-indigo-600">{(policy.hourlyRate ?? 0).toLocaleString()}đ</td>
                        <td className="py-3.5 px-4 text-right text-indigo-600">{(policy.dailyRate ?? 0).toLocaleString()}đ</td>
                        <td className="py-3.5 pl-4 text-right text-rose-600">{(policy.lostTicketFee ?? 0).toLocaleString()}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Feedback Form */}
        {activeTab === 'feedback' && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 mb-5">
              Gửi ý kiến đóng góp &amp; Phản hồi
            </h3>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1.5 uppercase tracking-wide">Chủ đề phản hồi</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                >
                  <option value="INCIDENT">Báo cáo sự cố tại bãi đỗ</option>
                  <option value="COMPLAINT">Khiếu nại dịch vụ / thái độ nhân viên</option>
                  <option value="SUGGESTION">Đề xuất cải tiến hệ thống</option>
                  <option value="OTHER">Chủ đề khác</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1.5 uppercase tracking-wide">Nội dung chi tiết</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none placeholder-slate-400 font-medium"
                  placeholder="Vui lòng nhập chi tiết sự việc, vị trí đỗ xe hoặc ý kiến đóng góp của bạn để chúng tôi phục vụ tốt hơn..."
                />
              </div>
              <button
                type="submit"
                disabled={submitFeedbackMutation.isPending}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {submitFeedbackMutation.isPending ? 'Đang gửi...' : 'Gửi Phản Hồi Ngay'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
