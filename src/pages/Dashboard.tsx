import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { parkingService } from '../services/parkingService';
import { authService } from '../services/authService';

export default function Dashboard() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  // Queries
  const { data: stats, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: parkingService.getOverview,
    refetchInterval: 10000, // auto refetch every 10s
  });

  const { data: recentTx, isLoading: txLoading } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: parkingService.getRecentTransactions,
    refetchInterval: 15000,
  });

  const { data: dailyRevenueTrend } = useQuery({
    queryKey: ['dashboardRevenueTrend', 'daily', 14],
    queryFn: () => parkingService.getDailyRevenueTrend(14),
    refetchInterval: 60000,
  });

  const { data: monthlyRevenueTrend } = useQuery({
    queryKey: ['dashboardRevenueTrend', 'monthly', 12],
    queryFn: () => parkingService.getMonthlyRevenueTrend(12),
    refetchInterval: 300000,
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      navigate('/login');
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const mockStats = {
    totalReservations: 12,
    pendingReservations: 3,
    approvedReservations: 8,
    activeSessions: 6,
    availableSlots: 24,
    occupiedSlots: 10,
    reservedSlots: 6,
    pendingPayments: 2,
    completedPayments: 18,
    todayRevenue: 285000,
    monthRevenue: 1245000,
    totalTransactions: 20
  };

  const displayStats = stats || mockStats;
  const dailyRevenuePoints = dailyRevenueTrend?.points || [];
  const monthlyRevenuePoints = monthlyRevenueTrend?.points || [];
  const maxDailyRevenue = Math.max(1, ...dailyRevenuePoints.map((point) => Number(point.revenue) || 0));
  const maxMonthlyRevenue = Math.max(1, ...monthlyRevenuePoints.map((point) => Number(point.revenue) || 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Navbar Layout */}
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
            <Link to="/" className="text-indigo-400 border-b-2 border-indigo-500 pb-1">Dashboard</Link>
            <Link to="/sessions" className="text-slate-400 hover:text-slate-200 transition">Sessions & Cashier</Link>
            <Link to="/gate" className="text-slate-400 hover:text-slate-200 transition">Gate Barrier</Link>
            <Link to="/reservations" className="text-slate-400 hover:text-slate-200 transition">Reservations</Link>
            <Link to="/transactions" className="text-slate-400 hover:text-slate-200 transition">Transactions</Link>
          </nav>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 font-mono">Welcome,</p>
              <p className="text-sm font-semibold text-slate-200">{currentUser?.fullName || 'User'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile Navigation Links */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
          <Link to="/sessions" className="bg-slate-900 border border-slate-800 text-center py-2.5 rounded-xl text-xs font-semibold text-slate-300">Sessions</Link>
          <Link to="/gate" className="bg-slate-900 border border-slate-800 text-center py-2.5 rounded-xl text-xs font-semibold text-slate-300">Gate Barrier</Link>
          <Link to="/reservations" className="bg-slate-900 border border-slate-800 text-center py-2.5 rounded-xl text-xs font-semibold text-slate-300">Reservations</Link>
          <Link to="/transactions" className="bg-slate-900 border border-slate-800 text-center py-2.5 rounded-xl text-xs font-semibold text-slate-300">Transactions</Link>
        </div>

        {/* Dashboard Header Info */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">System Overview</h2>
            <p className="text-slate-400 mt-1">Real-time state and metrics of parking operations</p>
          </div>
          <button 
            onClick={() => refetchStats()} 
            className="flex items-center space-x-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            <span>Refresh Data</span>
          </button>
        </div>

        {statsError && (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-300 text-sm">
            <span className="font-semibold">Backend offline:</span> Showing simulation/cached data. Ensure the Spring Boot backend is running on port 8080.
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          {/* Card 1: Slot Occupancy */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg relative overflow-hidden">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Parking Slots</span>
            <div className="flex items-baseline space-x-2 mt-4">
              <span className="text-3xl font-bold text-white">
                {displayStats.occupiedSlots}
              </span>
              <span className="text-slate-500 text-sm">
                / {displayStats.occupiedSlots + displayStats.availableSlots + displayStats.reservedSlots} occupied
              </span>
            </div>
            <p className="text-emerald-400 text-xs font-semibold mt-2 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
              {displayStats.availableSlots} available slots
            </p>
          </div>

          {/* Card 2: Active Sessions */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Active Sessions</span>
            <div className="flex items-baseline space-x-2 mt-4">
              <span className="text-3xl font-bold text-indigo-400">{displayStats.activeSessions}</span>
              <span className="text-slate-500 text-sm">vehicles inside</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">Currently occupying slots</p>
          </div>

          {/* Card 3: Reservations */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Approved Bookings</span>
            <div className="flex items-baseline space-x-2 mt-4">
              <span className="text-3xl font-bold text-purple-400">{displayStats.approvedReservations}</span>
              <span className="text-slate-500 text-sm">reservations</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              {displayStats.pendingReservations} pending approval
            </p>
          </div>

          {/* Card 4: Daily Revenue */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg bg-gradient-to-br from-indigo-950/20 to-slate-900/40">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Today's Revenue</span>
            <div className="flex items-baseline space-x-1 mt-4">
              <span className="text-2xl font-bold text-emerald-400">
                {Number(displayStats.todayRevenue).toLocaleString()}
              </span>
              <span className="text-slate-400 text-sm font-semibold">VND</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              From {displayStats.completedPayments} paid tickets
            </p>
          </div>

          {/* Card 5: Monthly Revenue */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg bg-gradient-to-br from-emerald-950/20 to-slate-900/40">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">This Month</span>
            <div className="flex items-baseline space-x-1 mt-4">
              <span className="text-2xl font-bold text-cyan-400">
                {Number(displayStats.monthRevenue ?? 0).toLocaleString()}
              </span>
              <span className="text-slate-400 text-sm font-semibold">VND</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Revenue from completed payments this month
            </p>
          </div>
        </div>

        {/* Revenue Charts */}
        <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl shadow-xl mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Revenue trends</h3>
              <p className="text-slate-400 text-sm">
                Daily and monthly revenue from completed payments
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Today</p>
                <p className="text-lg font-bold text-emerald-400">
                  {Number(displayStats.todayRevenue).toLocaleString()} VND
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">This month</p>
                <p className="text-lg font-bold text-cyan-400">
                  {Number(displayStats.monthRevenue ?? 0).toLocaleString()} VND
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-white">Daily chart</h4>
                  <p className="text-xs text-slate-500">Last 14 days</p>
                </div>
                <span className="text-xs text-slate-400">
                  {dailyRevenueTrend?.period || 'DAILY'}
                </span>
              </div>
              {dailyRevenuePoints.length === 0 ? (
                <div className="h-56 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-500 text-sm">
                  Waiting for revenue data
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div
                    className="grid gap-3 min-w-[720px] h-56 items-end"
                    style={{ gridTemplateColumns: `repeat(${dailyRevenuePoints.length}, minmax(0, 1fr))` }}
                  >
                    {dailyRevenuePoints.map((point) => {
                      const height = Math.max((Number(point.revenue) || 0) / maxDailyRevenue * 100, 6);
                      return (
                        <div key={point.key} className="flex flex-col items-center justify-end h-full gap-2">
                          <div className="w-full flex-1 flex items-end justify-center">
                            <div
                              className="w-full max-w-[28px] rounded-t-xl bg-gradient-to-t from-indigo-600 via-cyan-500 to-emerald-400 shadow-[0_0_18px_rgba(34,197,94,0.25)]"
                              style={{ height: `${height}%` }}
                              title={`${point.label}: ${Number(point.revenue).toLocaleString()} VND`}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] text-slate-400">{point.label}</p>
                            <p className="text-[10px] text-slate-600">{Number(point.revenue).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-white">Monthly chart</h4>
                  <p className="text-xs text-slate-500">Last 12 months</p>
                </div>
                <span className="text-xs text-slate-400">
                  {monthlyRevenueTrend?.period || 'MONTHLY'}
                </span>
              </div>
              {monthlyRevenuePoints.length === 0 ? (
                <div className="h-56 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-500 text-sm">
                  Waiting for revenue data
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div
                    className="grid gap-3 min-w-[720px] h-56 items-end"
                    style={{ gridTemplateColumns: `repeat(${monthlyRevenuePoints.length}, minmax(0, 1fr))` }}
                  >
                    {monthlyRevenuePoints.map((point) => {
                      const height = Math.max((Number(point.revenue) || 0) / maxMonthlyRevenue * 100, 6);
                      return (
                        <div key={point.key} className="flex flex-col items-center justify-end h-full gap-2">
                          <div className="w-full flex-1 flex items-end justify-center">
                            <div
                              className="w-full max-w-[28px] rounded-t-xl bg-gradient-to-t from-cyan-600 via-sky-500 to-indigo-400 shadow-[0_0_18px_rgba(59,130,246,0.25)]"
                              style={{ height: `${height}%` }}
                              title={`${point.label}: ${Number(point.revenue).toLocaleString()} VND`}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] text-slate-400">{point.label}</p>
                            <p className="text-[10px] text-slate-600">{Number(point.revenue).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Quick Operations & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Quick Links & Summary details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Quick Operations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link 
                  to="/sessions" 
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-indigo-900/10 hover:border-indigo-500/40 transition group"
                >
                  <span className="text-indigo-400 font-bold block group-hover:text-indigo-300">Vehicle Check-in & Out &rarr;</span>
                  <span className="text-xs text-slate-400 mt-1 block">Log entries, calculate parking pricing quotes, and record payments.</span>
                </Link>

                <Link 
                  to="/gate" 
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-indigo-900/10 hover:border-indigo-500/40 transition group"
                >
                  <span className="text-purple-400 font-bold block group-hover:text-purple-300">Gate Barrier Control &rarr;</span>
                  <span className="text-xs text-slate-400 mt-1 block">Scan license plates to validate paid exit windows and unlock barrier gate.</span>
                </Link>

                <Link 
                  to="/reservations" 
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-indigo-900/10 hover:border-indigo-500/40 transition group"
                >
                  <span className="text-sky-400 font-bold block group-hover:text-sky-300">Slot Bookings &rarr;</span>
                  <span className="text-xs text-slate-400 mt-1 block">Create reservations, check zones occupancy, and approve user requests.</span>
                </Link>

                <Link 
                  to="/transactions" 
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-indigo-900/10 hover:border-indigo-500/40 transition group"
                >
                  <span className="text-emerald-400 font-bold block group-hover:text-emerald-300">Financial History &rarr;</span>
                  <span className="text-xs text-slate-400 mt-1 block">Audit transaction references, check statuses, and review total summaries.</span>
                </Link>
              </div>
            </div>

            {/* Parking zones outline */}
            <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Parking Area Guide</h3>
              <p className="text-slate-400 text-sm mb-4">Structure and slots capacity mapped in backend</p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                  <div>
                    <span className="font-semibold text-slate-200">Ground Floor (G) - Zone A</span>
                    <span className="text-xs text-slate-500 block">Optimized for CARS. Standard Rates: 15,000 VND/hr.</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">Cars</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                  <div>
                    <span className="font-semibold text-slate-200">Basement 1 (B1) - Zone B</span>
                    <span className="text-xs text-slate-500 block">Mixed slots for CARS and MOTORBIKES (5,000 VND/hr).</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md">Mixed</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                  <div>
                    <span className="font-semibold text-slate-200">Basement 2 (B2) - Zone C</span>
                    <span className="text-xs text-slate-500 block">Heavy vehicle slots for TRUCKS. Standard Rates: 30,000 VND/hr.</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md">Trucks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Recent Transactions list */}
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl shadow-xl flex flex-col h-full">
            <h3 className="text-lg font-bold text-white mb-4">Recent Payments</h3>
            
            {txLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-slate-900 border border-slate-800 rounded-xl"></div>
                ))}
              </div>
            ) : !recentTx || recentTx.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm py-10">
                No recent transactions found
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                {recentTx.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="p-3 bg-slate-950/50 border border-slate-900 rounded-xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-200">{tx.licensePlate || 'Unknown Vehicle'}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{tx.paymentMethod} • Ref: {tx.referenceCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-200">{tx.amount.toLocaleString()} VND</p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mt-0.5 ${
                        tx.status === 'SUCCESS' 
                          ? 'bg-emerald-500/15 text-emerald-400' 
                          : tx.status === 'FAILED'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Link to="/transactions" className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold text-center mt-4 pt-4 border-t border-slate-800/40 block">
              View All Transactions &rarr;
            </Link>
          </div>

        </div>

      </main>
    </div>
  );
}
