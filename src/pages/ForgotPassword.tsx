import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResetLink(null);

    try {
      const response = await authService.forgotPassword({ email });
      setSuccess(response.message || 'Yêu cầu đặt lại mật khẩu đã được gửi thành công!');
      if (response.resetLink) {
        setResetLink(response.resetLink);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Không thể gửi yêu cầu khôi phục mật khẩu. Vui lòng thử lại.'
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
            Quên Mật Khẩu
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Nhập email của bạn để nhận liên kết khôi phục mật khẩu
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm" role="alert">
            <span className="block">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm space-y-2" role="alert">
            <span className="block font-semibold">{success}</span>
            {resetLink && (
              <div className="mt-2 pt-2 border-t border-emerald-200 text-xs">
                <p className="font-bold text-slate-700 uppercase tracking-wide mb-1">Môi trường thử nghiệm:</p>
                <a 
                  href={resetLink.replace('http://localhost:8080/api/auth/reset-password', '/reset-password')}
                  className="text-indigo-650 underline font-semibold break-all"
                >
                  Bấm vào đây để đổi mật khẩu trực tiếp
                </a>
              </div>
            )}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
              Địa chỉ Email tài khoản
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              placeholder="example@building.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
            >
              {loading ? 'Đang xử lý...' : 'Gửi yêu cầu khôi phục'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-slate-500 pt-4 border-t border-slate-100">
          Quay lại{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
