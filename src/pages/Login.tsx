import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await authService.login({ email, password });
      setSuccess(response.message || 'Mã OTP đã được gửi qua email của bạn.');
      setShowOtp(true);
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Vui lòng nhập mã OTP.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authService.verifyOtp({ email, otp });
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Xác thực OTP thất bại. Vui lòng kiểm tra lại mã OTP.'
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
            {showOtp ? 'Xác Thực OTP' : 'Đăng Nhập'}
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

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm" role="alert">
            <span className="block">{success}</span>
          </div>
        )}

        {!showOtp ? (
          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                  Địa chỉ Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="example@building.com"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="block text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Mật khẩu
                  </label>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
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
                    <span>Đang xử lý...</span>
                  </div>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleOtpSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                  Nhập mã OTP (Kiểm tra Email)
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-center text-lg font-bold tracking-widest"
                  placeholder="000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang xác thực...</span>
                  </div>
                ) : (
                  'Xác thực & Đăng nhập'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOtp(false);
                  setOtp('');
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </form>
        )}

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
