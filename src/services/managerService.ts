import api from './api';
import type { ManagerDashboardResponse } from '../types/manager';

export const dashboardService = {

  getManagerDashboard:
    async (): Promise<ManagerDashboardResponse> => {

      const response =
        await api.get<ManagerDashboardResponse>(
          '/api/dashboard/manager'
        );

      return response.data;
    }

};