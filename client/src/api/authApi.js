import { api } from './apiClient';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  ownerLogin: (credentials) => api.post('/owner/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: () => api.post('/auth/logout', {}),
};
