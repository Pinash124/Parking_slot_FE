import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { parkingService } from '../services/parkingService';
import { authService } from '../services/authService';

export default function ParkingSessions() {
  const currentUser = authService.getCurrentUser();

  // Check-in Form State
  const [vehicleId, setVehicleId] = useState('1');
  const [slotId, setSlotId] = useState('1');
  const [ticketCode, setTicketCode] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [checkInMsg, setCheckInMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Checkout Form State
  const [licensePlate, setLicensePlate] = useState('29A-99999');
  const [lostTicket, setLostTicket] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState('0');
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const [checkoutMsg, setCheckoutMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Payment Form State
  const [paymentGateway, setPaymentGateway] = useState<'cash' | 'momo' | 'vnpay'>('cash');
  const [pendingGatewayResponse, setPendingGatewayResponse] = useState<any | null>(null);
  const [paymentMsg, setPaymentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Check-in Mutation
  const checkInMutation = useMutation({
    mutationFn: parkingService.checkIn,
    onSuccess: (res) => {
      setCheckInMsg({
        type: 'success',
        text: `Checked in successfully! Slot ${res.slotNumber} (ID: ${res.slotId}) is now OCCUPIED. Ticket: ${res.ticketCode}`,
      });
      // reset form
      setTicketCode('');
      setReservationId('');
    },
    onError: (err: any) => {
      setCheckInMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Check-in failed.',
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
      reservationId: reservationId ? parseInt(reservationId, 10) : null,
      entryTime: new Date().toISOString(),
    });
  };

  // 2. Prepare Checkout Mutation
  const checkoutPrepareMutation = useMutation({
    mutationFn: parkingService.prepareCheckout,
    onSuccess: (res) => {
      setCheckoutResult(res);
      setCheckoutMsg({
        type: 'success',
        text: `Pricing calculated for ${res.licensePlate}. Total fee: ${res.totalFee.toLocaleString()} VND.`,
      });
      setPendingGatewayResponse(null);
      setPaymentMsg(null);
    },
    onError: (err: any) => {
      setCheckoutMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to prepare checkout.',
      });
    },
  });

  const handleCheckoutPrepare = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutMsg(null);
    setCheckoutResult(null);
    setPendingGatewayResponse(null);
    checkoutPrepareMutation.mutate({
      licensePlate,
      exitTime: new Date().toISOString(),
      lostTicket,
      overtimeMinutes: overtimeMinutes ? parseInt(overtimeMinutes, 10) : 0,
    });
  };

  // 3. Initiate Gateway Payment Mutation
  const initiatePaymentMutation = useMutation({
    mutationFn: async ({ gateway, payload }: { gateway: 'cash' | 'momo' | 'vnpay'; payload: any }) => {
      if (gateway === 'cash') return parkingService.payCash(payload);
      if (gateway === 'momo') return parkingService.payMomo(payload);
      return parkingService.payVnpay(payload);
    },
    onSuccess: (res) => {
      setPendingGatewayResponse(res);
      setPaymentMsg({
        type: 'success',
        text: `Payment reference created! Status: ${res.status}. Method: ${paymentGateway.toUpperCase()}`,
      });
    },
    onError: (err: any) => {
      setPaymentMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Payment initiation failed.',
      });
    },
  });

  const handlePay = () => {
    if (!checkoutResult) return;
    setPaymentMsg(null);
    initiatePaymentMutation.mutate({
      gateway: paymentGateway,
      payload: {
        sessionId: checkoutResult.sessionId,
        amount: checkoutResult.totalFee,
        returnUrl: window.location.href,
        orderInfo: `Parking payment for ${checkoutResult.licensePlate}`,
      },
    });
  };

  // 4. Confirm Payment Callback Mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: ({ gateway, ref }: { gateway: 'cash' | 'momo' | 'vnpay'; ref: string }) => {
      return parkingService.confirmPayment(gateway, {
        referenceCode: ref,
        status: 'SUCCESS',
        transactionNo: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        message: 'Mock callback payment success',
      });
    },
    onSuccess: () => {
      setPaymentMsg({
        type: 'success',
        text: 'Payment status updated to COMPLETED! Vehicle exit deadline has been generated.',
      });
      // Update checkoutResult paid status locally
      if (checkoutResult) {
        setCheckoutResult({
          ...checkoutResult,
          paid: true,
          paymentStatus: 'COMPLETED',
          exitDeadline: new Date(Date.now() + 15 * 60000).toISOString(), // 15 mins exit window
        });
      }
      setPendingGatewayResponse(null);
    },
    onError: (err: any) => {
      setPaymentMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Payment confirmation failed.',
      });
    },
  });

  const handleConfirmCallback = () => {
    if (!pendingGatewayResponse) return;
    setPaymentMsg(null);
    confirmPaymentMutation.mutate({
      gateway: paymentGateway,
      ref: pendingGatewayResponse.referenceCode,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header layout */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Building Parking
              </h1>
              <p className="text-xs text-slate-400">Smart Parking Management System</p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6 text-sm font-medium">
            <Link to="/" className="text-slate-400 hover:text-slate-200 transition">Dashboard</Link>
            <Link to="/sessions" className="text-indigo-400 border-b-2 border-indigo-500 pb-1">Sessions & Cashier</Link>
            <Link to="/gate" className="text-slate-400 hover:text-slate-200 transition">Gate Barrier</Link>
            <Link to="/reservations" className="text-slate-400 hover:text-slate-200 transition">Reservations</Link>
            <Link to="/transactions" className="text-slate-400 hover:text-slate-200 transition">Transactions</Link>
          </nav>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-mono">Role: {currentUser?.role || 'Guard'}</p>
            <p className="text-sm font-semibold text-slate-300">{currentUser?.fullName || 'User'}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Active Sessions & Cashier Desk</h2>
          <p className="text-slate-400 mt-1">Check vehicles in, calculate checkout fees, and receive payments.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Section 1: Entry Check-in Form */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-400">
                &darr;
              </div>
              <h3 className="text-xl font-bold text-white">Vehicle Entry Check-in</h3>
            </div>

            {checkInMsg && (
              <div className={`p-4 rounded-xl border text-sm ${
                checkInMsg.type === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                {checkInMsg.text}
              </div>
            )}

            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle ID</label>
                  <input 
                    type="number"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Slot ID</label>
                  <input 
                    type="number"
                    value={slotId}
                    onChange={(e) => setSlotId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ticket Code (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reservation ID (Optional)</label>
                  <input 
                    type="number"
                    placeholder="Link to user booking"
                    value={reservationId}
                    onChange={(e) => setReservationId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={checkInMutation.isPending}
                className="w-full py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition duration-200"
              >
                {checkInMutation.isPending ? 'Processing check-in...' : 'Check In Vehicle'}
              </button>
            </form>
          </div>

          {/* Section 2: Exit Checkout & Cashier Payment */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-400">
                &uarr;
              </div>
              <h3 className="text-xl font-bold text-white">Vehicle Exit Checkout</h3>
            </div>

            {checkoutMsg && !checkoutResult && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm">
                {checkoutMsg.text}
              </div>
            )}

            {/* Step 1: Calculate Pricing */}
            <form onSubmit={handleCheckoutPrepare} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">License Plate</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. 29A-99999"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none font-semibold uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 bg-slate-950/50 border border-slate-900 px-4 py-2 rounded-xl">
                  <input 
                    type="checkbox"
                    id="lost-ticket"
                    checked={lostTicket}
                    onChange={(e) => setLostTicket(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-850 rounded"
                  />
                  <label htmlFor="lost-ticket" className="text-xs font-medium text-slate-350 select-none">
                    Lost Ticket penalty fee
                  </label>
                </div>
                <div>
                  <input 
                    type="number"
                    placeholder="Overtime minutes"
                    value={overtimeMinutes}
                    onChange={(e) => setOvertimeMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={checkoutPrepareMutation.isPending}
                className="w-full py-3 px-4 border border-indigo-500/30 text-sm font-semibold rounded-xl text-indigo-400 bg-indigo-600/10 hover:bg-indigo-600/20 disabled:opacity-50 transition duration-200"
              >
                {checkoutPrepareMutation.isPending ? 'Calculating quote...' : 'Calculate Pricing Quote'}
              </button>
            </form>

            {/* Step 2: Checkout Details Card */}
            {checkoutResult && (
              <div className="bg-slate-950/80 border border-slate-900 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Session ID: {checkoutResult.sessionId}</span>
                    <h4 className="text-xl font-bold text-white tracking-tight">{checkoutResult.licensePlate}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    checkoutResult.paid 
                      ? 'bg-emerald-500/15 text-emerald-400' 
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {checkoutResult.paid ? 'PAID' : 'UNPAID'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Entry Time</span>
                    <span className="text-slate-350">{new Date(checkoutResult.entryTime).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Exit Time</span>
                    <span className="text-slate-350">{new Date(checkoutResult.exitTime).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Parking Hourly Fee</span>
                    <span className="text-slate-300 font-semibold">{checkoutResult.parkingFee.toLocaleString()} VND</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Penalty / Overtime Fee</span>
                    <span className="text-slate-300 font-semibold">{checkoutResult.penaltyFee.toLocaleString()} VND</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-900 pt-3 flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Total Bill:</span>
                    <span className="text-emerald-400 font-extrabold text-lg">{checkoutResult.totalFee.toLocaleString()} VND</span>
                  </div>
                </div>

                {/* Paid Details */}
                {checkoutResult.paid ? (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-300 space-y-1">
                    <p className="font-semibold">✓ Invoice Settled Successfully</p>
                    {checkoutResult.exitDeadline && (
                      <p className="text-slate-400 text-[10px]">
                        Exit window deadline: <strong className="text-slate-300">{new Date(checkoutResult.exitDeadline).toLocaleTimeString()}</strong> (15 minutes).
                      </p>
                    )}
                  </div>
                ) : (
                  /* Payment Gateway selectors */
                  <div className="border-t border-slate-900 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Payment Gateway:</span>
                      <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button 
                          onClick={() => { setPaymentGateway('cash'); setPendingGatewayResponse(null); }}
                          className={`px-3 py-1 text-xs rounded-md font-semibold transition ${paymentGateway === 'cash' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                        >
                          CASH
                        </button>
                        <button 
                          onClick={() => { setPaymentGateway('momo'); setPendingGatewayResponse(null); }}
                          className={`px-3 py-1 text-xs rounded-md font-semibold transition ${paymentGateway === 'momo' ? 'bg-pink-600 text-white' : 'text-slate-400'}`}
                        >
                          MOMO
                        </button>
                        <button 
                          onClick={() => { setPaymentGateway('vnpay'); setPendingGatewayResponse(null); }}
                          className={`px-3 py-1 text-xs rounded-md font-semibold transition ${paymentGateway === 'vnpay' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                        >
                          VNPAY
                        </button>
                      </div>
                    </div>

                    {paymentMsg && (
                      <div className={`p-3 rounded-xl border text-xs ${
                        paymentMsg.type === 'success' ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                      }`}>
                        {paymentMsg.text}
                      </div>
                    )}

                    {!pendingGatewayResponse ? (
                      <button 
                        onClick={handlePay}
                        disabled={initiatePaymentMutation.isPending}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition"
                      >
                        {initiatePaymentMutation.isPending ? 'Generating Payment Invoice...' : 'Generate Invoice & pay'}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center space-y-2">
                          <p className="text-slate-400 text-xs font-semibold">Mock Payment Sandbox Link</p>
                          <a 
                            href={pendingGatewayResponse.paymentUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-block text-xs font-mono bg-slate-950 px-3 py-1 rounded text-indigo-400 underline max-w-full truncate"
                          >
                            {pendingGatewayResponse.paymentUrl}
                          </a>
                          {pendingGatewayResponse.qrContent && (
                            <p className="text-[10px] text-slate-500 font-mono italic">QR Data: {pendingGatewayResponse.qrContent}</p>
                          )}
                        </div>
                        
                        <button 
                          onClick={handleConfirmCallback}
                          disabled={confirmPaymentMutation.isPending}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
                        >
                          {confirmPaymentMutation.isPending ? 'Processing Mock Callback...' : 'Simulate Success Callback API'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
