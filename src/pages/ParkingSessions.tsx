import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { parkingService } from '../services/parkingService';
import Header from '../components/Header';

export default function ParkingSessions() {

  // Check-in Form State
  const [vehicleId, setVehicleId] = useState('1');
  const [slotId, setSlotId] = useState('1');
  const [ticketCode, setTicketCode] = useState('');
  const [checkInMsg, setCheckInMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Checkout Option States
  const [lostTicket, setLostTicket] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState('0');
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
        text: `Cho xe vào bãi thành công! Mã vé: ${res.ticketCode} (Vị trí đỗ: ${res.slotCode || `#${res.slotId}`}).`,
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
    mutationFn: ({ id, lostTicket, overtimeMinutes }: { id: number; lostTicket: boolean; overtimeMinutes: number }) =>
      parkingService.checkOut(id, { lostTicket, overtimeMinutes }),
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
      ticketCode: ticketCode || undefined,
    });
  };

  const handleCheckOut = (sessionId: number) => {
    setCheckoutMsg(null);
    const overtimeVal = parseInt(overtimeMinutes, 10) || 0;
    checkOutMutation.mutate({ id: sessionId, lostTicket, overtimeMinutes: overtimeVal });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ID Phương tiện</label>
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

            {/* Quick configurations for Checkout Options */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Tùy chọn thanh toán ra bãi</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="lostTicket"
                    checked={lostTicket}
                    onChange={(e) => setLostTicket(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="lostTicket" className="ml-2 text-xs font-semibold text-slate-650">Báo mất thẻ/vé xe</label>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Thời gian đỗ quá hạn (phút)</label>
                  <input 
                    type="number"
                    value={overtimeMinutes}
                    min="0"
                    onChange={(e) => setOvertimeMinutes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
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
                        <th className="pb-3 font-semibold">Biển số</th>
                        <th className="pb-3 font-semibold">Vị trí</th>
                        <th className="pb-3 font-semibold">Giờ vào</th>
                        <th className="pb-3 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSessions.map((session) => (
                        <tr key={session.id || session.sessionId} className="hover:bg-slate-50/50">
                          <td className="py-3 font-bold text-slate-800">{session.ticketCode}</td>
                          <td className="py-3 text-slate-600">{session.licensePlate || `Xe #${session.vehicleId}`}</td>
                          <td className="py-3 text-slate-600">{session.slotCode || `Slot #${session.slotId}`}</td>
                          <td className="py-3 text-slate-400">
                            {session.entryTime ? new Date(session.entryTime).toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                const idVal = session.id || session.sessionId;
                                if (idVal) handleCheckOut(idVal);
                              }}
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
