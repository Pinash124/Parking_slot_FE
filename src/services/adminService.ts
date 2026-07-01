import api from './api';
import type {
  UserView,
  AdminUserCreateRequest,
  UserUpdateRequest,
  SystemSetting,
  SettingRequest,
  SystemDevice,
  DeviceRequest,
} from '../types/parking';

export const adminService = {
  // ========== USERS ==========
  getUsers: async (): Promise<UserView[]> => {
    const response = await api.get<UserView[]>('/api/admin/users');
    return response.data;
  },

  createUser: async (payload: AdminUserCreateRequest): Promise<UserView> => {
    const response = await api.post<UserView>('/api/admin/users', payload);
    return response.data;
  },

  updateUser: async (id: number, payload: UserUpdateRequest): Promise<UserView> => {
    const response = await api.patch<UserView>(`/api/admin/users/${id}`, payload);
    return response.data;
  },

  updateUserPut: async (id: number, payload: any): Promise<UserView> => {
    const response = await api.put<UserView>(`/api/admin/users/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/api/admin/users/${id}`);
  },

  lockUser: async (id: number): Promise<UserView> => {
    const response = await api.patch<UserView>(`/api/admin/users/${id}`, { status: 'LOCKED' });
    return response.data;
  },

  unlockUser: async (id: number): Promise<UserView> => {
    const response = await api.patch<UserView>(`/api/admin/users/${id}`, { status: 'ACTIVE' });
    return response.data;
  },

  // ========== SYSTEM SETTINGS ==========
  getSettings: async (): Promise<SystemSetting[]> => {
    const response = await api.get<SystemSetting[]>('/api/admin/settings');
    return response.data;
  },

  saveSetting: async (key: string, payload: SettingRequest): Promise<SystemSetting> => {
    const response = await api.put<SystemSetting>(`/api/admin/settings/${key}`, payload);
    return response.data;
  },

  deleteSetting: async (key: string): Promise<void> => {
    await api.delete(`/api/admin/settings/${key}`);
  },

  // ========== DEVICES ==========
  getDevices: async (type?: string): Promise<SystemDevice[]> => {
    const response = await api.get<SystemDevice[]>('/api/admin/devices', {
      params: type ? { type } : undefined,
    });
    return response.data;
  },

  createDevice: async (payload: DeviceRequest): Promise<SystemDevice> => {
    const response = await api.post<SystemDevice>('/api/admin/devices', payload);
    return response.data;
  },

  updateDevice: async (id: number, payload: DeviceRequest): Promise<SystemDevice> => {
    const response = await api.put<SystemDevice>(`/api/admin/devices/${id}`, payload);
    return response.data;
  },

  deleteDevice: async (id: number): Promise<void> => {
    await api.delete(`/api/admin/devices/${id}`);
  },
};
