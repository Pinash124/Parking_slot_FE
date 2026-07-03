import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState<'info' | 'booking' | 'ticket' | 'feedback'>('ticket'); // Default to ticket to show session

  // Additional states for services and QR modal
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [personalQrData, setPersonalQrData] = useState<{ qrCodeUrl: string; transferDescription: string; amount: number } | null>(null);
  const [showPersonalQrModal, setShowPersonalQrModal] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  // Stats / Live Slots Query
  const { data: stats } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => parkingService.getOverviewReport(),
    refetchInterval: 15000,
  });

  // Load pricing policies for rates view
  const { data: pricingPolicies = [] } = useQuery({
    queryKey: ['pricingPolicies'],
    queryFn: () => userPortalService.getPricingPolicies(),
  });

  // Current active session query pointing to user-portal endpoint
  const { data: currentSession } = useQuery({
    queryKey: ['currentSession'],
    queryFn: () => userPortalService.getUserPortalCurrentSession(),
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

  // VNPAY redirect mutation
  const checkoutMutation = useMutation({
    mutationFn: async ({ sessionId, amount }: { sessionId: number; amount: number }) => {
      const res = await parkingService.createVnpayPayment({
        sessionId,
        amount,
        returnUrl: window.location.origin + '/customer/payment-return',
        orderInfo: `Thanh toan ve xe cho phien do #${sessionId}`
      });
      if (res.paymentUrl) {
        // Direct redirect for better user flow
        window.location.href = res.paymentUrl;
      } else {
        alert('Không thể tạo liên kết thanh toán VNPay.');
      }
      return res;
    },
    onError: (err: any) => alert('Lỗi thanh toán VNPay: ' + (err.response?.data?.message || err.message)),
  });

  // Personal QR payment mutation
  const personalQrMutation = useMutation({
    mutationFn: (payload: { sessionId: number; amount: number }) =>
      userPortalService.createPersonalQrPayment(payload),
    onSuccess: (data) => {
      setPersonalQrData(data);
      setShowPersonalQrModal(true);
    },
    onError: (err: any) => {
      alert('Lỗi tạo mã QR chuyển khoản: ' + (err.response?.data?.message || err.message));
    },
  });

  // Add service mutation
  const addServiceMutation = useMutation({
    mutationFn: (serviceId: number) =>
      userPortalService.addUserPortalService({
        sessionId: currentSession?.sessionId!,
        serviceId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSession'] });
      alert('Đăng ký thêm dịch vụ bổ sung thành công!');
      setSelectedServiceId('');
    },
    onError: (err: any) => {
      alert('Lỗi khi thêm dịch vụ: ' + (err.response?.data?.message || err.message));
    },
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

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) {
      alert('Vui lòng chọn dịch vụ muốn thêm.');
      return;
    }
    addServiceMutation.mutate(parseInt(selectedServiceId, 10));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDescription(true);
    setTimeout(() => setCopiedDescription(false), 2000);
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
            onClick={() => setActiveTab('ticket')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap relative cursor-pointer ${
              activeTab === 'ticket' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Lượt đỗ xe hiện tại (Vé xe)
            {currentSession && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'info' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Bãi Xe & Bảng Giá
          </button>

          <button
            onClick={() => setActiveTab('booking')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'booking' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đặt Chỗ Trước
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
          <div className="max-w-4xl mx-auto space-y-6">
            {!currentSession ? (
              <div className="bg-white border border-slate-200 p-12 rounded-3xl shadow-sm text-center space-y-6 max-w-md mx-auto">
                <div className="w-16 h-16 bg-slate-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Không có lượt đỗ xe hoạt động</h3>
                  <p className="text-xs text-slate-450 mt-1 max-w-xs mx-auto leading-relaxed">
                    Hiện bạn không có xe đỗ tại hầm hoặc chưa có phiên đỗ nào được kích hoạt. Hãy đăng ký đặt lịch giữ chỗ trước để tiết kiệm thời gian!
                  </p>
                </div>

                <div className="pt-2 flex flex-col space-y-3.5 w-full">
                  <Link
                    to="/customer/reservations"
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-98 text-white rounded-2xl text-xs font-extrabold transition shadow-md shadow-indigo-600/10 cursor-pointer inline-block text-center"
                  >
                    Đặt lịch giữ chỗ đỗ xe &rarr;
                  </Link>
                </div>

                {/* Simulate Check-in Block for Testing */}
                <div className="pt-6 border-t border-slate-100 text-left">
                  <form onSubmit={handleSimulateCheckIn} className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Giả lập xe vào hầm (Chỉ dành cho thử nghiệm)</p>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Biển số xe</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 30A-123.45"
                        value={simulateLicensePlate}
                        onChange={(e) => setSimulateLicensePlate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs uppercase font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Chọn ô đỗ (Vị trí)</label>
                      <select
                        value={simulateSlotId}
                        onChange={(e) => setSimulateSlotId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
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
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold cursor-pointer transition"
                    >
                      {checkInMutation.isPending ? 'Đang kích hoạt...' : 'Kích Hoạt Vé Xe Giả Lập'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Session Card Info */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50/50 p-6 border-b border-dashed border-slate-200 text-center relative flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vé Xe Điện Tử</p>
                    <h4 className="text-2xl font-black text-indigo-600 mt-1">{currentSession.ticketCode}</h4>
                    <p className="text-[10px] text-slate-450 mt-0.5">Trạng thái: <span className="font-extrabold uppercase text-indigo-600">{currentSession.status}</span></p>
                    {currentSession.licensePlate && (
                      <div className="mt-4 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm w-32 h-32 flex items-center justify-center animate-in zoom-in-95 duration-200">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(currentSession.licensePlate)}`}
                          alt="Vehicle QR Ticket"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-5 text-xs font-medium">
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400">Biển số xe:</span>
                      <span className="font-bold text-slate-900 text-sm">{currentSession.licensePlate || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400">Phân loại xe:</span>
                      <span className="font-semibold text-slate-750">{currentSession.vehicleTypeName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400">Vị trí đỗ (Slot):</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">{currentSession.slotCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400">Khu vực đỗ (Zone):</span>
                      <span className="font-semibold text-slate-700">{currentSession.zoneName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400">Thời điểm vào bãi:</span>
                      <span className="font-semibold text-slate-750">
                        {currentSession.entryTime ? new Date(currentSession.entryTime).toLocaleString('vi-VN') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400">Thời gian đỗ:</span>
                      <span className="font-bold text-slate-800 font-mono tracking-wide">{liveDurationStr}</span>
                    </div>

                    {/* Additional Services List */}
                    {currentSession.additionalServices && currentSession.additionalServices.length > 0 && (
                      <div className="py-2 border-b border-slate-50 space-y-2">
                        <span className="text-slate-400 block mb-1">Dịch vụ bổ sung đã đăng ký:</span>
                        <div className="space-y-1.5">
                          {currentSession.additionalServices.map((svc: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-indigo-50/30 p-2.5 rounded-xl border border-indigo-50/50 text-[11px] font-semibold text-indigo-950">
                              <span>✨ {svc.serviceName || `Dịch vụ #${svc.serviceId}`}</span>
                              <span>{Number(svc.price).toLocaleString('vi-VN')}đ</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Select Form to Add Add-on Services */}
                    <div className="pt-2">
                      <form onSubmit={handleAddService} className="flex items-center space-x-2.5">
                        <div className="flex-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Chọn dịch vụ bổ sung
                          </label>
                          <select
                            value={selectedServiceId}
                            onChange={(e) => setSelectedServiceId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-[11px] font-bold focus:outline-none"
                          >
                            <option value="">-- Chọn Dịch Vụ --</option>
                            <option value="1">Rửa xe hút bụi ngoại thất (+50.000đ)</option>
                            <option value="2">Vệ sinh khoang máy chi tiết (+100.000đ)</option>
                            <option value="3">Bơm lốp & Đo áp suất tự động (+15.000đ)</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={addServiceMutation.isPending}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold cursor-pointer transition self-end disabled:opacity-50"
                        >
                          {addServiceMutation.isPending ? 'Đang thêm...' : '+ Thêm'}
                        </button>
                      </form>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <span className="text-slate-500 font-bold text-sm">Tổng phí tạm tính:</span>
                      <span className="text-2xl font-black text-indigo-600">{(currentSession.estimatedFee ?? 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Checkout Payment Options */}
                <div className="lg:col-span-1 space-y-6">
                  {currentSession.status === 'PAYMENT_PENDING' || currentSession.status === 'COMPLETED' ? (
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm text-center space-y-5">
                      <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800">ĐÃ HOÀN TẤT THANH TOÁN</h4>
                        <p className="text-[10px] text-slate-450 mt-1">Barrier cổng ra sẽ tự động mở khi xe của bạn di chuyển tới khu vực camera quét biển số.</p>
                      </div>
                      
                      {/* Exit QR for safety backup */}
                      <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl inline-block w-full">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">QR quét cổng ra dự phòng</p>
                        <div className="w-28 h-28 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-1 mx-auto shadow-sm animate-in zoom-in-95 duration-200">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(currentSession.licensePlate || '')}`}
                            alt="Exit QR Code"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Thanh Toán Trực Tuyến</h4>
                      <p className="text-[10px] text-slate-400">Chọn một trong hai hình thức thanh toán trực tiếp để thanh toán hóa đơn lượt đỗ:</p>

                      {/* Payment Choice Card 1: VNPAY */}
                      <button
                        onClick={() => checkoutMutation.mutate({ sessionId: currentSession.sessionId, amount: currentSession.estimatedFee || 0 })}
                        disabled={checkoutMutation.isPending}
                        className="w-full text-left p-4.5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/5 transition cursor-pointer flex items-start space-x-3 group"
                      >
                        <div className="w-10 h-10 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-600 shrink-0 text-sm">
                          VN
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 text-xs block group-hover:text-indigo-600 transition">Cổng VNPAY Gateway</span>
                          <span className="text-[9px] text-slate-450 mt-0.5 block leading-normal">Thanh toán qua ví điện tử, thẻ ATM nội địa, hoặc thẻ quốc tế Visa/MasterCard.</span>
                        </div>
                      </button>

                      {/* Payment Choice Card 2: Personal QR */}
                      <button
                        onClick={() => personalQrMutation.mutate({ sessionId: currentSession.sessionId, amount: currentSession.estimatedFee || 0 })}
                        disabled={personalQrMutation.isPending}
                        className="w-full text-left p-4.5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/5 transition cursor-pointer flex items-start space-x-3 group"
                      >
                        <div className="w-10 h-10 bg-emerald-50 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center font-bold text-emerald-650 shrink-0 text-xs">
                          QR
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 text-xs block group-hover:text-emerald-650 transition">Chuyển khoản QR cá nhân</span>
                          <span className="text-[9px] text-slate-450 mt-0.5 block leading-normal">Quét mã chuyển khoản nhanh nội bộ. Xác nhận tức thời.</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Info */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3 flex items-center">
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
                      <h4 className="font-bold text-slate-800 text-sm">Thời gian phục vụ</h4>
                      <p className="text-xs text-slate-450 mt-0.5 leading-relaxed">Chúng tôi mở cửa đón phương tiện gửi 24 giờ một ngày, 7 ngày một tuần kể cả ngày nghỉ lễ.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-650">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Các loại xe hỗ trợ gửi</h4>
                      <p className="text-xs text-slate-450 mt-0.5 leading-relaxed">Hầm đỗ hỗ trợ các phương tiện Xe Máy, Ô Tô Con dưới 9 chỗ và Xe Đạp Điện.</p>
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

            {/* Parking live slots info */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Công Suất Hầm Đỗ Xe</h3>
                <p className="text-slate-400 text-xs mb-4">Số liệu trực quan về số chỗ đỗ trống hiện thời</p>
                
                <div className="relative pt-1 mb-4">
                  <div className="flex mb-2 items-center justify-between text-xs">
                    <span className="text-slate-450 font-bold">Tỉ lệ lấp đầy hầm:</span>
                    <span className="font-extrabold text-indigo-600">{fillRate}%</span>
                  </div>
                  <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-100 border border-slate-200">
                    <div
                      style={{ width: `${fillRate}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-500"
                    ></div>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400">Tổng chỗ đỗ:</span>
                    <span className="text-slate-800">{totalSlots} chỗ</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400">Đã đỗ (Bận):</span>
                    <span className="text-indigo-600">{occupiedSlots} chỗ</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Còn trống:</span>
                    <span className="text-emerald-600 font-bold">{availableSlots} chỗ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Booking Form */}
        {activeTab === 'booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
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
                  <label className="block font-bold text-slate-500 mb-1.5">Giờ Xe Vào Dự Kiến</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1.5">Giờ Xe Ra Dự Kiến</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingMutation.isPending}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                >
                  {bookingMutation.isPending ? 'Đang đăng ký...' : 'Xác Nhận Đăng Ký Đặt Lịch'}
                </button>
              </form>
            </div>

            {/* Reservation History List in tab */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col">
              <h3 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Các yêu cầu đặt lịch của bạn</h3>
              
              {bookings.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs py-10">
                  Bạn chưa đăng ký đặt lịch đỗ xe lần nào
                </div>
              ) : (
                <div className="space-y-3.5 overflow-y-auto max-h-[380px] pr-1">
                  {bookings.map((booking) => {
                    const statusClass = 
                      booking.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      booking.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-slate-50 text-slate-500 border-slate-200';

                    return (
                      <div 
                        key={booking.id} 
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center text-xs gap-3"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800">Biển số: {booking.licensePlate || `Xe #${booking.vehicleId}`}</p>
                          <p className="text-slate-450 text-[10px]">
                            Phân khu đỗ: {booking.zoneName || `Phân khu #${booking.zoneId}`}
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            Vào: {booking.startTime ? new Date(booking.startTime).toLocaleString('vi-VN') : 'N/A'} • 
                            Ra: {booking.endTime ? new Date(booking.endTime).toLocaleString('vi-VN') : 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3 self-end sm:self-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${statusClass}`}>
                            {booking.status === 'APPROVED' ? 'Đã duyệt' : booking.status === 'PENDING' ? 'Chờ duyệt' : booking.status}
                          </span>
                          {booking.status === 'PENDING' && (
                            <button
                              onClick={() => cancelBookingMutation.mutate(booking.id)}
                              className="text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 px-2 py-1 rounded-lg text-[10px] font-bold transition"
                            >
                              Hủy đặt
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Feedback Form */}
        {activeTab === 'feedback' && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 mb-5">
              Gửi ý kiến đóng góp & Phản hồi
            </h3>
            
            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-450 mb-1.5 uppercase tracking-wide">Chủ đề phản hồi</label>
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
                <label className="block text-slate-450 mb-1.5 uppercase tracking-wide">Nội dung chi tiết</label>
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
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-md disabled:opacity-50"
              >
                {submitFeedbackMutation.isPending ? 'Đang gửi...' : 'Gửi Phản Hồi Ngay'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* PERSONAL QR MODAL */}
      {showPersonalQrModal && personalQrData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-default" onClick={() => setShowPersonalQrModal(false)}></div>
          
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative z-10 text-center animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Chuyển khoản QR cá nhân</h3>
              <button
                onClick={() => setShowPersonalQrModal(false)}
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* QR Image Display */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl inline-block mb-4">
              {personalQrData.qrCodeUrl ? (
                <img
                  src={personalQrData.qrCodeUrl}
                  alt="Mã QR chuyển khoản cá nhân"
                  className="w-44 h-44 mx-auto rounded-xl shadow-sm"
                />
              ) : (
                <div className="w-44 h-44 bg-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 font-bold mx-auto">
                  QR Code Placeholder
                </div>
              )}
            </div>

            {/* Amount details */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Số tiền cần chuyển</span>
              <span className="text-xl font-black text-indigo-600 mt-1 block">
                {Number(personalQrData.amount).toLocaleString('vi-VN')}đ
              </span>
            </div>

            {/* Transfer Description */}
            <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-4.5 mb-5 relative">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nội dung chuyển khoản</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-800 break-all select-all">
                  {personalQrData.transferDescription}
                </span>
                <button
                  onClick={() => copyToClipboard(personalQrData.transferDescription)}
                  className="text-indigo-600 hover:text-indigo-700 text-xs font-bold shrink-0 ml-3 cursor-pointer"
                >
                  {copiedDescription ? 'Đã sao chép!' : 'Sao chép'}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal mb-5">
              Sau khi quét mã và chuyển tiền thành công, hệ thống sẽ đối soát tự động và hoàn tất phiên đỗ của bạn trong 1-2 phút.
            </p>

            <button
              onClick={() => {
                setShowPersonalQrModal(false);
                queryClient.invalidateQueries({ queryKey: ['currentSession'] });
              }}
              className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition active:scale-98"
            >
              Tôi đã chuyển khoản xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
