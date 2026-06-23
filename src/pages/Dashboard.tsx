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
    queryFn: () => parkingService.getOverviewReport(),
    refetchInterval: 10000,
  });

  const { data: activeSessions, error: sessionsError, refetch: refetchSessions } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: () => parkingService.getSessionsByStatus('ACTIVE'),
    refetchInterval: 10000,
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
    totalCheckIns: 15,
    totalCheckOuts: 10,
    revenue: 185000,
    totalSlots: 60,
    availableSlots: 45,
    occupiedSlots: 15,
    reservedSlots: 0,
    maintenanceSlots: 0,
    lockedSlots: 0,
    occupancyRate: 25,
  };

  const displayStats = stats || mockStats;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-sm">
              P
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                Hệ Thống Bãi Xe
              </h1>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6 text-sm font-semibold">
            <Link to="/" className="text-indigo-600 border-b-2 border-indigo-500 pb-1">Tổng quan</Link>
            <Link to="/sessions" className="text-slate-500 hover:text-slate-800 transition">Cho xe ra/vào</Link>
            <Link to="/gate" className="text-slate-500 hover:text-slate-800 transition">Cổng Barie</Link>
            <Link to="/logs" className="text-slate-500 hover:text-slate-800 transition">Lịch sử lượt đỗ</Link>
          </nav>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tài khoản,</p>
              <p className="text-sm font-bold text-slate-800">{currentUser?.username || 'Nhân viên'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Mobile Navigation Links */}
        <div className="md:hidden grid grid-cols-3 gap-2 mb-6">
          <Link to="/sessions" className="bg-white border border-slate-200 text-center py-2 rounded-xl text-xs font-semibold text-slate-600">Cho xe ra/vào</Link>
          <Link to="/gate" className="bg-white border border-slate-200 text-center py-2 rounded-xl text-xs font-semibold text-slate-600">Cổng Barie</Link>
          <Link to="/logs" className="bg-white border border-slate-200 text-center py-2 rounded-xl text-xs font-semibold text-slate-600">Lịch sử đỗ</Link>
        </div>

        {/* Dashboard Header Info */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Trạng Thái Hệ Thống</h2>
          </div>
          <button 
            onClick={() => { refetchStats(); refetchSessions(); }} 
            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            Làm mới
          </button>
        </div>

        {(statsError || sessionsError) && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            Kết nối đến máy chủ Backend bị gián đoạn. Đang hiển thị dữ liệu mô phỏng.
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          {/* Card 1: Slot Occupancy */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Vị Trí Đỗ Xe</span>
            <div className="flex items-baseline space-x-1.5 mt-3">
              <span className="text-3xl font-extrabold text-slate-800">
                {displayStats.occupiedSlots}
              </span>
              <span className="text-slate-400 text-xs font-semibold">
                / {displayStats.totalSlots || (displayStats.occupiedSlots + displayStats.availableSlots)} chỗ
              </span>
            </div>
            <p className="text-emerald-600 text-xs font-semibold mt-2.5 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              {displayStats.availableSlots} chỗ trống
            </p>
          </div>

          {/* Card 2: Check-ins today */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Lượt vào hôm nay</span>
            <div className="flex items-baseline space-x-1.5 mt-3">
              <span className="text-3xl font-extrabold text-indigo-600">{displayStats.totalCheckIns}</span>
              <span className="text-slate-400 text-xs font-semibold">lượt</span>
            </div>
            <p className="text-slate-400 text-xs mt-2.5">Tổng số lượt xe vào bãi</p>
          </div>

          {/* Card 3: Check-outs today */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Lượt ra hôm nay</span>
            <div className="flex items-baseline space-x-1.5 mt-3">
              <span className="text-3xl font-extrabold text-purple-600">{displayStats.totalCheckOuts}</span>
              <span className="text-slate-400 text-xs font-semibold">lượt</span>
            </div>
            <p className="text-slate-400 text-xs mt-2.5">
              Đã thu phí và cho xe ra bãi
            </p>
          </div>

          {/* Card 4: Daily Revenue */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Doanh Thu Hôm Nay</span>
            <div className="flex items-baseline space-x-1 mt-3">
              <span className="text-2xl font-extrabold text-emerald-600">
                {Number(displayStats.revenue).toLocaleString()}
              </span>
              <span className="text-slate-550 text-xs font-bold ml-1">đ</span>
            </div>
            <p className="text-slate-400 text-xs mt-2.5">
              Tỉ lệ lấp đầy: {displayStats.occupancyRate}%
            </p>
          </div>
        </div>

        {/* Middle Section: Quick Operations & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Quick Links */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4">Chức năng quản lý bãi xe</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link 
                  to="/sessions" 
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/20 transition group"
                >
                  <span className="text-indigo-600 font-bold text-sm block">Cho xe ra / Cho xe vào &rarr;</span>
                  <span className="text-xs text-slate-500 mt-1 block">Tạo lượt đỗ mới, tính giá tiền và thực hiện thanh toán hóa đơn.</span>
                </Link>

                <Link 
                  to="/gate" 
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/20 transition group"
                >
                  <span className="text-purple-600 font-bold text-sm block">Kiểm soát cổng Barie &rarr;</span>
                  <span className="text-xs text-slate-500 mt-1 block">Xác minh biển số xe đã thanh toán ở cổng ra để mở cần Barie.</span>
                </Link>

                <Link 
                  to="/logs" 
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/20 transition group sm:col-span-2"
                >
                  <span className="text-emerald-600 font-bold text-sm block">Lịch sử lượt đỗ xe & Doanh thu &rarr;</span>
                  <span className="text-xs text-slate-500 mt-1 block">Tra cứu lịch sử đỗ xe của các phương tiện và xem doanh thu chi tiết.</span>
                </Link>
              </div>
            </div>

            {/* Parking zones outline */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1">Các Phân Khu Đỗ Xe</h3>
              <p className="text-slate-400 text-xs mb-4">Thông tin phân loại xe và phân bổ khu vực đỗ xe</p>
              
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-700 block">Khu A - Ô tô</span>
                    <span className="text-xs text-slate-400">Các chỗ đỗ xe rộng rãi dành riêng cho ô tô cá nhân.</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg font-bold">Ô tô</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-700 block">Khu B - Xe máy</span>
                    <span className="text-xs text-slate-400">Khu vực xe hai bánh, xe điện được bố trí cổng sạc tiện lợi.</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-600 border border-purple-100 rounded-lg font-bold">Xe máy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Active Sessions List */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col">
            <h3 className="text-base font-bold text-slate-800 mb-4">Xe Đang Đỗ Trong Bãi</h3>
            
            {!activeSessions || activeSessions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs py-10">
                Không có xe nào đang đỗ
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                {activeSessions.slice(0, 8).map((session) => (
                  <div 
                    key={session.sessionId} 
                    className="p-3 bg-slate-50 border border-slate-250 rounded-xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-700">Mã vé: {session.ticketCode}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        Vị trí đỗ: #{session.slotId} • Xe: #{session.vehicleId}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                        Đang hoạt động
                      </span>
                      <p className="text-slate-400 text-[9px] mt-0.5">
                        {session.entryTime ? new Date(session.entryTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Link to="/sessions" className="text-indigo-600 hover:underline text-xs font-semibold text-center mt-4 pt-4 border-t border-slate-100 block">
              Xem quản lý lượt đỗ &rarr;
            </Link>
          </div>

        </div>

      </main>
    </div>
  );
}
