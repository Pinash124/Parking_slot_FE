import api from './api';
import type { 
  AuthLoginRequest, 
  AuthResponse, 
  AuthRegistrationRequest,
  ForgotPasswordRequest,
  PasswordResetResponse,
  ResetPasswordRequest
} from '../types/parking';

export interface UserSession {
  username: string;
  email: string;
  role: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const authService = {
  /**
   * Đăng nhập người dùng bằng tài khoản/email và mật khẩu.
   */
  login: async (payload: AuthLoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', payload);
    const data = response.data;
    
    // Lưu thông tin người dùng vào localStorage
    localStorage.setItem('username', data.username);
    localStorage.setItem('email', data.email);
    localStorage.setItem('role', data.role);
    
    return data;
  },

  /**
   * Đăng ký tài khoản người dùng mới.
   */
  register: async (payload: AuthRegistrationRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', payload);
    return response.data;
  },

  /**
   * Gửi yêu cầu đặt lại mật khẩu (quên mật khẩu).
   */
  forgotPassword: async (payload: ForgotPasswordRequest): Promise<PasswordResetResponse> => {
    const response = await api.post<PasswordResetResponse>('/api/auth/forgot-password', payload);
    return response.data;
  },

  /**
   * Đặt lại mật khẩu mới sử dụng token xác nhận.
   */
  resetPassword: async (payload: ResetPasswordRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/reset-password', payload);
    return response.data;
  },

  /**
   * Chuyển hướng người dùng qua trang đăng nhập Google của Backend.
   */
  redirectToGoogle: () => {
    window.location.href = `${API_URL}/api/auth/google`;
  },

  /**
   * Lấy thông tin đăng nhập Google thành công và lưu session.
   */
  getGoogleLoginSuccess: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/api/auth/oauth2/success');
    const data = response.data;
    
    localStorage.setItem('username', data.username);
    localStorage.setItem('email', data.email);
    localStorage.setItem('role', data.role);
    
    return data;
  },

  /**
   * Đăng xuất người dùng hiện tại và xóa session.
   */
  logout: async (): Promise<any> => {
    try {
      const response = await api.post('/api/auth/logout');
      return response.data;
    } finally {
      authService.clearSession();
    }
  },

  /**
   * Xóa thông tin phiên làm việc cục bộ.
   */
  clearSession: () => {
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  },

  /**
   * Kiểm tra xem người dùng đã đăng nhập chưa.
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('username');
  },

  /**
   * Lấy thông tin người dùng hiện tại.
   */
  getCurrentUser: (): UserSession | null => {
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');

    if (!username || !email || !role) {
      return null;
    }

    return {
      username,
      email,
      role
    };
  }
};
