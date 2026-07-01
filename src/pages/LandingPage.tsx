import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import Header from '../components/Header';

export default function LandingPage() {
  const currentUser = authService.getCurrentUser();
  const isLoggedIn = authService.isAuthenticated();

  const getPortalPath = () => {
    if (!currentUser) return '/login';
    const role = currentUser.role.toUpperCase();
    if (role === 'CUSTOMER' || role === 'USER') return '/customer';
    if (role === 'STAFF' || role === 'OPERATOR') return '/staff';
    if (role === 'MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR') return '/admin';
    return '/login';
  };

  const getPortalName = () => {
    if (!currentUser) return 'Portal';
    const role = currentUser.role.toUpperCase();
    if (role === 'CUSTOMER' || role === 'USER') return 'Portal Khách Hàng';
    if (role === 'STAFF' || role === 'OPERATOR') return 'Portal Nhân Viên';
    if (role === 'MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR') return 'Portal Quản Trị';
    return 'Portal';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased flex flex-col">
      {/* If logged in, we render the header, otherwise we show a landing header */}
      {isLoggedIn ? (
        <Header />
      ) : (
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
                  P
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-white tracking-tight leading-none">SmartParking</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Hệ thống bãi xe</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-300 hover:text-white transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
                >
                  Đăng ký
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center">
        <div className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
          {/* Background decorative glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-550/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-550/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6 animate-pulse">
              🚀 Thế Hệ Quản Lý Bãi Xe Mới
            </span>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300 tracking-tight leading-tight mb-6">
              Hệ Thống Quản Lý <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Bãi Xe Thông Minh
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
              Giải pháp toàn diện tối ưu hóa công suất đỗ xe, tự động kiểm soát cổng barie bằng nhận dạng thông minh, thanh toán nhanh chóng và giám sát doanh thu thời gian thực.
            </p>

            {/* Smart Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isLoggedIn && currentUser ? (
                <div className="bg-slate-805 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-xl">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                    Phiên đăng nhập hoạt động
                  </p>
                  <h4 className="text-lg font-bold text-white mb-2">
                    Chào mừng trở lại, {currentUser?.username}!
                  </h4>
                  <p className="text-slate-500 text-xs mb-4">
                    Tài khoản của bạn được phân quyền: <span className="font-semibold text-indigo-400">{currentUser?.role}</span>
                  </p>
                  <Link
                    to={getPortalPath()}
                    className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/35 transition transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    Truy Cập {getPortalName()} &rarr;
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    Bắt đầu sử dụng
                  </Link>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-sm transition transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    Tìm hiểu thêm
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Features Highlights */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/60">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700 transition duration-300">
              <div className="w-10 h-10 bg-indigo-650/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Kiểm Soát Tự Động</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Tích hợp Barie tự động, kiểm soát xe ra vào thông qua nhận diện biển số hoặc thẻ từ, ngăn chặn sai sót vận hành.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700 transition duration-300">
              <div className="w-10 h-10 bg-indigo-650/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Thanh Toán Linh Hoạt</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Tính toán phí đỗ xe chính xác dựa trên thời gian thực tế, hỗ trợ thanh toán online bằng ví điện tử hoặc cổng thanh toán bảo mật.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700 transition duration-300">
              <div className="w-10 h-10 bg-indigo-650/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Báo Cáo Doanh Thu</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Hệ thống báo cáo chi tiết doanh số, tỉ lệ lấp đầy bãi đỗ và phân tích lưu lượng xe theo ngày/giờ trực quan cho ban quản lý.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-slate-800 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} SmartParking Lot Management. Developed with premium UX styling.
      </footer>
    </div>
  );
}
