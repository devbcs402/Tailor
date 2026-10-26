import { api } from './apiClient';

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
};
