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

  // Field validation states
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Full name validation
  const validateName = (val: string) => {
    if (!val.trim()) {
      setNameError('Họ và tên là bắt buộc.');
      return false;
    } else if (val.trim().length < 2) {
      setNameError('Họ và tên phải có ít nhất 2 ký tự.');
      return false;
    }
    setNameError(null);
    return true;
  };

  // Email format regex validation
  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setEmailError('Địa chỉ email là bắt buộc.');
      return false;
    } else if (!emailRegex.test(val)) {
      setEmailError('Địa chỉ email không đúng định dạng.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  // Vietnamese phone number validation
  const validatePhone = (val: string) => {
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!val) {
      setPhoneError('Số điện thoại là bắt buộc.');
      return false;
    } else if (!phoneRegex.test(val)) {
      setPhoneError('Số điện thoại không đúng định dạng (VD: 0987654321).');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  // Password complexity validation
  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError('Mật khẩu là bắt buộc.');
      return false;
    }

    const hasUppercase = /[A-Z]/.test(val);
    const hasDigit = /[0-9]/.test(val);
    const hasSpecial = /[^A-Za-z0-9]/.test(val);

    if (val.length < 8 || val.length > 128) {
      setPasswordError('Mật khẩu phải chứa từ 8 đến 128 ký tự.');
      return false;
    }
    if (!hasUppercase) {
      setPasswordError('Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.');
      return false;
    }
    if (!hasSpecial) {
      setPasswordError('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.');
      return false;
    }
    if (!hasDigit) {
      setPasswordError('Mật khẩu phải chứa ít nhất 1 chữ số.');
      return false;
    }

    setPasswordError(null);
    return true;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    const isNameValid = validateName(fullName);
    const isEmailValid = validateEmail(email);
    const isPhoneValid = validatePhone(phone);
    const isPasswordValid = validatePassword(password);

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid) {
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        fullName,
        email,
        phone,
        password,
      });
      setSuccessMessage(response.message || 'Mã OTP đăng ký đã được gửi đến email của bạn.');
      setShowOtp(true);
    } catch (err: any) {
      console.error(err);
      setGeneralError(
        err.response?.data?.message || 
        err.message || 
        'Đăng ký tài khoản thất bại. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setGeneralError(null);

    if (!otp) {
      setOtpError('Vui lòng nhập mã OTP.');
      return;
    } else if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setOtpError('Mã OTP phải là dãy 6 số.');
      return;
    }

    setLoading(true);
    try {
      await authService.verifyOtp({ email, otp });
      // Clear autologin token since register requires manual login afterwards
      authService.clearSession();
      setSuccessMessage('Đăng ký và xác thực tài khoản thành công! Đang chuyển hướng đến trang đăng nhập...');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setOtpError(
        err.response?.data?.message || 
        err.message || 
        'Mã OTP không hợp lệ hoặc đã hết hạn.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden py-12">
      {/* Background ambient glow shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main glassmorphic registration panel */}
      <div className="max-w-md w-full space-y-6 bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-xl shadow-2xl shadow-indigo-900/20 z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2.5 group mb-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-600/30 transition transform group-hover:scale-105 duration-200">
              P
            </div>
            <div className="flex flex-col text-left">
              <span className="text-lg font-bold text-white tracking-tight leading-none">SmartParking</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Hệ thống bãi xe</span>
            </div>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            {showOtp ? 'Xác thực mã OTP' : 'Đăng ký tài khoản'}
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            {showOtp ? 'Nhập mã được gửi về hòm thư của bạn để kích hoạt tài khoản' : 'Đăng ký tài khoản Khách hàng / Lái xe'}
          </p>
        </div>

        {/* Alerts and Notices */}
        {generalError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2 animate-in slide-in-from-top-2 duration-200" role="alert">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{generalError}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2 animate-in slide-in-from-top-2 duration-200" role="alert">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {!showOtp ? (
          <form className="space-y-4" onSubmit={handleRegisterSubmit} noValidate>
            <div className="space-y-3.5">
              <div>
                <label htmlFor="fullName" className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                  Họ và tên
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (nameError) validateName(e.target.value);
                  }}
                  onBlur={() => validateName(fullName)}
                  className={`w-full bg-slate-950/40 border ${
                    nameError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-4 transition duration-200`}
                  placeholder="Nguyễn Văn A"
                />
                {nameError && (
                  <p className="mt-1 text-[10px] text-rose-400 font-medium animate-in fade-in duration-200">
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                  Địa chỉ Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`w-full bg-slate-950/40 border ${
                    emailError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-4 transition duration-200`}
                  placeholder="username@domain.com"
                />
                {emailError && (
                  <p className="mt-1 text-[10px] text-rose-400 font-medium animate-in fade-in duration-200">
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                  Số điện thoại
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d+]/g, ''); // phone characters
                    setPhone(val);
                    if (phoneError) validatePhone(val);
                  }}
                  onBlur={() => validatePhone(phone)}
                  className={`w-full bg-slate-950/40 border ${
                    phoneError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-4 transition duration-200`}
                  placeholder="0987654321"
                />
                {phoneError && (
                  <p className="mt-1 text-[10px] text-rose-400 font-medium animate-in fade-in duration-200">
                    {phoneError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                  Mật khẩu
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  className={`w-full bg-slate-950/40 border ${
                    passwordError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-4 transition duration-200`}
                  placeholder="••••••••"
                />
                {passwordError ? (
                  <p className="mt-1 text-[10px] text-rose-400 font-medium animate-in fade-in duration-200 leading-normal">
                    {passwordError}
                  </p>
                ) : (
                  <p className="mt-1 text-[9px] text-slate-550 leading-normal">
                    Mật khẩu yêu cầu 8-128 ký tự, gồm ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt.
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-600/20 mt-6"
            >
              {loading ? (
                <div className="flex items-center space-x-2.5">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                'Đăng ký tài khoản'
              )}
            </button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleOtpSubmit} noValidate>
            <div>
              <label htmlFor="otp" className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-3 text-center">
                Nhập mã kích hoạt OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, ''); // Allow digits only
                  setOtp(val);
                  if (otpError) setOtpError(null);
                }}
                className={`w-full bg-slate-950/40 border ${
                  otpError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
                } rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 transition duration-200 text-center text-xl font-bold tracking-[0.75em]`}
                placeholder="000000"
              />
              {otpError && (
                <p className="mt-2 text-[11px] text-rose-400 font-medium text-center animate-in fade-in duration-200">
                  {otpError}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                {loading ? (
                  <div className="flex items-center space-x-2.5">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>Đang kích hoạt...</span>
                  </div>
                ) : (
                  'Kích hoạt tài khoản'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOtp(false);
                  setOtp('');
                  setOtpError(null);
                  setGeneralError(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer text-center"
              >
                Quay lại đăng ký
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-slate-400 pt-5 border-t border-slate-800/80">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-bold text-indigo-400 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
