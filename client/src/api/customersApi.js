import { api } from './apiClient';

export const customersApi = {
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/customers?${query}`);
  },
  getCustomerById: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.patch(`/customers/${id}`, data),
  updateMeasurements: (id, measurements) =>
    api.patch(`/customers/${id}/measurements`, { measurements }),
  getCustomerOrders: (id) => api.get(`/customers/${id}/orders`),
};
