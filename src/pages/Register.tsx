import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !password) {
      setError('Vui lòng điền đầy đủ các thông tin đăng ký.');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu đăng ký phải chứa ít nhất 8 ký tự.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await authService.register({
        fullName,
        email,
        phone,
        password,
      });
      setSuccess(response.message || 'Mã OTP đã được gửi đến email của bạn để hoàn tất đăng ký.');
      setShowOtp(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Đăng ký thất bại. Vui lòng thử lại.'
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
      // Clear auto-login token to require user to log in manually
      authService.clearSession();
      setSuccess('Đăng ký và xác thực tài khoản thành công! Đang chuyển hướng đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
            {showOtp ? 'Xác Thực Đăng Ký' : 'Đăng Ký Khách Hàng'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Tạo tài khoản mới để tham gia quản lý/sử dụng bãi đỗ xe
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
          <form className="space-y-4" onSubmit={handleRegisterSubmit}>
            <div className="space-y-3">
              <div>
                <label htmlFor="full-name" className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Họ và tên
                </label>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
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
                  placeholder="example@example.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Số điện thoại
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="0912345678"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Mật khẩu (Tối thiểu 8 ký tự)
                </label>
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang đăng ký...</span>
                  </div>
                ) : (
                  'Đăng ký tài khoản'
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
                  'Xác thực & Kích hoạt'
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
                Quay lại đăng ký
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-sm text-slate-500 pt-4 border-t border-slate-100">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
