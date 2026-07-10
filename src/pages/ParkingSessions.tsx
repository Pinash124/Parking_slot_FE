import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { parkingService } from '../services/parkingService';
import { userPortalService } from '../services/userPortalService';
import Header from '../components/Header';
import QrScannerModal from '../components/QrScannerModal';

export default function ParkingSessions() {

  // Tab state
  const [activeTab, setActiveTab] = useState<'gate' | 'history'>('gate');

  // Search & Validation state
  const [gateSearchQuery, setGateSearchQuery] = useState('');
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Check-in Form state (when vehicle is not in garage)
  const [licensePlate, setLicensePlate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedSlotCode, setSelectedSlotCode] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [entryGateCode, setEntryGateCode] = useState('GATE_IN_01');
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [reservationData, setReservationData] = useState<any | null>(null);
  const [checkInMsg, setCheckInMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Checkout Options state (when vehicle is in garage)
  const [lostTicket, setLostTicket] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState('0');
  const [checkoutMsg, setCheckoutMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // QR Scanner state
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrPurpose, setQrPurpose] = useState<'search' | 'checkin'>('search');

  // Success Overlay / Barrier control popup states
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState<'checkin' | 'checkout'>('checkin');
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [scannedPlate, setScannedPlate] = useState('');

  // History Tab search & filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');

  // Payment Method Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingCheckoutSessionId, setPendingCheckoutSessionId] = useState<number | null>(null);
  const [pendingCheckoutFee, setPendingCheckoutFee] = useState<number>(0);
  const [pendingCheckoutTicket, setPendingCheckoutTicket] = useState<string>('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentPolling, setPaymentPolling] = useState(false);
  const [transferInfo, setTransferInfo] = useState<any | null>(null);
  const [paymentMsg, setPaymentMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // --- QUERIES ---

  // Active Sessions Query
  const { data: activeSessions = [], refetch: refetchActiveSessions } = useQuery({
    queryKey: ['activeSessionsList'],
    queryFn: () => parkingService.staffGetSessions('ACTIVE'),
    refetchInterval: 5000,
  });

  // All Sessions Query (History)
  const { data: allSessions = [], refetch: refetchAllSessions } = useQuery({
    queryKey: ['staffAllSessionsList'],
    queryFn: () => parkingService.staffGetSessions(),
    refetchInterval: 10000,
  });

  // Available Slots Query (For Check-in)
  const { data: rawAvailableSlots = [], isLoading: isSlotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['staffAvailableSlots'],
    queryFn: () => userPortalService.getAvailableSlots(undefined, undefined, 'PARKING'),
  });

  const availableSlots = rawAvailableSlots.map((s: any) => ({
    ...s,
    id: s.slotId ?? s.id,
  }));

  // --- MUTATIONS ---

  // Check-in Mutation
  const checkInMutation = useMutation({
    mutationFn: (payload: { licensePlate: string; slotId: number; ticketCode?: string; reservationId?: number; vehicleId?: number }) =>
      parkingService.staffCheckIn(entryGateCode, payload),
    onSuccess: (res) => {
      setCheckInMsg({
        type: 'success',
        text: `Cho xe vào bãi thành công! Mã vé: ${res.ticketCode} (Vị trí đỗ: ${res.slotCode || `#${res.slotId}`}).`,
      });
      setTicketCode('');
      setLicensePlate('');
      setSelectedSlotId(null);
      setSelectedSlotCode('');
      setReservationId(null);
      setVehicleId(null);
      setReservationData(null);
      refetchActiveSessions();
      refetchAllSessions();

      // Trigger barrier open overlay modal
      setSessionData(res);
      setOverlayType('checkin');
      setShowSuccessOverlay(true);
      
      // Clear validation state
      setValidationResult(null);
      setGateSearchQuery('');
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
        text: `Tính phí checkout thành công! Mã vé: ${res.ticketCode}. Phí thanh toán: ${(res.totalFee || 0).toLocaleString()} đ.`,
      });
      refetchActiveSessions();
      refetchAllSessions();

      // Update validation results with latest calculated session data
      setValidationResult({
        id: res.id,
        ticketCode: res.ticketCode,
        licensePlate: res.licensePlate,
        slotId: res.slotId,
        slotCode: res.slotCode,
        status: res.status,
        totalFee: res.totalFee || res.parkingFee || 0,
        entryTime: res.entryTime,
        exitTime: res.exitTime,
        openBarrier: true,
      });

      // Show barrier open popup
      setSessionData(res);
      setOverlayType('checkout');
      setShowSuccessOverlay(true);
    },
    onError: (err: any) => {
      setCheckoutMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Lỗi tính phí khi cho xe ra bãi đỗ.',
      });
    },
  });


  // Bước 1: Tính phí, rồi mở modal chọn phương thức thanh toán
  const handleCheckOutAndExit = async (id: number) => {
    setCheckoutMsg(null);
    setPaymentMsg(null);
    const overtimeVal = parseInt(overtimeMinutes, 10) || 0;
    setExiting(true);
    try {
      const res = await parkingService.staffCheckout(id, { lostTicket, overtimeMinutes: overtimeVal });
      // Store pending checkout info, then show payment method modal
      setPendingCheckoutSessionId(res.id);
      setPendingCheckoutFee(Number(res.totalFee) || 0);
      setPendingCheckoutTicket(res.ticketCode || '');
      setSessionData(res);
      setShowPaymentModal(true);
    } catch (err: any) {
      setCheckoutMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Lỗi khi tính phí xe ra.',
      });
    } finally {
      setExiting(false);
    }
  };

  // Bước 2A: Thanh toán tiền mặt → complete exit ngay
  const handleCashPayment = async () => {
    if (!pendingCheckoutSessionId) return;
    setPaymentProcessing(true);
    setPaymentMsg(null);
    try {
      await parkingService.createCashPayment({ sessionId: pendingCheckoutSessionId, amount: pendingCheckoutFee, returnUrl: undefined, orderInfo: `Cash payment for session #${pendingCheckoutSessionId}` });
      await parkingService.staffCompleteExit(pendingCheckoutSessionId, 'GATE_OUT_01');
      setShowPaymentModal(false);
      setValidationResult(null);
      setGateSearchQuery('');
      setOverlayType('checkout');
      setShowSuccessOverlay(true);
      refetchActiveSessions();
      refetchAllSessions();
      refetchSlots();
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Lỗi thanh toán tiền mặt.' });
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Bước 2B: Hiển thị QR cá nhân để khách quét, nhân viên xác nhận thủ công
  const handleTransferPayment = async () => {
    if (!pendingCheckoutSessionId) return;
    setPaymentProcessing(true);
    setPaymentMsg({ type: 'info', text: 'Đang tạo mã QR thanh toán...' });
    try {
      const res = await parkingService.createPersonalQrPayment({
        sessionId: pendingCheckoutSessionId,
        amount: pendingCheckoutFee,
        returnUrl: undefined,
        orderInfo: `Staff checkout parking session #${pendingCheckoutSessionId}`
      });
      setTransferInfo(res);
      setPaymentMsg({
        type: 'info',
        text: 'Đã tạo QR cá nhân. Cho khách quét mã và xác nhận sau khi nhận được tiền.'
      });
      setPaymentPolling(false);
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Lỗi tạo QR thanh toán.' });
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleConfirmPersonalQrPayment = async () => {
    if (!pendingCheckoutSessionId || !transferInfo?.paymentId) return;
    setPaymentProcessing(true);
    try {
      await parkingService.confirmManualPayment(transferInfo.paymentId, {
        gateway: 'PERSONAL_QR',
        referenceCode: transferInfo.referenceCode,
      });
      await parkingService.staffCompleteExit(pendingCheckoutSessionId, 'GATE_OUT_01');
      setShowPaymentModal(false);
      setTransferInfo(null);
      setValidationResult(null);
      setGateSearchQuery('');
      setOverlayType('checkout');
      setShowSuccessOverlay(true);
      refetchActiveSessions();
      refetchAllSessions();
      refetchSlots();
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Lỗi xác nhận thanh toán QR.' });
    } finally {
      setPaymentProcessing(false);
    }
  };

  // --- ACTIONS & HANDLERS ---

  // Validate search input (License plate / Ticket Code / Session ID / Reservation ID)
  const handleValidateGate = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    setValidationError(null);
    setValidationResult(null);
    setCheckInMsg(null);
    setCheckoutMsg(null);
    setReservationData(null);
    setReservationId(null);

    const term = (customQuery || gateSearchQuery).trim().toUpperCase();
    if (!term) {
      setValidationError('Vui lòng nhập biển số, mã vé hoặc ID lượt đỗ.');
      return;
    }

    setValidationLoading(true);
    try {
      // 1. Fetch newest sessions
      const sessions = await parkingService.staffGetSessions();

      // Match session by ticket code, session id, or license plate
      const matched = sessions
        .filter((s: any) =>
          s.ticketCode?.toUpperCase() === term ||
          s.id?.toString() === term ||
          s.licensePlate?.toUpperCase() === term
        )
        .sort((a: any, b: any) => (b.id || 0) - (a.id || 0))[0];

      if (matched) {
        // Found active/historical parking session
        setValidationResult({
          id: matched.id,
          ticketCode: matched.ticketCode,
          vehicleId: matched.vehicleId,
          licensePlate: matched.licensePlate,
          slotId: matched.slotId,
          slotCode: matched.slotCode,
          status: matched.status,
          totalFee: matched.totalFee || matched.parkingFee || 0,
          entryTime: matched.entryTime,
          exitTime: matched.exitTime,
          openBarrier: matched.status === 'COMPLETED' || matched.status === 'CHECKED_OUT',
        });
        return;
      }

      // 2. No session found — search reservations (match by ID or license plate)
      try {
        const reservationsPage = await parkingService.searchReservations({ status: 'APPROVED', size: 50 });
        const allReservations = reservationsPage?.content || [];
        const matchedRes = allReservations.find((r: any) =>
          r.id?.toString() === term ||
          r.licensePlate?.toUpperCase() === term
        );

        if (matchedRes && matchedRes.status?.toUpperCase() === 'APPROVED') {
          // Found an APPROVED reservation — pre-fill check-in form
          setReservationData(matchedRes);
          setReservationId(matchedRes.id);
          setLicensePlate(matchedRes.licensePlate || '');
          // If reservation has a specific slot, pre-select it
          if (matchedRes.reservedSlotId) {
            setSelectedSlotId(matchedRes.reservedSlotId);
            setSelectedSlotCode(matchedRes.reservedSlotCode || '');
          }
          setValidationError(null);
          return;
        }
      } catch (_) {
        // Ignore reservation search errors silently
      }

      // 3. Nothing found — Guest check-in mode
      setValidationError('Không tìm thấy lượt đỗ tương ứng. Ghi nhận phương tiện chưa vào bãi.');
      setLicensePlate(term); // Prefill plate with searched term
    } catch (err: any) {
      setValidationError('Lỗi xác thực kết nối máy chủ.');
    } finally {
      setValidationLoading(false);
    }
  };

  // Confirm Complete Exit (Hạ Barrier / Open Barrier Gate Out)
  const handleConfirmExit = async (sessionId: number) => {
    setExiting(true);
    try {
      await parkingService.staffCompleteExit(sessionId, 'GATE_OUT_01');
      alert(`Mở barie cổng ra thành công! Lượt đỗ #${sessionId} đã hoàn thành.`);
      setValidationResult(null);
      setGateSearchQuery('');
      refetchActiveSessions();
      refetchAllSessions();
    } catch (err: any) {
      alert('Lỗi khi hạ barie: ' + (err.response?.data?.message || err.message));
    } finally {
      setExiting(false);
    }
  };

  const handleOpenPaymentForPendingSession = (session: any) => {
    setPendingCheckoutSessionId(session.id);
    setPendingCheckoutFee(Number(session.totalFee || 0));
    setPendingCheckoutTicket(session.ticketCode || '');
    setPaymentMsg(null);
    setTransferInfo(null);
    setPaymentPolling(false);
    setShowPaymentModal(true);
  };

  // Handle Manual Check-in Submission
  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInMsg(null);
    if (!licensePlate.trim() || !selectedSlotId) {
      alert('Vui lòng nhập biển số xe và chọn vị trí ô đỗ.');
      return;
    }
    const cleanPlate = licensePlate.toUpperCase().trim();
    if (cleanPlate.length > 20) {
      alert('Lỗi: Biển số xe không được dài quá 20 ký tự. Vui lòng kiểm tra lại mã QR hoặc biển số đã nhập.');
      return;
    }
    checkInMutation.mutate({
      licensePlate: cleanPlate,
      slotId: selectedSlotId,
      ticketCode: ticketCode.trim() || undefined,
      reservationId: reservationId || undefined,
      vehicleId: vehicleId || undefined,
    });
  };

  // Load reservation details and optionally check in immediately from QR.
  const loadReservation = async (resId: number, autoCheckIn = false): Promise<boolean> => {
    try {
      const reservationsPage = await parkingService.searchReservations({ status: 'APPROVED', size: 50 });
      const allReservations = reservationsPage?.content || [];
      const matchedRes = allReservations.find((r: any) => r.id === resId);
      if (matchedRes && matchedRes.status?.toUpperCase() === 'APPROVED') {
        setReservationData(matchedRes);
        setReservationId(matchedRes.id);
        setLicensePlate(matchedRes.licensePlate || '');
        if (matchedRes.reservedSlotId) {
          setSelectedSlotId(matchedRes.reservedSlotId);
          setSelectedSlotCode(matchedRes.reservedSlotCode || '');
        }
        setValidationResult(null);
        setValidationError(null);
        if (autoCheckIn) {
          const slotId = matchedRes.reservedSlotId || (matchedRes as any).slotId;
          if (!slotId) {
            alert('Đặt chỗ này chưa có ô đỗ cố định, không thể tự check-in.');
            return true;
          }
          checkInMutation.mutate({
            licensePlate: matchedRes.licensePlate || '',
            slotId,
            reservationId: matchedRes.id,
            vehicleId: matchedRes.vehicleId,
          });
        }
        return true;
      } else {
        alert(`Không tìm thấy đặt chỗ được phê duyệt có mã: #${resId}`);
        return false;
      }
    } catch (err: any) {
      alert('Lỗi khi tải thông tin đặt chỗ: ' + (err.response?.data?.message || err.message));
      return false;
    }
  };

  // QR code scan handler
  const handleQrScanSuccess = async (decodedText: string) => {
    setIsQrScannerOpen(false);
    const cleaned = decodedText.trim();
    const reservationMatch = cleaned.match(/(?:^|\|)reservationId=(\d+)/i);
    if (reservationMatch) {
      await loadReservation(parseInt(reservationMatch[1], 10), true);
      setGateSearchQuery('');
      return;
    }
    if (qrPurpose === 'search') {
      if (/^\d+$/.test(cleaned)) {
        const loadedReservation = await loadReservation(parseInt(cleaned, 10), true);
        if (loadedReservation) {
          setGateSearchQuery('');
          return;
        }
      }
      setGateSearchQuery(cleaned.toUpperCase());
      handleValidateGate(undefined, cleaned.toUpperCase());
    } else {
      if (cleaned.toUpperCase().startsWith('VEHICLE|')) {
        const parts = cleaned.split('|');
        let parsedPlate = '';
        let parsedVehicleId: number | null = null;
        
        parts.forEach(part => {
          const trimmedPart = part.trim();
          const upperPart = trimmedPart.toUpperCase();
          if (upperPart.startsWith('VEHICLEID=')) {
            parsedVehicleId = parseInt(trimmedPart.substring('vehicleId='.length), 10);
          } else if (upperPart.startsWith('PLATE=')) {
            parsedPlate = trimmedPart.substring('plate='.length).toUpperCase();
          }
        });
        
        if (parsedPlate) {
          setLicensePlate(parsedPlate);
        }
        if (parsedVehicleId) {
          setVehicleId(parsedVehicleId);
        }
      } else if (/^\d+$/.test(cleaned)) {
        const resId = parseInt(cleaned, 10);
        void loadReservation(resId, true);
      } else {
        setLicensePlate(cleaned.toUpperCase());
        setVehicleId(null);
        setReservationId(null);
      }
    }
  };

  const handleSelectSlot = (slot: any) => {
    setSelectedSlotId(slot.slotId || slot.id);
    setSelectedSlotCode(slot.slotCode);
  };

  const getSlotColorClass = (typeName?: string) => {
    const name = typeName?.toUpperCase() || '';
    if (name.includes('Ô TÔ') || name.includes('CAR')) {
      return {
        bg: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70',
        active: 'border-indigo-600 ring-4 ring-indigo-500/20 bg-indigo-100',
        dot: 'bg-indigo-500',
      };
    } else if (name.includes('XE MÁY') || name.includes('MOTO') || name.includes('BIKE')) {
      return {
        bg: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/70',
        active: 'border-purple-600 ring-4 ring-purple-500/20 bg-purple-100',
        dot: 'bg-purple-500',
      };
    } else {
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70',
        active: 'border-emerald-600 ring-4 ring-emerald-500/20 bg-emerald-100',
        dot: 'bg-emerald-500',
      };
    }
  };

  // Filter history data
  const filteredHistory = allSessions.filter((session: any) => {
    const matchesQuery =
      !historySearch ||
      session.licensePlate?.toLowerCase().includes(historySearch.toLowerCase()) ||
      session.ticketCode?.toLowerCase().includes(historySearch.toLowerCase()) ||
      (session.id || session.sessionId)?.toString() === historySearch;

    const matchesStatus =
      !historyStatusFilter ||
      session.status?.toUpperCase() === historyStatusFilter.toUpperCase();

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Page title and navigation tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cổng Kiểm Soát & Barrier</h2>
            <p className="text-slate-400 text-xs mt-0.5">Xác thực biển số/vé xe, điều khiển mở cổng barrier ra/vào và tra cứu lịch sử.</p>
          </div>

          <div className="flex bg-slate-200/75 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('gate')}
              className={`px-4.5 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'gate'
                  ? 'bg-white text-indigo-600 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              Kiểm Soát Barrier
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4.5 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-600 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              Lịch Sử Lượt Đỗ
            </button>
          </div>
        </div>

        {activeTab === 'gate' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left columns: Control & check-in */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Gate validator controller box */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4 animate-in fade-in duration-200">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    <h3 className="text-base font-extrabold text-slate-800">Bộ Kiểm Soát Barrier Cổng Ra/Vào</h3>
                  </div>
                  <button
                    onClick={() => {
                      setQrPurpose('search');
                      setIsQrScannerOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg text-[10px] border border-indigo-100 transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 20h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Quét mã QR</span>
                  </button>
                </div>

                <form onSubmit={handleValidateGate} className="flex gap-2">
                  <input
                    type="text"
                    value={gateSearchQuery}
                    onChange={(e) => setGateSearchQuery(e.target.value)}
                    placeholder="Nhập Biển Số Xe hoặc Mã Vé xe để đối chiếu..."
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs uppercase font-extrabold tracking-wider text-center focus:outline-none text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={validationLoading}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {validationLoading ? 'Đang kiểm tra...' : 'Xác thực'}
                  </button>
                </form>

                {validationError && !reservationData && (
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                    {validationError}
                  </div>
                )}

                {/* Reservation Found Card — pre-loaded check-in */}
                {reservationData && !validationResult && (
                  <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
                        <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Tìm thấy đặt chỗ trước</p>
                      </div>
                      <span className="px-2 py-0.5 bg-violet-100 border border-violet-200 text-violet-700 text-[9px] font-black rounded-full uppercase tracking-wide">ĐÃ DUYỆT</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-slate-700 border-t border-violet-200/60 pt-3">
                      <div>Biển số: <strong className="font-mono text-slate-900 uppercase">{reservationData.licensePlate}</strong></div>
                      <div>Mã đặt chỗ: <strong className="font-mono text-violet-800">#{reservationData.id}</strong></div>
                      <div>Khu vực: <strong className="text-slate-800">{reservationData.zoneName || `#${reservationData.zoneId}`}</strong></div>
                      {reservationData.reservedSlotCode && (
                        <div>Ô đỗ đặt trước: <strong className="text-indigo-700">{reservationData.reservedSlotCode}</strong></div>
                      )}
                      <div className="col-span-2 text-slate-500 font-normal text-[10px]">
                        Thời gian đặt: {reservationData.startTime ? new Date(reservationData.startTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        {' → '}
                        {reservationData.endTime ? new Date(reservationData.endTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </div>
                    </div>

                    {checkInMsg && (
                      <div className={`p-2.5 rounded-lg text-xs font-semibold ${checkInMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {checkInMsg.text}
                      </div>
                    )}

                    <p className="text-[10px] text-violet-600 font-semibold">
                      {selectedSlotId
                        ? `✓ Ô đỗ đã chọn: ${selectedSlotCode || `#${selectedSlotId}`}. Nhấn Check-in để xác nhận.`
                        : 'Vui lòng chọn ô đỗ bên dưới rồi nhấn Check-in.'}
                    </p>

                    <button
                      type="button"
                      onClick={(e) => {
                        if (!selectedSlotId) {
                          alert('Vui lòng chọn ô đỗ bên dưới trước khi check-in.');
                          return;
                        }
                        handleCheckInSubmit(e as any);
                      }}
                      disabled={checkInMutation.isPending || !selectedSlotId}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                      </svg>
                      <span>{checkInMutation.isPending ? 'Đang Check-in...' : 'Check-in & Mở barrier vào bãi'}</span>
                    </button>
                  </div>
                )}

                {/* Validation Result Details Card */}
                {validationResult && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Kết quả xác thực</p>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1 uppercase font-mono">{validationResult.licensePlate || 'N/A'}</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        validationResult.status === 'ACTIVE'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : validationResult.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-805 border-indigo-200'
                      }`}>
                        {validationResult.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-slate-600 border-t border-b border-slate-200/60 py-3.5">
                      <div>Mã vé đỗ: <strong className="text-slate-800 font-mono">{validationResult.ticketCode}</strong></div>
                      <div>Vị trí đỗ: <strong className="text-indigo-650">{validationResult.slotCode || `Slot #${validationResult.slotId}`}</strong></div>
                      <div className="col-span-2 mt-1">Giờ vào: <span className="text-slate-500 font-normal">{validationResult.entryTime ? new Date(validationResult.entryTime).toLocaleString('vi-VN') : '—'}</span></div>
                      {validationResult.exitTime && (
                        <div className="col-span-2">Giờ ra: <span className="text-slate-500 font-normal">{new Date(validationResult.exitTime).toLocaleString('vi-VN')}</span></div>
                      )}
                      {validationResult.totalFee > 0 && (
                        <div className="col-span-2 mt-1.5 flex justify-between items-center text-sm font-bold bg-indigo-50 p-2 rounded-lg text-indigo-800 border border-indigo-100">
                          <span>Phí thanh toán tính đến hiện tại:</span>
                          <span>{(validationResult.totalFee).toLocaleString()} đ</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Gate Action Buttons based on status */}
                    <div className="flex gap-2">
                      {validationResult.status === 'ACTIVE' ? (
                        <div className="w-full space-y-3.5">
                          {/* Checkout options */}
                          <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-2 text-xs font-bold">
                            <div className="flex items-center">
                              <input 
                                type="checkbox"
                                id="gateLostTicketCheck"
                                checked={lostTicket}
                                onChange={(e) => setLostTicket(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <label htmlFor="gateLostTicketCheck" className="ml-2 text-slate-600 cursor-pointer select-none">Báo mất vé / thẻ xe</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide">Thời gian quá hạn:</span>
                              <input 
                                type="number"
                                value={overtimeMinutes}
                                min="0"
                                onChange={(e) => setOvertimeMinutes(e.target.value)}
                                className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-center focus:outline-none focus:border-indigo-550 font-bold"
                              />
                              <span className="text-[10px] text-slate-450 font-normal">phút</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCheckOutAndExit(validationResult.id)}
                            disabled={exiting || checkOutMutation.isPending}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
                          >
                            <span>{exiting ? 'Đang xử lý...' : 'Tính phí & Mở barrier cho xe ra'}</span>
                          </button>
                        </div>
                      ) : validationResult.status === 'PAYMENT_PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentForPendingSession(validationResult)}
                          disabled={exiting}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/15"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Thanh toán QR & mở barrier</span>
                        </button>
                      ) : (validationResult.status === 'CHECKED_OUT' || validationResult.status === 'COMPLETED') ? (
                        <button
                          type="button"
                          onClick={() => handleConfirmExit(validationResult.id)}
                          disabled={exiting}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-705 text-white rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/15"
                        >
                          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                          </svg>
                          <span>{exiting ? 'Đang mở barrier...' : 'Xác nhận mở Barie cổng ra'}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* Check-in available slots map & pre-fill form */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
                <div className="pb-3 border-b border-slate-100 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-650"></span>
                  <h3 className="text-base font-extrabold text-slate-800">Cho xe vào (Check-in thủ công)</h3>
                </div>

                {checkInMsg && (
                  <div className={`p-3.5 rounded-xl border text-xs font-semibold ${
                    checkInMsg.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-850' 
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {checkInMsg.text}
                  </div>
                )}

                <form onSubmit={handleCheckInSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Biển số xe vào</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={licensePlate}
                          onChange={(e) => {
                            setLicensePlate(e.target.value);
                            setVehicleId(null);
                          }}
                          placeholder="Nhập biển số..."
                          className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs uppercase font-extrabold tracking-wider focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setQrPurpose('checkin');
                            setIsQrScannerOpen(true);
                          }}
                          className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 20h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">Cổng barrier vào</label>
                      <select
                        value={entryGateCode}
                        onChange={(e) => setEntryGateCode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="GATE_IN_01">GATE_IN_01 (Cổng 1)</option>
                        <option value="GATE_IN_02">GATE_IN_02 (Cổng 2)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">Vị trí ô đỗ xe đã chọn</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedSlotCode ? `${selectedSlotCode} (Mã: #${selectedSlotId})` : ''}
                        placeholder="Vui lòng chọn ô đỗ trên sơ đồ..."
                        className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">Mã thẻ vé (Tự chọn)</label>
                      <input
                        type="text"
                        value={ticketCode}
                        onChange={(e) => setTicketCode(e.target.value)}
                        placeholder="Tự động tạo nếu bỏ trống"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Available slots selection grid */}
                  <div className="border-t border-slate-100 pt-4.5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Sơ đồ vị trí đỗ trống (Purpose: PARKING)</span>
                      <button
                        type="button"
                        onClick={() => refetchSlots()}
                        className="text-[9px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold rounded border border-slate-200 transition cursor-pointer"
                      >
                        Làm mới sơ đồ
                      </button>
                    </div>

                    {isSlotsLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center">
                        <span className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                        <p className="text-[10px] text-slate-450 mt-2 font-bold animate-pulse">Đang tải danh sách ô đỗ...</p>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="py-12 text-center text-xs font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        Không còn vị trí đỗ xe nào trống.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 text-[9px] font-bold text-slate-400 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-indigo-500 rounded-sm"></span>
                            <span>Ô tô con</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-purple-500 rounded-sm"></span>
                            <span>Xe máy</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-sm"></span>
                            <span>Khác</span>
                          </span>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                          {availableSlots.map((slot) => {
                            const isSelected = selectedSlotId === slot.id;
                            const colorStyle = getSlotColorClass(slot.vehicleTypeName);

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => handleSelectSlot(slot)}
                                className={`p-2 rounded-xl border flex flex-col justify-center items-center h-16 transition cursor-pointer text-center ${
                                  isSelected ? colorStyle.active : colorStyle.bg
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full mb-0.5 shrink-0 ${colorStyle.dot}`}></span>
                                <span className="font-mono font-black text-xs block leading-none">{slot.slotCode}</span>
                                <span className="text-[7px] font-bold block opacity-60 truncate mt-0.5 uppercase max-w-full">
                                  {slot.vehicleTypeName || 'CAR'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={checkInMutation.isPending}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {checkInMutation.isPending ? 'Đang gửi...' : 'Xác nhận cho xe vào (Check-in)'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right column: Active Sessions */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4 animate-in fade-in duration-200">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h3 className="text-base font-extrabold text-slate-800">Xe đang đỗ trong bãi</h3>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 bg-slate-100 text-slate-650 rounded-full font-bold">
                    {activeSessions.length} xe
                  </span>
                </div>

                {checkoutMsg && (
                  <div className={`p-3.5 rounded-xl border text-xs font-semibold ${
                    checkoutMsg.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-805' 
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {checkoutMsg.text}
                  </div>
                )}

                <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                  {activeSessions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-bold">
                      Không có xe nào đang hoạt động.
                    </div>
                  ) : (
                    activeSessions.map((session: any) => (
                      <div 
                        key={session.id || session.sessionId} 
                        onClick={() => {
                          const code = session.licensePlate || session.ticketCode || '';
                          setGateSearchQuery(code);
                          handleValidateGate(undefined, code);
                        }}
                        className="bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-150 p-3 rounded-xl transition cursor-pointer flex justify-between items-center group"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wide font-mono group-hover:text-indigo-700 transition">
                            {session.licensePlate || `Xe ID #${session.vehicleId}`}
                          </p>
                          <p className="text-[10px] text-slate-450 font-semibold">
                            Vị trí: <strong className="text-slate-700 font-bold">{session.slotCode || `Slot #${session.slotId}`}</strong>
                          </p>
                          <p className="text-[9px] text-slate-400">
                            Vào lúc: {session.entryTime ? new Date(session.entryTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <span className="px-2 py-0.75 bg-white text-slate-500 font-bold rounded border border-slate-200 text-[8px] group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition">
                            Chọn
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Tab 2: System Parking Logs (All Sessions History) */
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="pb-3 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                <h3 className="text-base font-extrabold text-slate-800">Lịch sử lượt đỗ xe (Hệ thống)</h3>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Lọc Biển số, Vé hoặc ID..."
                  className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs focus:outline-none uppercase font-bold"
                />

                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">-- Trạng thái (Tất cả) --</option>
                  <option value="ACTIVE">Đang đỗ (ACTIVE)</option>
                  <option value="COMPLETED">Rời bãi (COMPLETED)</option>
                  <option value="PAYMENT_PENDING">Chờ thanh toán (PAYMENT_PENDING)</option>
                  <option value="CHECKED_OUT">Đã tính phí (CHECKED_OUT)</option>
                </select>

                <button
                  onClick={() => refetchAllSessions()}
                  className="text-xs px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-bold cursor-pointer transition"
                >
                  Làm mới
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold">
                  Không tìm thấy lịch sử lượt đỗ nào khớp với bộ lọc.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Mã lượt đỗ</th>
                      <th className="pb-3 font-semibold">Biển số xe</th>
                      <th className="pb-3 font-semibold">Vị trí đỗ</th>
                      <th className="pb-3 font-semibold">Mã vé</th>
                      <th className="pb-3 font-semibold">Thời gian vào</th>
                      <th className="pb-3 font-semibold">Thời gian ra</th>
                      <th className="pb-3 font-semibold">Phí đỗ</th>
                      <th className="pb-3 font-semibold text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredHistory.map((session: any) => (
                      <tr key={session.id || session.sessionId} className="hover:bg-slate-50/50">
                        <td className="py-3.5 font-mono text-slate-500 font-bold">#{session.id || session.sessionId}</td>
                        <td className="py-3.5 text-slate-800 font-extrabold uppercase font-mono tracking-wide">{session.licensePlate || `Xe #${session.vehicleId}`}</td>
                        <td className="py-3.5 text-indigo-650 font-bold">{session.slotCode || `Slot #${session.slotId}`}</td>
                        <td className="py-3.5 text-slate-600 font-mono">{session.ticketCode || '—'}</td>
                        <td className="py-3.5 text-slate-455 font-medium">
                          {session.entryTime ? new Date(session.entryTime).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-3.5 text-slate-455 font-medium">
                          {session.exitTime ? new Date(session.exitTime).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-3.5 text-indigo-700 font-bold">
                          {session.totalFee > 0 ? `${(session.totalFee).toLocaleString()} đ` : '—'}
                        </td>
                        <td className="py-3.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${
                            session.status?.toUpperCase() === 'ACTIVE'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : session.status?.toUpperCase() === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-indigo-50 text-indigo-805 border-indigo-200'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </main>

      {/* PAYMENT METHOD SELECTION MODAL */}
      {showPaymentModal && pendingCheckoutSessionId && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Hệ thống SmartParking</p>
              <h3 className="text-lg font-black mt-0.5">Chọn phương thức thanh toán</h3>
              <div className="flex items-center gap-3 mt-3">
                <div className="bg-white/15 rounded-xl px-3 py-1.5 text-xs font-bold">
                  Mã vé: <span className="font-mono">{pendingCheckoutTicket}</span>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-1.5 text-xs font-bold">
                  Phí: <span className="font-mono text-emerald-300">{pendingCheckoutFee.toLocaleString()} đ</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Status message */}
              {paymentMsg && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                  paymentMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : paymentMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}>
                  {paymentMsg.type === 'info' && paymentPolling && (
                    <span className="w-3.5 h-3.5 shrink-0 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mt-0.5"></span>
                  )}
                  <span>{paymentMsg.text}</span>
                </div>
              )}

              {/* Personal QR Payment Info */}
              {transferInfo && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-center">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 flex justify-center">
                    <img
                      src={transferInfo.qrImageUrl}
                      alt="QR thanh toán"
                      className="w-52 h-52 object-contain"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-bold">Nội dung chuyển khoản:</p>
                    <p className="font-mono text-slate-800 text-sm font-extrabold break-all">
                      {transferInfo.transferContent || transferInfo.referenceCode}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleConfirmPersonalQrPayment}
                      disabled={paymentProcessing}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-100 cursor-pointer disabled:opacity-60"
                    >
                      {paymentProcessing ? 'Đang xác nhận...' : 'Đã nhận tiền - Mở barrier'}
                    </button>
                    <p className="text-[9px] text-slate-400 leading-normal font-medium px-4">
                      Cho khách quét QR, kiểm tra giao dịch về tài khoản rồi bấm xác nhận để hoàn tất lượt ra.
                    </p>
                  </div>

                  {paymentPolling && (
                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-semibold animate-pulse">
                      <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang chờ khách hàng quét QR...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method Buttons */}
              {!transferInfo && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Cash */}
                  <button
                    type="button"
                    onClick={handleCashPayment}
                    disabled={paymentProcessing}
                    className="flex flex-col items-center justify-center gap-2.5 p-5 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl transition cursor-pointer group disabled:opacity-50"
                  >
                    <div className="w-12 h-12 bg-emerald-100 group-hover:bg-emerald-200 rounded-xl flex items-center justify-center transition">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-extrabold text-emerald-800">Tiền mặt</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Thanh toán ngay,<br/>mở barrier lập tức</p>
                    </div>
                  </button>

                  {/* Personal QR Payment Button */}
                  <button
                    type="button"
                    onClick={handleTransferPayment}
                    disabled={paymentProcessing}
                    className="flex flex-col items-center justify-center gap-2.5 p-5 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 rounded-2xl transition cursor-pointer group disabled:opacity-50"
                  >
                    <div className="w-12 h-12 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center transition">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-extrabold text-indigo-800">QR chuyển khoản</p>
                      <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Khách quét QR,<br/>nhân viên xác nhận</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Cancel button */}
              {!paymentPolling && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setTransferInfo(null);
                    setPaymentMsg(null);
                    setPaymentPolling(false);
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Huỷ / Quay lại
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
                      <span>{entryGateCode}</span>
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
                      setValidationResult(null);
                      setGateSearchQuery('');
                      refetchActiveSessions();
                      refetchAllSessions();
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

              {/* Visual gate bar lifting representation */}
              <div className="w-full flex flex-col items-center justify-center py-10 relative">
                {/* Stand */}
                <div className="w-7 h-20 bg-slate-700 rounded-lg relative z-10 flex items-center justify-center border-t border-slate-650 shadow-inner">
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                  </div>
                </div>
                {/* Horizontal gate bar - Lifted up */}
                <div className="w-2.5 h-26 bg-gradient-to-t from-orange-500 via-white to-orange-500 absolute bottom-18 origin-bottom rotate-90 translate-x-12 translate-y-3.5 rounded-full border border-orange-600 shadow-md animate-in duration-300"></div>
                {/* Ground */}
                <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-1"></div>
              </div>

              <div className="text-[10px] text-slate-500 font-semibold leading-relaxed max-w-[240px]">
                Hệ thống tự động phát hiện xe qua cảm biến để hạ cần barie. Staff có thể ấn nút xác nhận để đóng thủ công.
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
