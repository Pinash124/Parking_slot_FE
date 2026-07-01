import api from './api';
import type { 
  AuthLoginRequest, 
  OtpResponse, 
  AuthRegistrationRequest,
  VerifyOtpRequest,
  AuthLoginResponse,
  ChangePasswordRequest
} from '../types/parking';

export interface UserSession {
  username: string;
  email: string;
  role: string;
}

export const authService = {
  /**
   * Đăng nhập người dùng bằng email và mật khẩu (yêu cầu gửi OTP).
   */
  login: async (payload: AuthLoginRequest): Promise<OtpResponse> => {
    const response = await api.post<OtpResponse>('/api/auth/login', payload);
    return response.data;
  },

  /**
   * Đăng ký tài khoản người dùng mới (yêu cầu gửi OTP).
   */
  register: async (payload: AuthRegistrationRequest): Promise<OtpResponse> => {
    const response = await api.post<OtpResponse>('/api/auth/register', payload);
    return response.data;
  },

  /**
   * Xác nhận OTP và lưu access token.
   */
  verifyOtp: async (payload: VerifyOtpRequest): Promise<AuthLoginResponse> => {
    const response = await api.post<AuthLoginResponse>('/api/auth/verify-otp', payload);
    const data = response.data;
    
    // Lưu thông tin người dùng và token vào localStorage
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('username', data.fullName);
    localStorage.setItem('email', data.email);
    localStorage.setItem('role', data.role);
    
    return data;
  },

  /**
   * Đổi mật khẩu tài khoản (gửi OTP).
   */
  changePassword: async (payload: ChangePasswordRequest): Promise<OtpResponse> => {
    const response = await api.post<OtpResponse>('/api/auth/change-password', payload);
    return response.data;
  },

  /**
   * Đăng xuất người dùng hiện tại và xóa token.
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  },

  /**
   * Kiểm tra xem người dùng đã đăng nhập chưa.
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('accessToken');
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
