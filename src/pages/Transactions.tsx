import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { parkingService } from '../services/parkingService';
import { authService } from '../services/authService';

export default function Transactions() {
  const currentUser = authService.getCurrentUser();

  // Filter States
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(0);

  // Queries
  const { data: summary } = useQuery({
    queryKey: ['transactionSummary'],
    queryFn: parkingService.getTransactionSummary,
  });

  const { data: pageResult, isLoading: listLoading, error, refetch } = useQuery({
    queryKey: ['transactionsList', keyword, status, paymentMethod, page],
    queryFn: () => parkingService.searchTransactions({
      keyword: keyword || undefined,
      status: status || undefined,
      paymentMethod: paymentMethod || undefined,
      page,
      size: 10,
    }),
  });

  const mockSummary = {
    totalCount: 20,
    totalAmount: 320000,
    successCount: 18,
    successAmount: 285000,
    failedCount: 1,
    failedAmount: 15000,
    pendingCount: 1,
    pendingAmount: 20000,
  };

  const mockTransactions = [
    {
      id: 1,
      paymentId: 101,
      amount: 15000,
      paymentMethod: 'CASH' as const,
      referenceCode: 'REF-920485',
      transactionNo: 'CASH-90214',
      status: 'SUCCESS' as const,
      paymentTime: new Date().toISOString(),
      licensePlate: '29A-99999',
      reservationCode: 'RES-5201',
      userFullName: 'Nguyen Van A',
    },
    {
      id: 2,
      paymentId: 102,
      amount: 20000,
      paymentMethod: 'MOMO' as const,
      referenceCode: 'REF-123456',
      transactionNo: null,
      status: 'PENDING' as const,
      paymentTime: null,
      licensePlate: '29A-12345',
      reservationCode: 'RES-8041',
      userFullName: 'Tran Van B',
    },
  ];

  const summaryData = summary || mockSummary;
  const content = pageResult?.content || mockTransactions;
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
            <Link to="/reservations" className="text-slate-400 hover:text-slate-200 transition">Reservations</Link>
            <Link to="/transactions" className="text-indigo-400 border-b-2 border-indigo-500 pb-1">Transactions</Link>
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
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Financial Transaction History</h2>
          <p className="text-slate-400 mt-1">Audit payment statuses, review financial summaries, and track payment gateway logs.</p>
        </div>

        {/* Summary Metric Blocks */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Card 1: Total Success */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Success</span>
            <div className="flex items-baseline space-x-1.5 mt-4">
              <span className="text-2xl font-bold text-emerald-400">
                {summaryData.successAmount.toLocaleString()}
              </span>
              <span className="text-slate-450 text-xs font-semibold">VND</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              From {summaryData.successCount} completed txs
            </p>
          </div>

          {/* Card 2: Total Pending */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Pending</span>
            <div className="flex items-baseline space-x-1.5 mt-4">
              <span className="text-2xl font-bold text-amber-400">
                {summaryData.pendingAmount.toLocaleString()}
              </span>
              <span className="text-slate-450 text-xs font-semibold">VND</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              From {summaryData.pendingCount} unpaid invoices
            </p>
          </div>

          {/* Card 3: Total Failed */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Failed</span>
            <div className="flex items-baseline space-x-1.5 mt-4">
              <span className="text-2xl font-bold text-rose-400">
                {summaryData.failedAmount.toLocaleString()}
              </span>
              <span className="text-slate-450 text-xs font-semibold">VND</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              From {summaryData.failedCount} cancelled payments
            </p>
          </div>

          {/* Card 4: Gross Turnover */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-lg bg-gradient-to-br from-indigo-950/20 to-slate-900/40">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Gross Turnover</span>
            <div className="flex items-baseline space-x-1.5 mt-4">
              <span className="text-2xl font-bold text-indigo-400">
                {summaryData.totalAmount.toLocaleString()}
              </span>
              <span className="text-slate-450 text-xs font-semibold">VND</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Total {summaryData.totalCount} invoices compiled
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-lg mb-6">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            <input 
              type="text"
              placeholder="Search plate or booking code..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
              className="bg-slate-950 border border-slate-850 px-3.5 py-2 text-xs rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-full sm:w-60"
            />
            
            <select 
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              className="bg-slate-950 border border-slate-850 px-3.5 py-2 text-xs rounded-xl text-slate-350 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>

            <select 
              value={paymentMethod}
              onChange={(e) => { setPaymentMethod(e.target.value); setPage(0); }}
              className="bg-slate-950 border border-slate-850 px-3.5 py-2 text-xs rounded-xl text-slate-350 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Methods</option>
              <option value="CASH">CASH</option>
              <option value="MOMO">MOMO</option>
              <option value="VNPAY">VNPAY</option>
            </select>
          </div>

          <button 
            onClick={() => refetch()}
            className="text-xs bg-slate-950 hover:bg-slate-850 border border-slate-850 px-4 py-2 rounded-xl font-semibold transition"
          >
            Refresh
          </button>
        </div>

        {/* Transactions list Table */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {listLoading ? (
            <div className="p-10 text-center text-slate-500 text-sm animate-pulse">Loading transaction logs...</div>
          ) : error && !content ? (
            <div className="p-10 text-center text-amber-300 text-sm">Failed to load transactions. Showing offline simulation.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Customer Plate</th>
                    <th className="px-6 py-4">Gateway / Ref Code</th>
                    <th className="px-6 py-4">Gateway TxNo</th>
                    <th className="px-6 py-4">Paid Method</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Payment Time</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {content.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-900/20 transition">
                      <td className="px-6 py-4 font-mono text-slate-500 text-xs">#{tx.id}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold block text-slate-200 uppercase">{tx.licensePlate || 'Unknown Plate'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Code: {tx.reservationCode || 'Walk-in'}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-350">{tx.referenceCode}</td>
                      <td className="px-6 py-4 font-mono text-slate-450">{tx.transactionNo || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.paymentMethod === 'MOMO' 
                            ? 'bg-pink-500/10 text-pink-400' 
                            : tx.paymentMethod === 'VNPAY'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-200">{tx.amount.toLocaleString()} VND</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {tx.paymentTime ? new Date(tx.paymentTime).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          tx.status === 'SUCCESS' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : tx.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination control */}
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
      </main>
    </div>
  );
}
