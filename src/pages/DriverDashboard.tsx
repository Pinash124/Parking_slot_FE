import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { authService } from '../services/authService';
import { parkingService } from '../services/parkingService';
import { userPortalService } from '../services/userPortalService';
import type {
  ReservationCreateRequest,
  FeedbackCreateRequest,
  SessionCheckInRequest,
} from '../types/parking';

export default function DriverDashboard() {
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();
  const [activeTab, setActiveTab] = useState<'info' | 'booking' | 'ticket' | 'feedback'>('info');

  // Stats / Live Slots Query
  const { data: stats } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => parkingService.getOverviewReport(),
    refetchInterval: 15000,
  });

  // Load pricing policies for rates view
  const { data: pricingPolicies = [] } = useQuery({
    queryKey: ['pricingPolicies'],
    queryFn: () => parkingService.getPricingPolicies(),
  });

  // Current active session query
  const { data: currentSession } = useQuery({
    queryKey: ['currentSession'],
    queryFn: () => userPortalService.getCurrentSession(),
    refetchInterval: 10000,
    retry: false,
  });

  // Booking / Reservation history
  const { data: reservationsData } = useQuery({
    queryKey: ['myReservations'],
    queryFn: () => userPortalService.getMyReservations(0, 50),
  });
  const bookings = reservationsData?.content || [];

  // My Vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ['myVehicles'],
    queryFn: () => userPortalService.getMyVehicles(),
  });

  // Zones for booking selector
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => parkingService.getZones(),
  });

  // Fetch slots to filter available ones for simulate check-in
  const { data: slots = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: () => parkingService.getSlots(),
  });
  const availableSlotsList = slots.filter((s) => s.status === 'AVAILABLE');

  // --- MUTATIONS ---
  const bookingMutation = useMutation({
    mutationFn: (payload: ReservationCreateRequest) => userPortalService.createReservation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
      alert('Đăng ký đặt chỗ trước thành công trên hệ thống!');
      setSelectedVehicleId('');
      setSelectedZoneId('');
      setStartTime('');
      setEndTime('');
    },
    onError: (err: any) => alert('Lỗi đặt chỗ: ' + (err.response?.data?.message || err.message)),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (id: number) => parkingService.cancelReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      alert('Đã hủy đặt chỗ thành công.');
    },
    onError: (err: any) => alert('Lỗi khi hủy: ' + (err.response?.data?.message || err.message)),
  });

  const checkInMutation = useMutation({
    mutationFn: (payload: SessionCheckInRequest) =>
      parkingService.staffCheckIn('GATE_IN_01', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSession'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      alert('Simulated Check-in thành công!');
      setSimulateLicensePlate('');
      setSimulateSlotId('');
    },
    onError: (err: any) => alert('Lỗi Check-in: ' + (err.response?.data?.message || err.message)),
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ sessionId, amount }: { sessionId: number; amount: number }) => {
      if (paymentMethod === 'VNPAY') {
        const res = await parkingService.createVnpayPayment({
          sessionId,
          amount,
          returnUrl: window.location.origin + '/driver-dashboard',
          orderInfo: `Thanh toan ve xe cho phien do #${sessionId}`
        });
        if (res.paymentUrl) {
          window.open(res.paymentUrl, '_blank');
          alert('Hệ thống đang mở cổng thanh toán VNPay. Vui lòng thanh toán ở cửa sổ mới.');
        } else {
          alert('Không thể tạo liên kết thanh toán VNPay.');
        }
        return res;
      } else {
        const res = await parkingService.createCashPayment({
          sessionId,
          amount,
          orderInfo: `Yeu cau thanh toan tien mat cho phien do #${sessionId}`
        });
        alert('Yêu cầu thanh toán tiền mặt đã được gửi. Vui lòng thanh toán trực tiếp cho nhân viên tại quầy ra.');
        return res;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSession'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      setShowPaymentModal(false);
    },
    onError: (err: any) => alert('Lỗi thanh toán: ' + (err.response?.data?.message || err.message)),
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: (payload: FeedbackCreateRequest) => parkingService.submitFeedback(payload),
    onSuccess: () => {
      alert('Gửi ý kiến phản hồi thành công! Cảm ơn đóng góp của bạn.');
      setFeedbackContent('');
    },
    onError: (err: any) => alert('Lỗi khi gửi phản hồi: ' + (err.response?.data?.message || err.message)),
  });

  // --- STATE FOR BOOKING / RESERVATION ---
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // --- STATE FOR CHECKIN SIMULATION ---
  const [simulateLicensePlate, setSimulateLicensePlate] = useState('');
  const [simulateSlotId, setSimulateSlotId] = useState('');

  // --- PAYMENT MODAL ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY' | 'CASH'>('VNPAY');

  // --- FEEDBACK ---
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

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedZoneId || !startTime || !endTime) {
      alert('Vui lòng chọn xe, khu vực đỗ và thời gian.');
      return;
    }
    bookingMutation.mutate({
      vehicleId: parseInt(selectedVehicleId, 10),
      zoneId: parseInt(selectedZoneId, 10),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });
  };

  const handleSimulateCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulateLicensePlate || !simulateSlotId) {
      alert('Vui lòng nhập biển số xe và chọn ô đỗ.');
      return;
    }
    checkInMutation.mutate({
      licensePlate: simulateLicensePlate.trim().toUpperCase(),
      slotId: parseInt(simulateSlotId, 10),
    });
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent) return;
    submitFeedbackMutation.mutate({
      category: feedbackCategory,
      content: feedbackContent,
      sessionId: currentSession?.sessionId,
    });
  };

  const availableSlots = stats?.availableSlots ?? 0;
  const occupiedSlots = stats?.occupiedSlots ?? 0;
  const totalSlots = availableSlots + occupiedSlots;
  const fillRate = totalSlots === 0 ? 0 : Math.round((occupiedSlots * 100) / totalSlots);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="bg-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Xin chào, {currentUser?.username || 'Khách hàng'}!</h2>
            <p className="mt-1.5 text-blue-100 text-sm max-w-xl">
              Cổng thông tin lái xe cá nhân. Đặt chỗ trước, nhận vé điện tử, thanh toán và gửi phản hồi bãi đỗ xe tức thời.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4.5 py-3 rounded-2xl border border-white/10 flex items-center space-x-3 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold">Bãi đỗ xe hoạt động 24/7</span>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto space-x-2 pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'info' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            Bãi Xe & Bảng Giá
          </button>
          
          <button
            onClick={() => setActiveTab('ticket')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap relative cursor-pointer ${
              activeTab === 'ticket' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            Vé Xe Của Tôi
            {currentSession && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('booking')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'booking' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            Đặt Chỗ Trước
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'feedback' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            Gửi Phản Hồi
          </button>
        </div>

        {/* Tab 1: Info */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-150 pb-3 flex items-center">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-2"></span>
                  Thời Gian Hoạt Động & Xe Hỗ Trợ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-650">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian mở cửa</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">Hoạt động 24/7</p>
                      <p className="text-xs text-slate-400 mt-1">Cả các ngày nghỉ lễ, Tết và Chủ Nhật</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-650">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16V10a2 2 0 00-2-2h-5v8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loại xe hỗ trợ</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">Mọi phương tiện theo thiết lập bãi</p>
                      <p className="text-xs text-slate-400 mt-1">Hệ thống hỗ trợ đỗ xe theo phân khu riêng biệt</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price list */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-150 pb-3 flex items-center">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-2"></span>
                  Bảng Giá Gửi Xe Chi Tiết
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 font-bold text-slate-400 uppercase">
                        <th className="pb-3">Phân loại / Chính sách</th>
                        <th className="pb-3 text-right">Phí theo Giờ</th>
                        <th className="pb-3 text-right">Trọn Ngày (24h)</th>
                        <th className="pb-3 text-right">Phí Vé Tháng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {pricingPolicies.map((policy) => (
                        <tr key={policy.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 font-bold text-slate-800">{policy.policyName} ({policy.vehicleTypeName})</td>
                          <td className="py-3.5 text-right">{(policy.hourlyRate ?? 0).toLocaleString('vi-VN')}đ</td>
                          <td className="py-3.5 text-right">{(policy.dailyRate ?? 0).toLocaleString('vi-VN')}đ</td>
                          <td className="py-3.5 text-right text-indigo-650 font-bold">{(policy.monthlyRate ?? 0).toLocaleString('vi-VN')}đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Trạng thái chỗ trống</h3>
                <div className="inline-flex items-center justify-center relative w-36 h-36 mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" className="stroke-slate-100" strokeWidth="12" fill="transparent" />
                    <circle cx="72" cy="72" r="60" className="stroke-indigo-650 transition-all duration-500" strokeWidth="12" fill="transparent"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 * (1 - fillRate / 100)}
                    />
                  </svg>
                  <div className="absolute flex flex-col justify-center items-center">
                    <span className="text-3xl font-extrabold text-slate-800">{availableSlots}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Slot trống</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-4">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                    <p className="text-slate-400 font-medium">Đang trống</p>
                    <p className="text-lg font-bold text-emerald-700 mt-0.5">{availableSlots}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <p className="text-slate-400 font-medium">Đã đỗ</p>
                    <p className="text-lg font-bold text-slate-700 mt-0.5">{occupiedSlots}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Ticket / Current Session */}
        {activeTab === 'ticket' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {!currentSession ? (
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Không có lượt đỗ xe hoạt động</h3>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                    Hiện bạn chưa có xe đỗ tại hầm hoặc chưa có phiên đỗ xe nào được kích hoạt. Sử dụng form giả lập phía dưới để bắt đầu phiên đỗ.
                  </p>
                </div>

                {/* Simulate Check-in */}
                <div className="max-w-sm mx-auto pt-6 border-t border-slate-150 text-left">
                  <form onSubmit={handleSimulateCheckIn} className="space-y-3.5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Giả lập xe vào bãi đỗ (Simulate Check-in)</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Nhập Biển Số Xe</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 30A-999.88"
                        value={simulateLicensePlate}
                        onChange={(e) => setSimulateLicensePlate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm uppercase font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Chọn Vị Trí Ô Đỗ (Slot)</label>
                      <select
                        value={simulateSlotId}
                        onChange={(e) => setSimulateSlotId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none"
                        required
                      >
                        <option value="">-- Chọn Vị Trí --</option>
                        {availableSlotsList.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.slotCode} ({slot.vehicleTypeName || `Loại #${slot.vehicleTypeId}`})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={checkInMutation.isPending}
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition"
                    >
                      {checkInMutation.isPending ? 'Đang gửi...' : 'Gửi Yêu Cầu Check-In'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg border-t-8 border-indigo-655">
                  <div className="bg-slate-50/50 p-6 border-b border-dashed border-slate-200 text-center relative">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vé Xe Điện Tử</p>
                    <h4 className="text-2xl font-extrabold text-indigo-655 mt-1">{currentSession.ticketCode}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Trạng thái: <span className="font-extrabold uppercase text-indigo-600">{currentSession.status}</span></p>
                  </div>

                  <div className="p-6 space-y-4 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Biển số xe:</span>
                      <span className="font-bold text-slate-800 text-sm">{currentSession.licensePlate || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Phân loại xe:</span>
                      <span className="font-semibold text-slate-805">{currentSession.vehicleTypeName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Vị trí đỗ (Slot):</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-155">{currentSession.slotCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Khu đỗ:</span>
                      <span className="font-semibold text-slate-700">{currentSession.zoneName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Giờ xe vào:</span>
                      <span className="font-semibold text-slate-750">
                        {currentSession.entryTime ? new Date(currentSession.entryTime).toLocaleString('vi-VN') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Thời gian đỗ:</span>
                      <span className="font-bold text-slate-800 font-mono">{liveDurationStr}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-400 font-bold">Phí tạm tính (ước tính):</span>
                      <span className="text-xl font-extrabold text-indigo-650">{(currentSession.estimatedFee ?? 0).toLocaleString('vi-VN')}đ</span>
                    </div>

                    {currentSession.status === 'PAYMENT_PENDING' || currentSession.status === 'COMPLETED' ? (
                      <div className="bg-emerald-50 border border-emerald-250 text-emerald-805 p-3 rounded-2xl text-center font-bold text-xs">
                        ĐÃ THANH TOÁN (BARIE RA ĐÃ SẴN SÀNG)
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setPaymentMethod('VNPAY');
                          setShowPaymentModal(true);
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition"
                      >
                        Thực Hiện Thanh Toán Online
                      </button>
                    )}
                  </div>
                </div>

                {/* Identity QR Code */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm text-center space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm">Mã QR Vé Định Danh Của Bạn</h4>
                  <p className="text-xs text-slate-400">Đưa mã này trước camera tại Barrier cổng ra để hệ thống mở barie tự động.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl inline-block">
                    <div className="w-36 h-36 bg-white border border-slate-250 rounded-xl flex items-center justify-center p-2 mx-auto relative group">
                      <svg className="w-full h-full text-slate-800" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 2h6v6H2V2zm1.5 1.5v3h3v-3h-3zM2 16h6v6H2v-6zm1.5 1.5v3h3v-3h-3zM16 2h6v6h-6V2zm1.5 1.5v3h3v-3h-3zM12 2h2v2h-2V2zm0 4h2v2h-2V6zm2-2h2v2h-2V4zm-2 6h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm6-4h2v2h-2v-2zm0 4h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-6 2h2v2h-2v-2zm6 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Booking / Reservations */}
        {activeTab === 'booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-indigo-650 rounded-full"></span>
                <span>Đặt Chỗ Trước (Booking)</span>
              </h3>

              <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5">Chọn Xe Đăng Ký Gửi</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-850 focus:outline-none font-bold"
                    required
                  >
                    <option value="">-- Chọn Xe --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} ({v.brand || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1.5">Chọn Khu Vực Đỗ</label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-855 focus:outline-none font-bold"
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

                <div>
                  <label className="block font-bold text-slate-500 mb-1.5">Thời gian bắt đầu gửi</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-805 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1.5">Thời gian kết thúc dự kiến</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-805 focus:outline-none font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingMutation.isPending}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm disabled:opacity-50"
                >
                  {bookingMutation.isPending ? 'Đang xử lý...' : 'Xác Nhận Đăng Ký Đặt Trước'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Danh Sách Lượt Đặt Chỗ Trước</span>
                <span className="text-xs text-slate-400 font-semibold">{bookings.length} Lượt đặt</span>
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {bookings.map((book) => (
                  <div key={book.id} className="border border-slate-150 p-4 rounded-2xl hover:border-indigo-355 transition bg-slate-50/20 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Mã Đặt Chỗ: #{book.id}</span>
                      <h4 className="text-sm font-extrabold text-slate-800 mt-0.5">{book.licensePlate || `Xe #${book.vehicleId}`}</h4>
                      <p className="text-[11px] text-slate-555 mt-1 font-semibold">
                        Thời gian: {book.startTime ? new Date(book.startTime).toLocaleString('vi-VN') : 'N/A'} → {book.endTime ? new Date(book.endTime).toLocaleString('vi-VN') : 'N/A'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Khu vực: {book.zoneName || `Zone #${book.zoneId}`}</p>
                    </div>

                    <div className="text-right space-y-2">
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        book.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-250 text-emerald-805' : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        {book.status}
                      </span>
                      {book.status === 'PENDING' && (
                        <div>
                          <button
                            onClick={() => cancelBookingMutation.mutate(book.id)}
                            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Hủy đặt chỗ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {bookings.length === 0 && (
                  <div className="text-center py-12 text-slate-400">Bạn chưa đăng ký đặt chỗ nào.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Feedback */}
        {activeTab === 'feedback' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800">Gửi Ý Kiến Phản Hồi</h3>
              <p className="text-sm text-slate-400">Chúng tôi luôn lắng nghe ý kiến phản ánh để nâng cao chất lượng dịch vụ vận hành bãi đỗ xe.</p>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-2">Loại Phản Hồi</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-850 text-sm focus:outline-none font-bold"
                >
                  <option value="LOST_TICKET">Báo Mất Vé Xe</option>
                  <option value="INCORRECT_FEE">Khiếu nại sai phí đỗ</option>
                  <option value="CAR_LOCATING">Khó tìm vị trí ô đỗ</option>
                  <option value="SLOT_OCCUPIED">Vị trí ô đỗ bị chiếm</option>
                  <option value="OTHER">Góp ý khác</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-2">Chi tiết phản hồi</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể vấn đề hoặc phản hồi của bạn..."
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-450 focus:outline-none text-sm leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={submitFeedbackMutation.isPending}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50 text-xs"
              >
                {submitFeedbackMutation.isPending ? 'Đang gửi...' : 'Gửi Phản Hồi Ngay'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* PAYMENT MODAL */}
      {showPaymentModal && currentSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-250 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4.5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-850 text-base">Thanh Toán Hóa Đơn Lượt Đỗ #{currentSession.ticketCode}</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 flex items-center justify-center text-sm font-bold border border-slate-200 rounded-lg w-7 h-7"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs font-semibold">
              <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider">Tổng số tiền thanh toán</p>
                  <p className="text-2xl font-extrabold text-indigo-650 mt-1">{(currentSession.estimatedFee ?? 0).toLocaleString('vi-VN')}đ</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-400 font-bold uppercase tracking-wider">Phương thức thanh toán</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('VNPAY')}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center space-y-1.5 ${
                      paymentMethod === 'VNPAY' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-650' : 'border-slate-200 hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    <span>Thanh toán online (VNPay)</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center space-y-1.5 ${
                      paymentMethod === 'CASH' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-650' : 'border-slate-200 hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    <span>Tiền mặt (tại quầy)</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                {paymentMethod === 'VNPAY' ? (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-3.5">
                    <p className="text-slate-400 font-bold uppercase">Cổng thanh toán VNPay Sandbox</p>
                    <p className="text-slate-500">Sau khi xác nhận, hệ thống sẽ mở cổng thanh toán VNPay để bạn thực hiện thanh toán online qua thẻ ngân hàng hoặc ứng dụng Mobile Banking.</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-2">
                    <p className="text-slate-400 font-bold uppercase">Thanh toán trực tiếp tại cổng ra</p>
                    <p className="text-slate-550">Bạn vui lòng di chuyển xe đến chốt cổng ra, nhân viên trực cổng sẽ thực hiện thu tiền mặt và hoàn tất phiên đỗ của bạn.</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => checkoutMutation.mutate({ sessionId: currentSession.sessionId, amount: currentSession.estimatedFee || 0 })}
                disabled={checkoutMutation.isPending}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-md disabled:opacity-50 text-xs"
              >
                {checkoutMutation.isPending ? 'Đang tạo phiên giao dịch...' : 'Xác Nhận Phương Thức & Tiến Hành'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
