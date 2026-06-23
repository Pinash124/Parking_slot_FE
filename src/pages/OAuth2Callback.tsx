import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function OAuth2Callback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        await authService.getGoogleLoginSuccess();
        // Redirect to dashboard on success
        navigate('/');
      } catch (err: any) {
        console.error('Google login failed:', err);
        setError('Đăng nhập bằng Google thất bại. Vui lòng quay lại trang đăng nhập.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    fetchSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-2xl shadow-xl text-center space-y-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md mx-auto animate-bounce">
          P
        </div>
        
        {error ? (
          <div className="text-rose-600 font-semibold text-sm">
            {error}
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800">Đang xác thực Google...</h3>
            <p className="text-xs text-slate-500">Vui lòng chờ trong giây lát để đồng bộ phiên làm việc của bạn.</p>
            <div className="flex justify-center pt-2">
              <span className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
