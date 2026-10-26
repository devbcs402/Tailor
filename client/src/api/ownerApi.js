import { api } from './apiClient';

export const ownerApi = {
  getPlatformStats: () => api.get('/owner/stats'),
  getTenants: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/owner/tenants?${query}`);
  },
  getTenantById: (id) => api.get(`/owner/tenants/${id}`),
  createTenant: (data) => api.post('/owner/tenants', data),
  updateTenant: (id, data) => api.patch(`/owner/tenants/${id}`, data),
  activateTenant: (id) => api.post(`/owner/tenants/${id}/activate`, {}),
  deactivateTenant: (id, reason = '') => api.post(`/owner/tenants/${id}/deactivate`, { reason }),
  getActivityLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/owner/activity-logs?${query}`);
  },
};
