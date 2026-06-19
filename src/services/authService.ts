import api from './api';
import type { 
  AuthLoginRequest, 
  AuthLoginResponse, 
  AuthRegistrationRequest, 
  AuthRegistrationResponse, 
  AuthLogoutResponse 
} from '../types/parking';

export interface UserSession {
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

export const authService = {
  /**
   * Log in user with credentials and store session token.
   */
  login: async (payload: AuthLoginRequest): Promise<AuthLoginResponse> => {
    const response = await api.post<AuthLoginResponse>('/api/auth/login', payload);
    const data = response.data;
    
    // Save to localStorage
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('userId', data.userId.toString());
    localStorage.setItem('fullName', data.fullName);
    localStorage.setItem('email', data.email);
    localStorage.setItem('role', data.role);
    
    return data;
  },

  /**
   * Register a new CUSTOMER account.
   */
  register: async (payload: AuthRegistrationRequest): Promise<AuthRegistrationResponse> => {
    const response = await api.post<AuthRegistrationResponse>('/api/auth/register', payload);
    return response.data;
  },

  /**
   * Log out current user, notify backend, and clear localStorage.
   */
  logout: async (): Promise<AuthLogoutResponse> => {
    try {
      const response = await api.post<AuthLogoutResponse>('/api/auth/logout');
      return response.data;
    } finally {
      authService.clearSession();
    }
  },

  /**
   * Clear session info locally.
   */
  clearSession: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  },

  /**
   * Get JWT Token.
   */
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  /**
   * Check if user is authenticated.
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  /**
   * Retrieve stored user details.
   */
  getCurrentUser: (): UserSession | null => {
    const token = localStorage.getItem('token');
    const userIdStr = localStorage.getItem('userId');
    const fullName = localStorage.getItem('fullName');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');

    if (!token || !userIdStr || !fullName || !email || !role) {
      return null;
    }

    return {
      userId: parseInt(userIdStr, 10),
      fullName,
      email,
      role
    };
  }
};
