import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { parkingService } from '../services/parkingService';
import { authService } from '../services/authService';

export default function ParkingSessions() {
  const currentUser = authService.getCurrentUser();

  // Check-in Form State
  const [vehicleId, setVehicleId] = useState('1');
  const [slotId, setSlotId] = useState('1');
  const [ticketCode, setTicketCode] = useState('');
  const [checkInMsg, setCheckInMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Staff configuration for Checkout
  const [exitStaffId, setExitStaffId] = useState('1');
  const [exitGateId, setExitGateId] = useState('1');
  const [checkoutMsg, setCheckoutMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries
  const { data: activeSessions, refetch: refetchActiveSessions } = useQuery({
    queryKey: ['activeSessionsList'],
    queryFn: () => parkingService.getSessionsByStatus('ACTIVE'),
    refetchInterval: 5000,
  });

  // Check-in Mutation
  const checkInMutation = useMutation({
    mutationFn: parkingService.checkIn,
    onSuccess: (res) => {
      setCheckInMsg({
        type: 'success',
        text: `Cho xe vào bãi thành công! Mã vé: ${res.ticketCode} (Vị trí đỗ: #${res.slotId}).`,
      });
      setTicketCode('');
      refetchActiveSessions();
    },
    onError: (err: any) => {
      setCheckInMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Không thể thực hiện cho xe vào bãi.',
      });
    },
  });

  // Checkout Mutation
  const checkOutMutation = useMutation({
    mutationFn: ({ id, staffId, gateId }: { id: number; staffId: number; gateId: number }) =>
      parkingService.checkOut(id, staffId, gateId),
    onSuccess: (res) => {
      setCheckoutMsg({
        type: 'success',
        text: `Cho xe ra thành công! Mã vé: ${res.ticketCode}. Phí thanh toán: ${(res.totalFee || 0).toLocaleString()} đ.`,
      });
      refetchActiveSessions();
    },
    onError: (err: any) => {
      setCheckoutMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Lỗi cho xe ra bãi đỗ.',
      });
    },
  });

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInMsg(null);
    checkInMutation.mutate({
      vehicleId: parseInt(vehicleId, 10),
      slotId: parseInt(slotId, 10),
      ticketCode: ticketCode || `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'ACTIVE',
    });
  };

  const handleCheckOut = (sessionId: number) => {
    setCheckoutMsg(null);
    const staffIdVal = parseInt(exitStaffId, 10) || 1;
    const gateIdVal = parseInt(exitGateId, 10) || 1;
    checkOutMutation.mutate({ id: sessionId, staffId: staffIdVal, gateId: gateIdVal });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-sm">
              P
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                Cho xe ra/vào bãi
              </h1>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6 text-sm font-semibold">
            <Link to="/" className="text-slate-500 hover:text-slate-800 transition">Tổng quan</Link>
            <Link to="/sessions" className="text-indigo-600 border-b-2 border-indigo-500 pb-1">Cho xe ra/vào</Link>
            <Link to="/gate" className="text-slate-500 hover:text-slate-800 transition">Cổng Barie</Link>
            <Link to="/logs" className="text-slate-500 hover:text-slate-800 transition">Lịch sử lượt đỗ</Link>
          </nav>
          <div className="text-right text-xs">
            <p className="text-slate-400 font-bold uppercase">Nhân viên trực</p>
            <p className="font-bold text-slate-800">{currentUser?.username || 'User'}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Check-in Form Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <h3 className="text-base font-bold text-slate-800">Cho xe vào (Check-in)</h3>
              </div>

              {checkInMsg && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  checkInMsg.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {checkInMsg.text}
                </div>
              )}

              <form onSubmit={handleCheckIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ID Xe</label>
                  <input 
                    type="number"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ID Vị trí đỗ</label>
                  <input 
                    type="number"
                    value={slotId}
                    onChange={(e) => setSlotId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mã thẻ vé (Tùy chọn)</label>
                  <input 
                    type="text"
                    placeholder="Tự động tạo nếu để trống"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none text-sm"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={checkInMutation.isPending}
                  className="w-full py-2.5 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                >
                  {checkInMutation.isPending ? 'Đang gửi...' : 'Xác nhận cho xe vào'}
                </button>
              </form>
            </div>

            {/* Quick configurations for Checkout */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Cài đặt cổng/Nhân viên ra</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mã NV cổng ra</label>
                  <input 
                    type="number"
                    value={exitStaffId}
                    onChange={(e) => setExitStaffId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mã cổng ra</label>
                  <input 
                    type="number"
                    value={exitGateId}
                    onChange={(e) => setExitGateId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Sessions & Checkout Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-650"></span>
                  <h3 className="text-base font-bold text-slate-800">Xe đang hoạt động trong bãi</h3>
                </div>
                <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
                  {activeSessions ? activeSessions.length : 0} xe
                </span>
              </div>

              {checkoutMsg && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  checkoutMsg.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {checkoutMsg.text}
                </div>
              )}

              <div className="overflow-x-auto">
                {!activeSessions || activeSessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Không có lượt xe đang hoạt động trong bãi đỗ.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead>
                      <tr className="text-left text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Mã vé</th>
                        <th className="pb-3 font-semibold">ID Xe</th>
                        <th className="pb-3 font-semibold">Vị trí</th>
                        <th className="pb-3 font-semibold">Giờ vào</th>
                        <th className="pb-3 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSessions.map((session) => (
                        <tr key={session.sessionId} className="hover:bg-slate-50/50">
                          <td className="py-3 font-bold text-slate-800">{session.ticketCode}</td>
                          <td className="py-3 text-slate-600">#{session.vehicleId}</td>
                          <td className="py-3 text-slate-600">#{session.slotId}</td>
                          <td className="py-3 text-slate-400">
                            {session.entryTime ? new Date(session.entryTime).toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => session.sessionId && handleCheckOut(session.sessionId)}
                              disabled={checkOutMutation.isPending}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50 text-[11px]"
                            >
                              Cho xe ra (Checkout)
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
