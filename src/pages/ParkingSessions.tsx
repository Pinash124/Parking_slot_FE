import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { parkingService } from '../services/parkingService';
import Header from '../components/Header';
import QrScannerModal from '../components/QrScannerModal';

export default function ParkingSessions() {
  // Check-in Form State
  const [licensePlate, setLicensePlate] = useState('');
  const [slotId, setSlotId] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [checkInMsg, setCheckInMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Checkout Option States
  const [lostTicket, setLostTicket] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState('0');
  const [checkoutMsg, setCheckoutMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // QR Scanner State
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Barrier Control Overlay Modal States
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState<'checkin' | 'checkout'>('checkin');
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [scannedPlate, setScannedPlate] = useState('');

  // Auto Gate Controller states
  const [gateQuery, setGateQuery] = useState('');
  const [showFailOverlay, setShowFailOverlay] = useState(false);
  const [failedCode, setFailedCode] = useState('');

  // Queries
  const { data: activeSessions = [], refetch: refetchActiveSessions } = useQuery({
    queryKey: ['activeSessionsList'],
    queryFn: () => parkingService.getSessionsByStatus('ACTIVE'),
    refetchInterval: 5000,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: () => parkingService.getSlots(),
  });
  const availableSlots = slots.filter((s) => s.status === 'AVAILABLE');

  // Check-in Mutation
  const checkInMutation = useMutation({
    mutationFn: (payload: { licensePlate: string; slotId: number; ticketCode?: string }) =>
      parkingService.staffCheckIn('GATE_IN_01', payload),
    onSuccess: (res) => {
      setCheckInMsg({
        type: 'success',
        text: `Cho xe vào bãi thành công! Mã vé: ${res.ticketCode} (Vị trí đỗ: ${res.slotCode || `#${res.slotId}`}).`,
      });
      setTicketCode('');
      setLicensePlate('');
      setSlotId('');
      refetchActiveSessions();

      // Trigger overlay modal
      setSessionData(res);
      setOverlayType('checkin');
      setShowSuccessOverlay(true);
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
      parkingService.staffCheckout(id, { lostTicket, overtimeMinutes }),
    onSuccess: (res) => {
      setCheckoutMsg({
        type: 'success',
        text: `Cho xe ra thành công! Mã vé: ${res.ticketCode}. Phí thanh toán: ${(res.totalFee || 0).toLocaleString()} đ.`,
      });
      refetchActiveSessions();

      // Trigger overlay modal
      setSessionData(res);
      setOverlayType('checkout');
      setShowSuccessOverlay(true);
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
    if (!licensePlate || !slotId) {
      alert('Vui lòng nhập biển số xe và chọn vị trí ô đỗ.');
      return;
    }
    checkInMutation.mutate({
      licensePlate: licensePlate.toUpperCase().trim(),
      slotId: parseInt(slotId, 10),
      ticketCode: ticketCode || undefined,
    });
  };

  const handleCheckOut = (sessionId: number) => {
    setCheckoutMsg(null);
    const overtimeVal = parseInt(overtimeMinutes, 10) || 0;
    checkOutMutation.mutate({ id: sessionId, lostTicket, overtimeMinutes: overtimeVal });
  };

  const processGateScan = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    // Search activeSessions for matching ticketCode or licensePlate
    const session = activeSessions.find(
      (s: any) => 
        (s.licensePlate && s.licensePlate.toUpperCase() === cleanCode) ||
        (s.ticketCode && s.ticketCode.toUpperCase() === cleanCode)
    );

    if (session) {
      const idVal = session.id || session.sessionId;
      if (idVal) {
        setScannedPlate(session.licensePlate || '');
        const overtimeVal = parseInt(overtimeMinutes, 10) || 0;
        checkOutMutation.mutate({ id: idVal, lostTicket, overtimeMinutes: overtimeVal });
      }
    } else {
      // If it looks like a ticket code and is not active, it's invalid/already exited
      if (cleanCode.startsWith('TICKET')) {
        setFailedCode(cleanCode);
        setShowFailOverlay(true);
        return;
      }

      // Automatically check in the vehicle
      try {
        let matchedVehicleType = null;
        try {
          const registeredVehicles = await parkingService.getManagementVehicles();
          const matchedVehicle = registeredVehicles.find(
            (v: any) => v.plateNumber?.toUpperCase() === cleanCode
          );
          if (matchedVehicle) {
            matchedVehicleType = matchedVehicle.vehicleTypeId;
          }
        } catch (e) {
          console.warn('Failed to load registered vehicles', e);
        }

        // Find available slot
        let targetSlot = null;
        if (matchedVehicleType) {
          targetSlot = availableSlots.find((s) => s.vehicleTypeId === matchedVehicleType);
        }
        if (!targetSlot) {
          targetSlot = availableSlots[0];
        }

        if (!targetSlot) {
          setFailedCode(cleanCode);
          setShowFailOverlay(true);
          return;
        }

        checkInMutation.mutate({
          licensePlate: cleanCode,
          slotId: targetSlot.id,
        });
      } catch (err: any) {
        console.error(err);
        setFailedCode(cleanCode);
        setShowFailOverlay(true);
      }
    }
  };

  const handleQrScanSuccess = (decodedText: string) => {
    setIsQrScannerOpen(false);
    processGateScan(decodedText);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Check-in Form Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Automated Gate Controller Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-slate-100 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-base font-bold text-slate-800">Bộ Kiểm Soát Barie Tự Động</h3>
              </div>
              
              <p className="text-[11px] text-slate-450 leading-relaxed">
                Quét mã vé hoặc biển số xe để hệ thống tự động đối chiếu trạng thái. Nếu xe đã check-in, cổng barie sẽ tự động mở để cho xe ra.
              </p>

              {/* Checkout Settings (Overtime, Lost Ticket) */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5 text-xs font-semibold">
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="lostTicketCheck"
                    checked={lostTicket}
                    onChange={(e) => setLostTicket(e.target.checked)}
                    className="w-4 h-4 text-indigo-655 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="lostTicketCheck" className="ml-2 text-[11px] text-slate-655 cursor-pointer select-none">Báo mất thẻ/vé xe</label>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Thời gian đỗ quá hạn (phút)</label>
                  <input 
                    type="number"
                    value={overtimeMinutes}
                    min="0"
                    onChange={(e) => setOvertimeMinutes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-550 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsQrScannerOpen(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 20h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Bắt đầu quét Camera QR / Biển số</span>
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-100 w-full absolute"></div>
                  <span className="bg-white px-2.5 text-[10px] text-slate-400 font-bold uppercase relative">Hoặc nhập thủ công</span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    processGateScan(gateQuery);
                    setGateQuery('');
                  }}
                  className="flex space-x-2"
                >
                  <input
                    type="text"
                    value={gateQuery}
                    onChange={(e) => setGateQuery(e.target.value)}
                    placeholder="Mã vé hoặc Biển số xe..."
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none uppercase font-bold text-center tracking-wider text-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Kiểm tra
                  </button>
                </form>
              </div>
            </div>

            {/* Check-in Form Card */}
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Biển số xe</label>
                  <input 
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    required
                    placeholder="Ví dụ: 29A-12345"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none text-sm uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vị trí ô đỗ trống (AVAILABLE)</label>
                  <select
                    value={slotId}
                    onChange={(e) => setSlotId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-800 focus:outline-none text-sm font-semibold"
                  >
                    <option value="">-- Chọn ô đỗ trống --</option>
                    {availableSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.slotCode} ({slot.vehicleTypeName || `Loại #${slot.vehicleTypeId}`})
                      </option>
                    ))}
                  </select>
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
          </div>

          {/* Active Sessions & Checkout Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-655"></span>
                  <h3 className="text-base font-bold text-slate-800">Xe đang hoạt động trong bãi</h3>
                </div>
                <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
                  {activeSessions.length} xe
                </span>
              </div>

              {checkoutMsg && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  checkoutMsg.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-805' 
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {checkoutMsg.text}
                </div>
              )}

              <div className="overflow-x-auto">
                {activeSessions.length === 0 ? (
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
                          <td className="py-3 text-slate-650 font-bold">{session.licensePlate || `Xe #${session.vehicleId}`}</td>
                          <td className="py-3 text-slate-600 font-semibold">{session.slotCode || `Slot #${session.slotId}`}</td>
                          <td className="py-3 text-slate-400">
                            {session.entryTime ? new Date(session.entryTime).toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const idVal = session.id || session.sessionId;
                                if (idVal) {
                                  setScannedPlate(session.licensePlate || '');
                                  handleCheckOut(idVal);
                                }
                              }}
                              disabled={checkOutMutation.isPending}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50 text-[11px] cursor-pointer"
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
      {/* QR Camera Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
      />

      {/* SUCCESS OVERLAY & BARRIER CONTROL MODAL */}
      {showSuccessOverlay && sessionData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch relative z-10">
            
            {/* Printed Ticket or Payment Summary Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6.5 shadow-2xl flex flex-col justify-between text-slate-800 animate-in slide-in-from-left-6 duration-300">
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống SmartParking</p>
                <h4 className="text-lg font-black text-indigo-600 mt-1">
                  {overlayType === 'checkin' ? 'VÉ XE VÀO CỔNG' : 'THÔNG TIN BÁO CÁO XE RA'}
                </h4>
                <div className="inline-block mt-3 bg-slate-900 text-white font-mono font-bold px-4.5 py-1.5 rounded-lg text-xs tracking-widest">
                  {sessionData.ticketCode}
                </div>
              </div>

              <div className="py-6 space-y-3 text-xs font-semibold text-slate-700 flex-1 flex flex-col justify-center">
                {overlayType === 'checkin' ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-450 font-normal">Biển số vào:</span>
                      <span className="font-bold text-slate-900 uppercase font-mono text-sm">{sessionData.licensePlate || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-450 font-normal">Vị trí đỗ:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{sessionData.slotCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-450 font-normal">Cổng vào:</span>
                      <span>GATE_IN_01</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-450 font-normal">Thời gian vào:</span>
                      <span className="font-mono text-[11px] text-slate-650">
                        {sessionData.entryTime ? new Date(sessionData.entryTime).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Checkout Details with Plate Matching */}
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-450 font-normal">Biển số lúc vào:</span>
                      <span className="font-bold text-slate-900 uppercase font-mono">{sessionData.licensePlate || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-450 font-normal">Biển số lúc ra:</span>
                      <span className="font-bold text-slate-900 uppercase font-mono">{scannedPlate || sessionData.licensePlate || '—'}</span>
                    </div>
                    
                    {/* Security Match Check */}
                    <div className="py-2 border-b border-slate-50">
                      <span className="text-slate-450 font-normal block mb-1">Đối chiếu biển số (Security Match):</span>
                      {(!scannedPlate || scannedPlate === sessionData.licensePlate) ? (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg p-2 flex items-center space-x-1.5">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-[10px] font-extrabold uppercase">Khớp biển số (100% Match)</span>
                        </div>
                      ) : (
                        <div className="bg-rose-50 text-rose-700 border border-rose-100 rounded-lg p-2 flex items-center space-x-1.5 animate-pulse">
                          <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-[10px] font-extrabold uppercase">Cảnh báo: Biển số vào/ra không khớp!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-450 font-normal">Tổng phí thanh toán:</span>
                      <span className="font-extrabold text-indigo-700 text-sm">{(sessionData.totalFee || 0).toLocaleString()} đ</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-450 font-normal">Thời gian ra:</span>
                      <span className="font-mono text-[11px] text-slate-650">
                        {sessionData.exitTime ? new Date(sessionData.exitTime).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {overlayType === 'checkin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessOverlay(false);
                    setSessionData(null);
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold rounded-xl cursor-pointer transition active:scale-98 shadow-md shadow-indigo-600/25"
                >
                  Xác nhận xe đã vào bãi & Đóng barrier
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const idVal = sessionData.id || sessionData.sessionId;
                      if (idVal) {
                        await parkingService.staffCompleteExit(idVal, 'GATE_OUT_01');
                        alert('Xác nhận xe rời bãi đỗ thành công. Cổng barie đã đóng.');
                      }
                    } catch (err: any) {
                      alert('Lỗi khi hạ barie: ' + (err.response?.data?.message || err.message));
                    } finally {
                      setShowSuccessOverlay(false);
                      setSessionData(null);
                      setScannedPlate('');
                    }
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-555 text-white text-xs font-bold rounded-xl cursor-pointer transition active:scale-98 shadow-md shadow-emerald-600/25"
                >
                  Xác nhận xe đã qua & Hạ barrier cổng ra
                </button>
              )}
            </div>

            {/* Barrier Gate Raising Animation Column */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col justify-between items-center text-center animate-in slide-in-from-right-6 duration-300">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tín hiệu kiểm soát barie</span>
                <h4 className="text-base font-extrabold text-white mt-1 uppercase">Cổng Barie Đang Mở</h4>
              </div>

              {/* Graphical simulation of gate arm rotating up */}
              <div className="relative w-full h-48 flex items-end justify-center py-6">
                {/* Gate Base column */}
                <div className="w-10 h-32 bg-slate-800 border border-slate-700 rounded-lg relative flex flex-col justify-end items-center pb-3 shadow-md z-20">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute top-4"></span>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-400 absolute top-4"></span>
                  <div className="w-2 h-10 bg-slate-600 rounded"></div>
                </div>
                {/* Rotating barrier arm */}
                <div className="absolute w-52 h-3 bg-indigo-500 border border-indigo-400 rounded origin-left -rotate-90 translate-x-12 -translate-y-6 shadow-lg shadow-indigo-500/20 z-10 transition-transform duration-1000">
                  <div className="w-full h-full flex justify-between px-2 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-4 h-full bg-white/40 transform skew-x-12"></div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs font-bold text-emerald-500 tracking-wider">
                ● HỆ THỐNG MỞ CỔNG TỰ ĐỘNG (BARRIER OPEN)
              </p>
            </div>
            
          </div>
        </div>
      )}

      {/* FAIL OVERLAY MODAL */}
      {showFailOverlay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6.5 shadow-2xl relative text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div>
              <h4 className="text-lg font-black text-rose-600 uppercase tracking-wide">CỔNG TỪ CHỐI - THẤT BẠI (FAIL)</h4>
              <p className="text-slate-400 text-xs mt-1">Xe chưa thực hiện Check-in hoặc mã vé không hợp lệ</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl font-mono text-xs text-slate-700 max-w-xs mx-auto">
              <p className="font-bold text-slate-500 text-[10px] uppercase mb-1">Mã đã quét/nhập:</p>
              <span className="text-sm font-black text-slate-800 uppercase tracking-wide">{failedCode}</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed px-4">
              Hệ thống không tìm thấy bất kỳ lượt xe đang hoạt động nào khớp với thông tin trên. Vui lòng kiểm tra lại biển số hoặc hướng dẫn xe vào làn check-in.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowFailOverlay(false);
                  setFailedCode('');
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Đóng thông báo (Hạ Barrier)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
