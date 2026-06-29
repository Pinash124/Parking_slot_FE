import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import Header from '../components/Header';

export default function ChangePassword() {
  const currentUser = authService.getCurrentUser();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ các thông tin mật khẩu.');
      return;
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError('Mật khẩu mới phải chứa từ 8 đến 128 ký tự.');
      return;
    }
    if (!hasUppercase) {
      setError('Mật khẩu bắt buộc phải có ít nhất 1 chữ cái viết hoa.');
      return;
    }
    if (!hasSpecial) {
      setError('Mật khẩu bắt buộc phải có ít nhất 1 kí tự đặc biệt.');
      return;
    }
    if (!hasDigit || !(hasUppercase || hasLowercase)) {
      setError('Mật khẩu phải có cả số và chữ.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới nhập lại không khớp.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await authService.changePassword({ oldPassword, newPassword });
      setSuccess(response.message || 'Mã OTP đã được gửi đến email của bạn để xác nhận đổi mật khẩu.');
      setShowOtp(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Thay đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.'
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
      const email = currentUser?.email || '';
      await authService.verifyOtp({ email, otp });
      setSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => {
        navigate('/');
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
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {showOtp ? 'Xác Thực OTP' : 'Đổi Mật Khẩu'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {showOtp ? `Kiểm tra email ${currentUser?.email} để nhận OTP` : 'Thiết lập mật khẩu bảo mật mới cho tài khoản'}
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
            <form className="space-y-4" onSubmit={handleChangeSubmit}>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Mật khẩu cũ
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Mật khẩu mới (Tối thiểu 8 ký tự)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                >
                  {loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đổi mật khẩu'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleOtpSubmit}>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                  Nhập mã OTP xác nhận
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-center text-lg font-bold tracking-widest"
                  placeholder="000000"
                />
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                >
                  {loading ? 'Đang xác thực...' : 'Xác thực đổi mật khẩu'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOtp(false);
                    setOtp('');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition text-center block"
                >
                  Quay lại nhập mật khẩu
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
