import { api } from './apiClient';

export const patternsApi = {
  getPatterns: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/patterns${query ? `?${query}` : ''}`);
  },
  createPattern: (data) => api.post('/patterns', data),
  updatePattern: (id, data) => api.patch(`/patterns/${id}`, data),
  deletePattern: (id) => api.delete(`/patterns/${id}`),
};
