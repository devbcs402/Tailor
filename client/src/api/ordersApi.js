import { api } from './apiClient';

export const ordersApi = {
  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/orders?${query}`);
  },
  getOrderById: (id) => api.get(`/orders/${id}`),
  createOrder: (orderData) => api.post('/orders', orderData),
  updateOrder: (id, orderData) => api.patch(`/orders/${id}`, orderData),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};
