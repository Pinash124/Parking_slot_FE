import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { parkingService } from '../services/parkingService';
import { authService } from '../services/authService';

export default function ParkingLogs() {
  const currentUser = authService.getCurrentUser();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch all sessions
  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: ['allSessionsLogs'],
    queryFn: parkingService.getAllSessions,
    refetchInterval: 10000,
  });

  // Calculate stats based on fetched sessions
  const totalCompleted = sessions?.filter(s => s.status === 'COMPLETED').length || 0;
  const totalRevenue = sessions?.filter(s => s.status === 'COMPLETED').reduce((acc, curr) => acc + (curr.totalFee || curr.parkingFee || 0), 0) || 0;
  const totalActive = sessions?.filter(s => s.status === 'ACTIVE').length || 0;

  // Filter & search logic
  const filteredSessions = sessions?.filter((session) => {
    // 1. Status Filter
    if (statusFilter !== 'ALL' && session.status !== statusFilter) {
      return false;
    }
    // 2. Search Query (Ticket code, slot ID, vehicle ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTicket = session.ticketCode?.toLowerCase().includes(q);
      const matchSlot = session.slotId?.toString() === q;
      const matchVehicle = session.vehicleId?.toString() === q;
      return matchTicket || matchSlot || matchVehicle;
    }
    return true;
  }) || [];

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
                Lịch sử lượt đỗ xe
              </h1>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6 text-sm font-semibold">
            <Link to="/" className="text-slate-500 hover:text-slate-800 transition">Tổng quan</Link>
            <Link to="/sessions" className="text-slate-500 hover:text-slate-800 transition">Cho xe ra/vào</Link>
            <Link to="/gate" className="text-slate-500 hover:text-slate-800 transition">Cổng Barie</Link>
            <Link to="/logs" className="text-indigo-600 border-b-2 border-indigo-500 pb-1">Lịch sử lượt đỗ</Link>
          </nav>
          <div className="text-right text-xs">
            <p className="text-slate-400 font-bold uppercase">Nhân viên trực</p>
            <p className="font-bold text-slate-800">{currentUser?.username || 'User'}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Nhật Ký & Doanh Thu Lượt Đỗ</h2>
            <p className="text-slate-400 text-sm mt-0.5">Tra cứu toàn bộ lịch sử ra/vào bãi đỗ xe và tổng doanh thu thu phí.</p>
          </div>
          <button 
            onClick={() => refetch()} 
            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
          >
            Làm mới
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Tổng Doanh Thu Lượt Đỗ</span>
            <div className="flex items-baseline space-x-1 mt-3">
              <span className="text-3xl font-extrabold text-emerald-600">
                {totalRevenue.toLocaleString()}
              </span>
              <span className="text-slate-550 text-xs font-bold">đ</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">Tính trên các lượt đỗ đã hoàn thành</p>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Lượt đỗ đã hoàn thành</span>
            <div className="flex items-baseline space-x-1.5 mt-3">
              <span className="text-3xl font-extrabold text-slate-800">{totalCompleted}</span>
              <span className="text-slate-400 text-xs font-semibold">lượt xe</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">Đã thanh toán phí và rời bãi</p>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Đang hoạt động trong bãi</span>
            <div className="flex items-baseline space-x-1.5 mt-3">
              <span className="text-3xl font-extrabold text-indigo-600">{totalActive}</span>
              <span className="text-slate-400 text-xs font-semibold">xe đỗ</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">Chưa thực hiện thanh toán/checkout</p>
          </div>
        </div>

        {/* Filter and Table Container */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setStatusFilter('ALL')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === 'ACTIVE' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Đang hoạt động (ACTIVE)
              </button>
              <button 
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === 'COMPLETED' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Đã hoàn thành (COMPLETED)
              </button>
            </div>

            <div className="w-full md:w-72">
              <input 
                type="text"
                placeholder="Tìm mã vé, ID xe, ID vị trí..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-slate-400 text-slate-800"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                Đang tải nhật ký lượt đỗ...
              </div>
            ) : error ? (
              <div className="text-center py-16 text-rose-500 text-sm">
                Lỗi tải thông tin từ máy chủ Backend.
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                Không tìm thấy lượt đỗ nào phù hợp với bộ lọc.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead>
                  <tr className="text-left text-slate-400 font-bold uppercase tracking-wider bg-slate-50/20">
                    <th className="px-6 py-3.5 font-semibold">Mã lượt</th>
                    <th className="px-6 py-3.5 font-semibold">Mã vé</th>
                    <th className="px-6 py-3.5 font-semibold">ID Xe</th>
                    <th className="px-6 py-3.5 font-semibold">ID Vị trí</th>
                    <th className="px-6 py-3.5 font-semibold">Giờ vào</th>
                    <th className="px-6 py-3.5 font-semibold">Giờ ra</th>
                    <th className="px-6 py-3.5 font-semibold">Phí đỗ</th>
                    <th className="px-6 py-3.5 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.map((session) => (
                    <tr key={session.sessionId} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-mono text-slate-500">#{session.sessionId}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-800">{session.ticketCode}</td>
                      <td className="px-6 py-3.5 text-slate-600">Xe #{session.vehicleId}</td>
                      <td className="px-6 py-3.5 text-slate-600">Khu #{session.slotId}</td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {session.entryTime ? new Date(session.entryTime).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {session.exitTime ? new Date(session.exitTime).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-700">
                        {(session.totalFee || session.parkingFee || 0).toLocaleString()} đ
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          session.status === 'COMPLETED' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : session.status === 'ACTIVE'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {session.status === 'COMPLETED' ? 'Hoàn thành' : session.status === 'ACTIVE' ? 'Đang đỗ' : session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
