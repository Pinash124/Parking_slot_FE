import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { parkingService } from '../services/parkingService';
import { authService } from '../services/authService';

export default function GateValidator() {
  const currentUser = authService.getCurrentUser();
  const [licensePlate, setLicensePlate] = useState('29A-99999');
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Exit Validation Mutation
  const validateMutation = useMutation({
    mutationFn: parkingService.validateExit,
    onSuccess: (res) => {
      setValidationResult(res);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setValidationResult(null);
      setErrorMsg(
        err.response?.data?.message || 
        err.message || 
        'Validation failed. Vehicle plate might not be in the parking system.'
      );
    },
  });

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationResult(null);
    setErrorMsg(null);
    validateMutation.mutate({
      licensePlate,
      detectedAt: new Date().toISOString(),
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
            <Link to="/sessions" className="text-slate-400 hover:text-slate-200 transition">Sessions & Cashier</Link>
            <Link to="/gate" className="text-indigo-400 border-b-2 border-indigo-500 pb-1">Gate Barrier</Link>
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
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Gate Exit Barrier Simulator</h2>
          <p className="text-slate-400 mt-1">Simulate license plate scanning at the exit gate to grant barrier release.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Scanner Input Form */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white pb-3 border-b border-slate-800 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
              <span>License Plate Scanner</span>
            </h3>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleValidate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Scan Plate Number
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. 29A-99999"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none font-bold text-lg text-center uppercase tracking-widest placeholder-slate-700"
                />
              </div>

              <button 
                type="submit"
                disabled={validateMutation.isPending}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-indigo-600/25"
              >
                {validateMutation.isPending ? 'Validating ticket...' : 'Scan & Validate Exit'}
              </button>
            </form>

            <div className="bg-slate-950/50 border border-slate-900 p-4 rounded-xl text-xs text-slate-500 leading-relaxed">
              <p className="font-semibold text-slate-400 mb-1">Gate Rule Information:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>System verifies ticket status of the vehicle.</li>
                <li>Ticket status must be PAID.</li>
                <li>Vehicle must leave within 15 minutes of payment checkout.</li>
              </ul>
            </div>
          </div>

          {/* Column 2 & 3: Visual Gate Barrier & Log Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual Gate Element */}
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden h-72">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>
              
              {/* Gate Column */}
              <div className="w-16 h-40 bg-slate-800 border-2 border-slate-750 rounded-lg relative flex flex-col justify-end items-center pb-4 shadow-2xl z-20">
                {/* Status LED Lamp */}
                <div className={`w-6 h-6 rounded-full border-2 ${
                  validationResult?.openBarrier 
                    ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/50' 
                    : 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/50'
                } mb-12 transition-all duration-300`}></div>
                <div className="w-2.5 h-16 bg-slate-950 rounded border border-slate-900"></div>
              </div>

              {/* Gate Arm (Rotates) */}
              <div 
                className={`absolute w-72 h-4 border-2 rounded shadow-lg transition-all duration-1000 origin-left z-10 ${
                  validationResult?.openBarrier 
                    ? 'bg-emerald-500 border-emerald-400 -rotate-90 translate-x-20 -translate-y-8 shadow-emerald-500/20' 
                    : 'bg-rose-600 border-rose-500 translate-x-32 translate-y-1 shadow-rose-600/20'
                }`}
                style={{
                  left: 'calc(50% - 100px)',
                  top: 'calc(50% + 20px)'
                }}
              >
                {/* Red/White Stripes on the Barrier Arm */}
                <div className="w-full h-full flex justify-between px-2 overflow-hidden">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-6 h-full bg-white/20 transform skew-x-12"></div>
                  ))}
                </div>
              </div>

              {/* Barrier Text State */}
              <p className="text-xl font-extrabold tracking-widest mt-6 z-20">
                BARRIER:{' '}
                <span className={validationResult?.openBarrier ? 'text-emerald-400' : 'text-rose-500'}>
                  {validationResult?.openBarrier ? 'LIFTED (OPEN)' : 'LOCKED (CLOSED)'}
                </span>
              </p>
            </div>

            {/* Validation Result Detail */}
            {validationResult && (
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white pb-3 border-b border-slate-800">
                  Validation Log Detail
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-950/60 p-3.5 border border-slate-900 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Decision Code</span>
                    <span className={`font-mono text-sm font-bold ${
                      validationResult.openBarrier ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {validationResult.decision}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 border border-slate-900 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">License Plate</span>
                    <span className="font-bold text-slate-200 text-sm">{validationResult.licensePlate}</span>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 border border-slate-900 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Paid Status</span>
                    <span className="font-semibold text-slate-350">{validationResult.paymentStatus || 'UNPAID'}</span>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 border border-slate-900 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Exit Deadline</span>
                    <span className="font-semibold text-slate-350">
                      {validationResult.exitDeadline ? new Date(validationResult.exitDeadline).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {validationResult.openBarrier ? (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 text-xs">
                    <p className="font-bold">✓ EXIT AUTHORIZED</p>
                    <p className="text-slate-400 mt-1">
                      Payment verified at {new Date(validationResult.paidAt).toLocaleTimeString()}. Driver has{' '}
                      <strong className="text-emerald-400 font-mono">{validationResult.remainingSeconds} seconds</strong> remaining to exit gate.
                    </p>
                  </div>
                ) : (
                  <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-xl text-rose-300 text-xs">
                    <p className="font-bold">✗ EXIT DENIED</p>
                    <p className="text-slate-400 mt-1">
                      Reason: {validationResult.decision === 'DENY_PAYMENT_REQUIRED' 
                        ? 'Vehicle has not settled the checkout invoice. Direct the driver to the cashier desk.' 
                        : 'Vehicle exceeded the 15-minute exit deadline window. Require recalculation and overtime fee payment.'}
                    </p>
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
