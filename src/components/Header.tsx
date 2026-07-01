import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/customer' || path === '/staff' || path === '/admin') {
      return location.pathname === path || location.pathname === `${path}/` || location.pathname === `${path}/dashboard`;
    }
    return location.pathname.startsWith(path);
  };

  const role = currentUser?.role?.toUpperCase() || 'STAFF';
  const getNavItems = () => {
    switch (role) {
      case 'CUSTOMER':
      case 'USER':
        return [
          { label: 'Tổng quan', path: '/customer' },
          { label: 'Xe của tôi', path: '/customer/vehicles' },
          { label: 'Đặt chỗ trước', path: '/customer/reservations' },
        ];
      case 'ADMIN':
      case 'ADMINISTRATOR':
        return [{ label: 'Tổng quan', path: '/admin' }];
      case 'MANAGER':
        return [
          { label: 'Tổng quan', path: '/admin' },
          { label: 'Lịch sử lượt đỗ', path: '/admin/logs' },
        ];
      case 'STAFF':
      case 'OPERATOR':
      default:
        return [
          { label: 'Tổng quan', path: '/staff' },
          { label: 'Cho xe ra/vào', path: '/staff/sessions' },
          { label: 'Cổng Barie', path: '/staff/gate' },
          { label: 'Lịch sử lượt đỗ', path: '/staff/logs' },
        ];
    }
  };

  const getChangePasswordPath = () => {
    if (!currentUser) return '/login';
    const r = currentUser.role.toUpperCase();
    if (r === 'CUSTOMER' || r === 'USER') return '/customer/change-password';
    if (r === 'STAFF' || r === 'OPERATOR') return '/staff/change-password';
    if (r === 'MANAGER' || r === 'ADMIN' || r === 'ADMINISTRATOR') return '/admin/change-password';
    return '/';
  };
  const navItems = getNavItems();

  // Helper to map role to friendly Vietnamese names
  const getRoleLabel = (role?: string) => {
    if (!role) return 'Nhân viên trực';
    switch (role.toUpperCase()) {
      case 'ADMIN':
      case 'ADMINISTRATOR':
        return 'Quản trị viên';
      case 'MANAGER':
        return 'Quản lý vận hành';
      case 'STAFF':
      case 'OPERATOR':
        return 'Nhân viên trực';
      case 'CUSTOMER':
      case 'USER':
        return 'Khách hàng / Driver';
      default:
        return 'Người dùng';
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left section: Logo and desktop nav */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition duration-255">
                P
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-800 tracking-tight leading-none">SmartParking</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Hệ thống bãi xe</span>
              </div>
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex space-x-1 h-full">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-4 h-full border-b-2 text-sm font-semibold transition-colors duration-200 ${
                      active
                        ? 'border-indigo-600 text-indigo-650'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section: Profile dropdown */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{currentUser?.username || 'Chưa đăng nhập'}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{getRoleLabel(currentUser?.role)}</p>
            </div>

            {/* Dropdown Container */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="w-10 h-10 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700 uppercase cursor-pointer transition shadow-sm"
              >
                {(currentUser?.username || 'U').charAt(0)}
              </button>

              {userDropdownOpen && (
                <>
                  {/* Backdrop overlay to close dropdown */}
                  <div
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email</p>
                      <p className="text-sm text-slate-700 font-medium truncate">{currentUser?.email || 'N/A'}</p>
                    </div>
                    
                    <Link
                      to={getChangePasswordPath()}
                      onClick={() => setUserDropdownOpen(false)}
                      className={`flex items-center px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isActive(getChangePasswordPath())
                          ? 'bg-indigo-50 text-indigo-650'
                          : 'text-slate-650 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Đổi mật khẩu
                    </Link>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4 mr-2.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hamburger Menu (Mobile only) */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-500 hover:text-slate-700 p-2 rounded-xl border border-slate-200"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2.5 shadow-inner">
          <div className="flex items-center space-x-3 px-3 py-2 border-b border-slate-100 mb-2">
            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-700 uppercase">
              {(currentUser?.username || 'U').charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{currentUser?.username || 'Chưa đăng nhập'}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{currentUser?.email || ''}</p>
            </div>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    active
                      ? 'bg-indigo-50 text-indigo-650 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-2 space-y-1">
            <Link
              to={getChangePasswordPath()}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive(getChangePasswordPath())
                  ? 'bg-indigo-50 text-indigo-650'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Đổi mật khẩu
            </Link>
            
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <svg className="w-4 h-4 mr-2.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
