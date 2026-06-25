import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { authService } from '../services/authService';
import { parkingService } from '../services/parkingService';
import api from '../services/api';

// Simple representation of LocalStorage mock storage to maintain session state for Driver UI simulations
interface SimBooking {
  id: number;
  licensePlate: string;
  vehicleType: string;
  zone: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface SimTicket {
  ticketCode: string;
  licensePlate: string;
  vehicleType: 'CAR' | 'BIKE';
  slotCode: string;
  entryTime: string;
  status: 'PARKED' | 'PAID' | 'LEFT';
}

export default function DriverDashboard() {
  const currentUser = authService.getCurrentUser();
  const [activeTab, setActiveTab] = useState<'info' | 'booking' | 'ticket' | 'feedback'>('info');

  // Stats / Live Slots Query
  const { data: stats } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => parkingService.getOverviewReport(),
    refetchInterval: 15000,
  });

  // --- STATE FOR BOOKING / RESERVATION ---
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [zoneId, setZoneId] = useState('1');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bookings, setBookings] = useState<SimBooking[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // --- STATE FOR VIRTUAL TICKET ---
  const [myTicket, setMyTicket] = useState<SimTicket | null>(null);
  const [ticketLicensePlate, setTicketLicensePlate] = useState('');
  const [ticketVehicleType, setTicketVehicleType] = useState<'CAR' | 'BIKE'>('CAR');
  const [ticketCreateMsg, setTicketCreateMsg] = useState<string | null>(null);
  
  // --- LIVE BILLING COUNTDOWN ---
  const [liveDurationStr, setLiveDurationStr] = useState('00g 00p 00s');
  const [liveFee, setLiveFee] = useState(0);

  // --- PAYMENT MODAL ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'QR' | 'WALLET' | 'BANK' | 'CASH'>('QR');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // --- FEEDBACK ---
  const [feedbackType, setFeedbackType] = useState('LOST_TICKET');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Load Sim data from LocalStorage
  useEffect(() => {
    const savedBookings = localStorage.getItem('sim_bookings');
    if (savedBookings) {
      setBookings(JSON.parse(savedBookings));
    }

    const savedTicket = localStorage.getItem('sim_ticket');
    if (savedTicket) {
      setMyTicket(JSON.parse(savedTicket));
    } else {
      // Auto-populate a default active ticket for demonstration if none exists
      const defaultTicket: SimTicket = {
        ticketCode: 'TICKET-99281',
        licensePlate: '30A-999.88',
        vehicleType: 'CAR',
        slotCode: 'A-102',
        entryTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), // 3.5 hours ago
        status: 'PARKED',
      };
      setMyTicket(defaultTicket);
      localStorage.setItem('sim_ticket', JSON.stringify(defaultTicket));
    }
  }, []);

  // Update Live Fee & Duration counter
  useEffect(() => {
    if (!myTicket || myTicket.status !== 'PARKED') return;

    const interval = setInterval(() => {
      const entryDate = new Date(myTicket.entryTime);
      const diffMs = Date.now() - entryDate.getTime();
      
      const hours = Math.floor(diffMs / (3600 * 1000));
      const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
      const secs = Math.floor((diffMs % (60 * 1000)) / 1000);

      const hStr = hours < 10 ? '0' + hours : hours;
      const mStr = mins < 10 ? '0' + mins : mins;
      const sStr = secs < 10 ? '0' + secs : secs;
      setLiveDurationStr(`${hStr}g ${mStr}p ${sStr}s`);

      // Price calculation: 30K/hr for car, 10K/hr for bike. Min 1 hour.
      const ratePerHour = myTicket.vehicleType === 'CAR' ? 30000 : 10000;
      const totalHours = Math.max(1, diffMs / (3600 * 1000));
      // Round to nearest 500 VND
      const fee = Math.round((totalHours * ratePerHour) / 500) * 500;
      setLiveFee(fee);
    }, 1000);

    return () => clearInterval(interval);
  }, [myTicket]);

  // Handle Booking form submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate || !startTime || !endTime) {
      setBookingError('Vui lòng nhập đầy đủ các trường thông tin.');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    const startLocal = new Date(startTime).toISOString();
    const endLocal = new Date(endTime).toISOString();

    const payload = {
      userId: currentUser ? 1 : 1, // Simulated Customer User ID
      vehicleId: 1, // Preseeded Vehicle ID
      zoneId: parseInt(zoneId, 10),
      startTime: startLocal,
      endTime: endLocal
    };

    try {
      // 1. Try real backend API
      const response = await api.post('/api/reservations', payload);
      const newBook: SimBooking = {
        id: response.data.id,
        licensePlate: response.data.licensePlate || licensePlate,
        vehicleType: vehicleType,
        zone: response.data.zoneName || (zoneId === '1' ? 'Khu A (Dưới hầm)' : 'Khu B (Ngoài trời)'),
        startTime: startTime,
        endTime: endTime,
        status: response.data.status || 'APPROVED'
      };
      const updated = [newBook, ...bookings];
      setBookings(updated);
      localStorage.setItem('sim_bookings', JSON.stringify(updated));
      setBookingSuccess('Đăng ký đặt chỗ trước thành công trên hệ thống!');
      // Reset form
      setLicensePlate('');
      setStartTime('');
      setEndTime('');
    } catch (err: any) {
      console.warn('Backend reservations call failed, falling back to LocalStorage simulation. Reason:', err.message);
      
      // 2. Simulation fallback
      const mockId = Math.floor(Math.random() * 100000);
      const newBook: SimBooking = {
        id: mockId,
        licensePlate: licensePlate.toUpperCase(),
        vehicleType: vehicleType,
        zone: zoneId === '1' ? 'Khu A (Tầng hầm)' : zoneId === '2' ? 'Khu B (Tầng lửng)' : 'Khu C (Mặt đất)',
        startTime: startTime.replace('T', ' '),
        endTime: endTime.replace('T', ' '),
        status: 'XÁC NHẬN (APPROVED)'
      };
      const updated = [newBook, ...bookings];
      setBookings(updated);
      localStorage.setItem('sim_bookings', JSON.stringify(updated));
      setBookingSuccess('Đăng ký đặt chỗ trước thành công (Simulated)!');
      // Reset form
      setLicensePlate('');
      setStartTime('');
      setEndTime('');
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (id: number) => {
    try {
      await api.patch(`/api/reservations/${id}/cancel`);
    } catch (err) {
      console.warn('Real cancel failed, applying simulator cancel locally');
    }
    const updated = bookings.map(b => b.id === id ? { ...b, status: 'ĐÃ HỦY' } : b);
    setBookings(updated);
    localStorage.setItem('sim_bookings', JSON.stringify(updated));
  };

  // Generate / Simulated Entrance check-in ticket (Simulation trigger)
  const handleGenerateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketLicensePlate) return;

    const newTicket: SimTicket = {
      ticketCode: 'TICKET-' + Math.floor(10000 + Math.random() * 90000),
      licensePlate: ticketLicensePlate.toUpperCase(),
      vehicleType: ticketVehicleType,
      slotCode: ['A-101', 'B-205', 'C-012', 'A-204'][Math.floor(Math.random() * 4)],
      entryTime: new Date().toISOString(),
      status: 'PARKED',
    };
    setMyTicket(newTicket);
    localStorage.setItem('sim_ticket', JSON.stringify(newTicket));
    setTicketCreateMsg('Nhận vé xe và đỗ xe thành công!');
    setTicketLicensePlate('');
    setTimeout(() => setTicketCreateMsg(null), 3000);
  };

  // Open checkout and payment flow
  const handleCheckoutPayment = () => {
    if (!myTicket) return;
    setPaymentSuccess(false);
    setShowPaymentModal(true);
  };

  // Simulate Payment transaction processing
  const executePayment = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      if (myTicket) {
        const updatedTicket: SimTicket = {
          ...myTicket,
          status: 'PAID'
        };
        setMyTicket(updatedTicket);
        localStorage.setItem('sim_ticket', JSON.stringify(updatedTicket));
      }
    }, 2000);
  };

  // Simulate vehicle leaving barrier
  const handleVehicleExit = () => {
    if (myTicket) {
      const updatedTicket: SimTicket = {
        ...myTicket,
        status: 'LEFT'
      };
      setMyTicket(updatedTicket);
      localStorage.setItem('sim_ticket', JSON.stringify(updatedTicket));
    }
    setShowPaymentModal(false);
  };

  // Handle Feedback Submission
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent) return;

    setFeedbackLoading(true);
    setTimeout(() => {
      setFeedbackLoading(false);
      setFeedbackSuccess(true);
      setFeedbackContent('');
      setTimeout(() => setFeedbackSuccess(false), 3000);
    }, 1000);
  };

  // Slot calculations from real API stats or default mockup numbers
  const availableSlots = stats?.availableSlots ?? 34;
  const occupiedSlots = stats?.occupiedSlots ?? 16;
  const totalSlots = availableSlots + occupiedSlots;
  const fillRate = totalSlots === 0 ? 0 : Math.round((occupiedSlots * 100) / totalSlots);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Xin chào, {currentUser?.username || 'Khách hàng'}!</h2>
            <p className="mt-1.5 text-indigo-100 text-sm max-w-xl">
              Cổng thông tin lái xe cá nhân. Đặt chỗ trước, nhận vé điện tử, thanh toán và gửi phản hồi bãi đỗ xe tức thời.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4.5 py-3 rounded-2xl border border-white/10 flex items-center space-x-3 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold">Bãi đỗ xe 24/7 đang mở cửa</span>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto space-x-2 pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'info'
                ? 'bg-indigo-50 text-indigo-650'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Bãi Xe & Bảng Giá
          </button>
          
          <button
            onClick={() => setActiveTab('ticket')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap relative cursor-pointer ${
              activeTab === 'ticket'
                ? 'bg-indigo-50 text-indigo-650'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Vé Xe Của Tôi
            {myTicket && myTicket.status === 'PARKED' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('booking')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'booking'
                ? 'bg-indigo-50 text-indigo-650'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Đặt Chỗ Trước
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-indigo-50 text-indigo-650'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Gửi Phản Hồi
          </button>
        </div>

        {/* Tab 1: Info */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Slot details */}
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
                      <p className="text-sm font-bold text-slate-800 mt-0.5">Ô tô (Car) & Xe máy (Motorbike)</p>
                      <p className="text-xs text-slate-400 mt-1">Xe từ 4-7 chỗ, xe máy số và ga thông thường</p>
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
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                        <th className="pb-3">Loại Xe</th>
                        <th className="pb-3 text-right">Phí 1 Giờ Đầu</th>
                        <th className="pb-3 text-right">Phí Mỗi Giờ Tiếp Theo</th>
                        <th className="pb-3 text-right">Phí Trọn Gói Ngày (24h)</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-3.5 flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                          <span className="font-bold text-slate-800">Xe Máy (Motorbike)</span>
                        </td>
                        <td className="py-3.5 text-right font-semibold">10.000đ</td>
                        <td className="py-3.5 text-right font-semibold">5.000đ</td>
                        <td className="py-3.5 text-right font-bold text-indigo-650">50.000đ</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-3.5 flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                          <span className="font-bold text-slate-800">Ô Tô (Car)</span>
                        </td>
                        <td className="py-3.5 text-right font-semibold">30.000đ</td>
                        <td className="py-3.5 text-right font-semibold">15.000đ</td>
                        <td className="py-3.5 text-right font-bold text-indigo-650">150.000đ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-800 flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>* Lưu ý:</strong> Phí đỗ xe qua đêm được áp dụng theo biểu phí lũy kế theo giờ. Trường hợp làm mất vé giấy (với khách vãng lai không đặt chỗ trước) sẽ bị phạt 100.000đ theo quy định.
                  </span>
                </div>
              </div>
            </div>

            {/* Left/Sidebar: Capacity Stats */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Trạng thái chỗ trống</h3>
                <div className="inline-flex items-center justify-center relative w-36 h-36 mb-4">
                  {/* Circle outline indicator */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" className="stroke-slate-100" strokeWidth="12" fill="transparent" />
                    <circle cx="72" cy="72" r="60" className="stroke-indigo-600 transition-all duration-500" strokeWidth="12" fill="transparent"
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
            {!myTicket || myTicket.status === 'LEFT' ? (
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Không có vé xe đỗ hoạt động</h3>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                    Hiện xe của bạn chưa vào bãi đỗ hoặc bạn chưa nhận vé xe điện tử. Hãy quét RFID hoặc tạo một vé giả lập bên dưới.
                  </p>
                </div>

                {/* Simulate Checkin generator */}
                <div className="max-w-sm mx-auto pt-6 border-t border-slate-150">
                  <form onSubmit={handleGenerateTicket} className="space-y-3.5 text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Mô phỏng quét vé vào bãi (Check-in)</p>
                    {ticketCreateMsg && (
                      <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs p-2.5 rounded-xl text-center font-semibold">
                        {ticketCreateMsg}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Biển số xe giả lập</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 30A-123.45"
                        value={ticketLicensePlate}
                        onChange={(e) => setTicketLicensePlate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none uppercase font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Loại phương tiện</label>
                      <select
                        value={ticketVehicleType}
                        onChange={(e) => setTicketVehicleType(e.target.value as 'CAR' | 'BIKE')}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none font-bold"
                      >
                        <option value="CAR">Ô Tô (Car)</option>
                        <option value="BIKE">Xe Máy (Motorbike)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                    >
                      Bấm Quét RFID Vào Cổng (Check-in)
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Visual Ticket Receipt Card */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg border-t-8 border-indigo-600">
                  <div className="bg-slate-50/50 p-6 border-b border-dashed border-slate-200 text-center relative">
                    {/* Circle side cutouts for ticket aesthetic */}
                    <div className="absolute bottom-0 left-0 w-4 h-8 bg-slate-50 border-r border-slate-200 rounded-r-full transform translate-y-4"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-8 bg-slate-50 border-l border-slate-200 rounded-l-full transform translate-y-4"></div>
                    
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vé Xe Điện Tử</p>
                    <h4 className="text-2xl font-extrabold text-indigo-600 tracking-tight mt-1">{myTicket.ticketCode}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Hệ thống đỗ xe tự động SmartParking</p>
                  </div>

                  <div className="p-6 space-y-4 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Biển số xe:</span>
                      <span className="font-bold text-slate-800 text-base">{myTicket.licensePlate}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Loại xe:</span>
                      <span className="font-semibold text-slate-800">{myTicket.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Vị trí đỗ (Slot):</span>
                      <span className="font-bold text-indigo-650 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">{myTicket.slotCode}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Giờ vào:</span>
                      <span className="font-semibold text-slate-800">{new Date(myTicket.entryTime).toLocaleString('vi-VN')}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Thời gian đỗ:</span>
                      <span className="font-bold text-slate-700 font-mono">{myTicket.status === 'PARKED' ? liveDurationStr : 'Đã thanh toán'}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-400 font-bold">Phí tạm tính:</span>
                      <span className="text-2xl font-extrabold text-indigo-600">{myTicket.status === 'PARKED' ? liveFee.toLocaleString('vi-VN') + 'đ' : '0đ'}</span>
                    </div>

                    {/* Paid Stamp */}
                    {myTicket.status === 'PAID' && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-center font-bold text-sm flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>ĐÃ THANH TOÁN (HỢP LỆ RA CỔNG)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulated QR Check-out trigger */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5 text-center">
                  <h4 className="font-bold text-slate-800 text-base">QR / RFID Định Danh Của Bạn</h4>
                  <p className="text-xs text-slate-400">Đưa mã QR này trước camera tại Barie cổng ra để quét nhận diện checkout tự động.</p>
                  
                  {/* Elegant QR Code Simulation */}
                  <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl inline-block shadow-inner">
                    <div className="w-40 h-40 bg-white border border-slate-250 rounded-xl flex items-center justify-center p-2 mx-auto relative group">
                      {/* Simulating QR grid using SVG lines */}
                      <svg className="w-full h-full text-slate-800" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 2h6v6H2V2zm1.5 1.5v3h3v-3h-3zM2 16h6v6H2v-6zm1.5 1.5v3h3v-3h-3zM16 2h6v6h-6V2zm1.5 1.5v3h3v-3h-3zM12 2h2v2h-2V2zm0 4h2v2h-2V6zm2-2h2v2h-2V4zm-2 6h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm6-4h2v2h-2v-2zm0 4h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-6 2h2v2h-2v-2zm6 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
                      </svg>
                      {/* Overlay scanning effect */}
                      {myTicket.status === 'PARKED' && (
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-500 animate-bounce"></div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {myTicket.status === 'PARKED' ? (
                      <button
                        onClick={handleCheckoutPayment}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-indigo-200 cursor-pointer"
                      >
                        Thanh Toán Online Ra Bãi
                      </button>
                    ) : myTicket.status === 'PAID' ? (
                      <div className="space-y-2">
                        <button
                          onClick={handleVehicleExit}
                          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition cursor-pointer"
                        >
                          Giả Lập Cho Xe Đi Qua Barie Cổng Ra
                        </button>
                        <p className="text-[11px] text-slate-400">Hóa đơn đã được ghi nhận. Bạn có 15 phút để di chuyển xe ra khỏi bãi đỗ.</p>
                      </div>
                    ) : (
                      <div className="py-4 text-slate-400">
                        <p className="font-semibold text-slate-650">Lượt đỗ đã kết thúc thành công!</p>
                        <button
                          onClick={() => {
                            setMyTicket(null);
                            localStorage.removeItem('sim_ticket');
                          }}
                          className="mt-3 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg cursor-pointer"
                        >
                          Tạo Lượt Đỗ Mới (Simulation)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Booking / Reservations */}
        {activeTab === 'booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                <span>Đặt Chỗ Trước (Booking)</span>
              </h3>

              {bookingSuccess && (
                <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs p-3.5 rounded-xl font-semibold">
                  {bookingSuccess}
                </div>
              )}

              {bookingError && (
                <div className="bg-rose-50 border border-rose-250 text-rose-800 text-xs p-3.5 rounded-xl">
                  {bookingError}
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Biển số xe đỗ</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 30A-999.88"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none uppercase font-bold text-sm tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại phương tiện</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-850 text-sm focus:outline-none font-bold"
                  >
                    <option value="CAR">Ô Tô (Car)</option>
                    <option value="BIKE">Xe Máy (Motorbike)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Khu vực muốn gửi</label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-850 text-sm focus:outline-none font-bold"
                  >
                    <option value="1">Khu A (Tầng hầm - Rộng rãi)</option>
                    <option value="2">Khu B (Tầng lửng - Ô tô/Xe máy)</option>
                    <option value="3">Khu C (Ngoài trời - Có mái che)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Thời gian bắt đầu gửi</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-805 text-sm focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Thời gian kết thúc dự kiến</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-805 text-sm focus:outline-none font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {bookingLoading ? 'Đang gửi yêu cầu...' : 'Nhận xác nhận Booking'}
                </button>
              </form>
            </div>

            {/* Booking List */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                  <span>Danh Sách Lượt Đặt Chỗ Trước</span>
                </span>
                <span className="text-xs text-slate-400 font-semibold">{bookings.length} Booking</span>
              </h3>

              {bookings.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Bạn chưa đăng ký đặt vị trí đỗ xe trước nào.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                  {bookings.map((book) => (
                    <div key={book.id} className="border border-slate-150 p-4 rounded-2xl hover:border-indigo-350 transition space-y-3 bg-slate-50/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase">Mã Booking: #{book.id}</span>
                          <h4 className="text-base font-extrabold text-slate-800 mt-0.5">{book.licensePlate}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          book.status.includes('XÁC NHẬN') || book.status === 'APPROVED'
                            ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {book.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400 font-medium">Loại xe</p>
                          <p className="font-bold text-slate-700 mt-0.5">{book.vehicleType === 'CAR' ? 'Ô Tô' : 'Xe Máy'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Khu vực gửi</p>
                          <p className="font-bold text-slate-700 mt-0.5">{book.zone}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-400 font-medium">Thời gian gửi</p>
                          <p className="font-bold text-slate-700 mt-0.5">
                            {new Date(book.startTime).toLocaleString('vi-VN')} → {new Date(book.endTime).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>

                      {book.status !== 'ĐÃ HỦY' && (
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => handleCancelBooking(book.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                          >
                            Hủy đặt chỗ
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Feedback */}
        {activeTab === 'feedback' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800">Gửi Phản Hồi & Báo Cáo Sự Cố</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Gặp vấn đề tại bãi đỗ xe? Hãy gửi phản hồi để đội ngũ nhân viên trực kỹ thuật xử lý và phản hồi sớm nhất.
              </p>
            </div>

            {feedbackSuccess && (
              <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs p-3.5 rounded-xl text-center font-semibold">
                Gửi phản hồi thành công! Chúng tôi đã ghi nhận và sẽ phản hồi qua Email của bạn.
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Loại vấn đề cần phản hồi</label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-850 text-sm focus:outline-none font-bold"
                >
                  <option value="LOST_TICKET">Mất vé giấy (Lost ticket)</option>
                  <option value="INCORRECT_FEE">Sai phí gửi xe (Incorrect billing fee)</option>
                  <option value="CAR_LOCATING">Khó tìm xe trong hầm (Difficulty finding car)</option>
                  <option value="SLOT_OCCUPIED">Slot đỗ đăng ký bị chiếm (Slot occupied)</option>
                  <option value="OTHER">Lỗi hệ thống hoặc vấn đề khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chi tiết phản hồi</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể sự cố bạn gặp phải (ví dụ: Biển số xe, vị trí slot đỗ, mã vé, thời gian phát hiện...)"
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-450 focus:outline-none text-sm leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={feedbackLoading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {feedbackLoading ? 'Đang gửi phản hồi...' : 'Gửi phản hồi sự cố'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* PAYMENT MODAL (Simulating Online Checkout) */}
      {showPaymentModal && myTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-250 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50/50 px-6 py-4.5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-850 text-base">Thanh Toán Vé Xe #{myTicket.ticketCode}</h3>
              <button
                onClick={() => { if (!paymentProcessing) setShowPaymentModal(false); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {paymentSuccess ? (
                <div className="text-center space-y-4 py-4 animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">Thanh Toán Giao Dịch Thành Công</h4>
                    <p className="text-xs text-slate-400 mt-1">Cổng Barie ra tự động đã mở khóa cho xe {myTicket.licensePlate}.</p>
                  </div>
                  <button
                    onClick={handleVehicleExit}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition cursor-pointer"
                  >
                    Hoàn thành
                  </button>
                </div>
              ) : (
                <>
                  {/* Bill Summary */}
                  <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Số tiền cần thanh toán</p>
                      <p className="text-2xl font-extrabold text-indigo-650 mt-1">{liveFee.toLocaleString('vi-VN')}đ</p>
                    </div>
                    <span className="text-xs bg-indigo-100/50 text-indigo-850 px-2.5 py-1 rounded-xl font-bold border border-indigo-200">Vé lượt</span>
                  </div>

                  {/* Payment method selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chọn phương thức thanh toán</label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      <button
                        onClick={() => setPaymentMethod('QR')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                          paymentMethod === 'QR'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-650'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <svg className="w-5 h-5 text-indigo-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span>QR Payment</span>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('WALLET')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                          paymentMethod === 'WALLET'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-650'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <svg className="w-5 h-5 text-pink-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span>Ví Momo/ZaloPay</span>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('BANK')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                          paymentMethod === 'BANK'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-650'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <svg className="w-5 h-5 text-emerald-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Chuyển Khoản</span>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('CASH')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                          paymentMethod === 'CASH'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-650'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <svg className="w-5 h-5 text-amber-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Tiền Mặt (Quầy)</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Simulator Display */}
                  <div className="pt-2 border-t border-slate-100">
                    {paymentMethod === 'QR' && (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-3.5">
                        <p className="text-[11px] text-slate-400 font-bold uppercase">Quét mã VietQR bên dưới để thanh toán</p>
                        <div className="w-32 h-32 bg-white border border-slate-250 p-2 mx-auto rounded-lg flex items-center justify-center">
                          {/* Visual mockup of bank qr */}
                          <svg className="w-full h-full text-indigo-650" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v4h-4V7zm-6 6h4v4H7v-4zm6 0h4v4h-4v-4z" />
                          </svg>
                        </div>
                        <p className="text-[10px] text-slate-400">Vietcombank - CTCP SmartParking<br />Số TK: 10099887766</p>
                      </div>
                    )}

                    {paymentMethod === 'WALLET' && (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-2 text-xs">
                        <p className="text-slate-400">Ấn nút thanh toán dưới để liên kết ứng dụng ví điện tử Momo / ZaloPay tự động</p>
                        <p className="font-bold text-slate-700">Mã giao dịch: MOMO_{myTicket.ticketCode}</p>
                      </div>
                    )}

                    {paymentMethod === 'BANK' && (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between"><span className="text-slate-400">Ngân hàng:</span><span className="font-bold text-slate-800">Vietcombank (VCB)</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Số tài khoản:</span><span className="font-bold text-slate-800">10099887766</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Chủ tài khoản:</span><span className="font-bold text-slate-850">CTCP PARKINGSMART</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Nội dung CK:</span><span className="font-bold text-indigo-600 uppercase font-mono">{myTicket.ticketCode}</span></div>
                      </div>
                    )}

                    {paymentMethod === 'CASH' && (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1.5 text-xs text-slate-600">
                        <p className="text-slate-400">Bạn vui lòng đưa vé xe hoặc biển số xe cho thu ngân tại chốt cổng ra kiểm soát bãi đỗ để trả tiền mặt.</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={executePayment}
                    disabled={paymentProcessing}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-indigo-100 flex items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    {paymentProcessing ? (
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang xử lý giao dịch...</span>
                      </div>
                    ) : (
                      'Xác Nhận Đã Thanh Toán'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
