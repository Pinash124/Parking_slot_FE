import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { parkingService } from '../services/parkingService';
import { authService } from '../services/authService';

export default function Reservations() {
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();

  // Filters State
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);

  // Create Form State
  const [userId, setUserId] = useState(currentUser?.userId?.toString() || '1');
  const [vehicleId, setVehicleId] = useState('1');
  const [zoneId, setZoneId] = useState('1');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16));

  const [bookingMsg, setBookingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries
  const { data: pageResult, isLoading, error, refetch } = useQuery({
    queryKey: ['reservationsList', filterUserId, filterStatus, page],
    queryFn: () => parkingService.searchReservations({
      userId: filterUserId ? parseInt(filterUserId, 10) : undefined,
      status: filterStatus || undefined,
      page,
      size: 10,
    }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: parkingService.createReservation,
    onSuccess: (res) => {
      setBookingMsg({
        type: 'success',
        text: `Reservation created successfully! Code: ${res.reservationCode}`,
      });
      queryClient.invalidateQueries({ queryKey: ['reservationsList'] });
    },
    onError: (err: any) => {
      setBookingMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to create reservation.',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: parkingService.approveReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservationsList'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: parkingService.cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservationsList'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingMsg(null);
    createMutation.mutate({
      userId: parseInt(userId, 10),
      vehicleId: parseInt(vehicleId, 10),
      zoneId: parseInt(zoneId, 10),
      // Convert HTML datetime-local format to ISO LocalDateTime
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });
  };

  const mockReservations = [
    {
      id: 1,
      reservationCode: 'RES-5201',
      userId: 1,
      userFullName: 'Nguyen Van A',
      vehicleId: 1,
      licensePlate: '29A-99999',
      zoneId: 1,
      zoneName: 'Zone A - Cars (G)',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: 'APPROVED' as const,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      reservationCode: 'RES-8041',
      userId: 2,
      userFullName: 'Tran Van B',
      vehicleId: 2,
      licensePlate: '29A-12345',
      zoneId: 2,
      zoneName: 'Zone B - Bikes (B1)',
      startTime: new Date(Date.now() + 2 * 3600000).toISOString(),
      endTime: new Date(Date.now() + 4 * 3600000).toISOString(),
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    },
  ];

  const content = pageResult?.content || mockReservations;
  const totalPages = pageResult?.totalPages || 1;

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
            <Link to="/gate" className="text-slate-400 hover:text-slate-200 transition">Gate Barrier</Link>
            <Link to="/reservations" className="text-indigo-400 border-b-2 border-indigo-500 pb-1">Reservations</Link>
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
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Slot Bookings & Reservations</h2>
          <p className="text-slate-400 mt-1">Audit customer booking reservations, cancel expired slots, or create walk-in entries.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Create Reservation Form */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white pb-3 border-b border-slate-800 flex items-center space-x-2">
              <span>Create Reservation</span>
            </h3>

            {bookingMsg && (
              <div className={`p-4 rounded-xl border text-sm ${
                bookingMsg.type === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                {bookingMsg.text}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">User ID</label>
                <input 
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle ID</label>
                <input 
                  type="number"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Zone ID</label>
                <select 
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="1">Zone A - Cars (G)</option>
                  <option value="2">Zone B - Mixed (B1)</option>
                  <option value="3">Zone C - Trucks (B2)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Start Time</label>
                <input 
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">End Time</label>
                <input 
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition duration-250 shadow-lg shadow-indigo-600/20"
              >
                {createMutation.isPending ? 'Reserving...' : 'Book Parking Slot'}
              </button>
            </form>
          </div>

          {/* Column 2 & 3: Reservations list */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter Section */}
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-lg">
              <div className="flex flex-wrap gap-3 items-center">
                <input 
                  type="number"
                  placeholder="Filter by User ID"
                  value={filterUserId}
                  onChange={(e) => { setFilterUserId(e.target.value); setPage(0); }}
                  className="bg-slate-950 border border-slate-850 px-3 py-1.5 text-xs rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                
                <select 
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                  className="bg-slate-950 border border-slate-850 px-3 py-1.5 text-xs rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <button 
                onClick={() => refetch()}
                className="text-xs bg-slate-950 hover:bg-slate-850 border border-slate-850 px-3.5 py-1.5 rounded-lg font-semibold transition"
              >
                Refetch List
              </button>
            </div>

            {/* List Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              {isLoading ? (
                <div className="p-10 text-center text-slate-500 text-sm animate-pulse">Loading reservations...</div>
              ) : error && !content ? (
                <div className="p-10 text-center text-amber-300 text-sm">Failed to load reservations from server. Showing offline simulations.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                        <th className="px-6 py-4">Booking Code</th>
                        <th className="px-6 py-4">Customer info</th>
                        <th className="px-6 py-4">License Plate</th>
                        <th className="px-6 py-4">Zone</th>
                        <th className="px-6 py-4">Time Interval</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {content.map((res: any) => (
                        <tr key={res.id} className="hover:bg-slate-900/20 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-350">{res.reservationCode}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold block text-slate-200">{res.userFullName || 'Walk-in'}</span>
                            <span className="text-[10px] text-slate-500 font-mono">User ID: {res.userId}</span>
                          </td>
                          <td className="px-6 py-4 uppercase font-semibold text-slate-300">{res.licensePlate}</td>
                          <td className="px-6 py-4 text-slate-300">{res.zoneName || `Zone ${res.zoneId}`}</td>
                          <td className="px-6 py-4 text-xs text-slate-450 leading-relaxed">
                            <span className="block">Start: {new Date(res.startTime).toLocaleString()}</span>
                            <span className="block">End: {new Date(res.endTime).toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              res.status === 'APPROVED' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : res.status === 'PENDING'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {res.status === 'PENDING' && (
                              <button 
                                onClick={() => approveMutation.mutate(res.id)}
                                disabled={approveMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-xs transition"
                              >
                                Approve
                              </button>
                            )}
                            {res.status !== 'CANCELLED' && (
                              <button 
                                onClick={() => cancelMutation.mutate(res.id)}
                                disabled={cancelMutation.isPending}
                                className="bg-slate-800 hover:bg-rose-950/40 border border-slate-750 hover:border-rose-800 text-slate-300 hover:text-rose-300 font-semibold px-2.5 py-1 rounded text-xs transition"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-slate-950/20 px-6 py-4 flex items-center justify-between border-t border-slate-800 text-xs">
                  <button 
                    disabled={page === 0} 
                    onClick={() => setPage((p) => p - 1)}
                    className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40 transition"
                  >
                    Previous
                  </button>
                  <span className="text-slate-400">Page {page + 1} of {totalPages}</span>
                  <button 
                    disabled={page >= totalPages - 1} 
                    onClick={() => setPage((p) => p + 1)}
                    className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40 transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
