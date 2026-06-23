import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError('Vui lòng điền đầy đủ thông tin đăng nhập.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authService.login({ usernameOrEmail, password });
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white border border-slate-200 p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md mx-auto mb-4">
            P
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Đăng Nhập
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Hệ thống Quản lý Bãi đỗ xe Tòa nhà
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm" role="alert">
            <span className="block">{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username-email" className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                Tên đăng nhập hoặc Email
              </label>
              <input
                id="username-email"
                name="usernameOrEmail"
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                placeholder="Tên đăng nhập hoặc email..."
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Mật khẩu
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-indigo-650 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Đang đăng nhập...</span>
                </div>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </div>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative px-3 bg-white text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hoặc</span>
        </div>

        <button
          type="button"
          onClick={() => authService.redirectToGoogle()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.67 0 3.2.58 4.38 1.71l3.27-3.27C17.67 1.57 14.98 1 12 1 7.35 1 3.4 3.65 1.56 7.56l3.85 2.99C6.3 7.58 8.92 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.45h6.47c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.71-4.92 3.71-8.56z"/>
            <path fill="#FBBC05" d="M5.41 14.47c-.24-.71-.37-1.47-.37-2.27s.13-1.56.37-2.27L1.56 6.94C.73 8.6 0 10.46 0 12.5s.73 3.9 2.56 5.56l3.85-2.99s.08.06 0 0z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.1.74-2.52 1.18-4.27 1.18-3.08 0-5.7-2.54-6.63-5.51l-3.85 2.99C3.4 19.35 7.35 23 12 23z"/>
          </svg>
          <span>Đăng nhập bằng Google</span>
        </button>

        <div className="text-center text-sm text-slate-500 pt-4 border-t border-slate-100">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
            Đăng ký Khách hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
